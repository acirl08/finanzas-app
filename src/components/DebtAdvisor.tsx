'use client';

import { useState, useEffect, useMemo } from 'react';
import { Brain, RefreshCw, Target, Lightbulb, AlertTriangle, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { subscribeToDeudas, subscribeToIngresos, calcularTotalesFromDeudas, Ingreso } from '@/lib/firestore';
import { INGRESO_MENSUAL, calcularGastosFijos } from '@/lib/data';
import { safeGetJSON, safeSetJSON } from '@/lib/storage';
import { formatMoney } from '@/lib/utils';
import { Deuda } from '@/types';
import { useMonth } from '@/contexts/MonthContext';

interface DebtAnalysisResult {
  analisis: string;
  estrategia: string;
  ordenPago: string[];
  ahorroIntereses: string;
  motivacion: string;
  timestamp: number;
}

export default function DebtAdvisor() {
  const { selectedMonth } = useMonth();
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DebtAnalysisResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubDeudas = subscribeToDeudas(setDeudas);
    const unsubIngresos = subscribeToIngresos(setIngresos);
    return () => {
      unsubDeudas();
      unsubIngresos();
    };
  }, []);

  useEffect(() => {
    const saved = safeGetJSON<DebtAnalysisResult | null>('debt-advisor-analysis', null);
    if (saved) {
      setAnalysis(saved);
    }
  }, []);

  const debtData = useMemo(() => {
    const totales = calcularTotalesFromDeudas(deudas);
    const gastosFijos = calcularGastosFijos();

    // Calcular ingresos reales del mes seleccionado
    const ingresosDelMes = ingresos
      .filter(i => i.fecha.startsWith(selectedMonth))
      .reduce((sum, i) => sum + i.monto, 0);

    // Usar ingresos reales si hay, sino el fijo como fallback
    const ingresoMensual = ingresosDelMes > 0 ? ingresosDelMes : INGRESO_MENSUAL;

    const disponibleParaDeudas = ingresoMensual - gastosFijos;
    const pagosMinimos = deudas.filter(d => !d.liquidada).reduce((sum, d) => sum + d.pagoMinimo, 0);
    const excedente = disponibleParaDeudas - pagosMinimos;

    // Ordenar deudas por CAT (método avalancha)
    const deudasOrdenadas = [...deudas]
      .filter(d => !d.liquidada && d.saldoActual > 0)
      .sort((a, b) => b.cat - a.cat);

    // Calcular intereses mensuales aproximados
    const interesesMensuales = deudas
      .filter(d => !d.liquidada)
      .reduce((sum, d) => sum + (d.saldoActual * (d.cat / 100 / 12)), 0);

    return {
      deudaTotal: totales.deudaTotal,
      deudaInicial: totales.deudaInicial,
      porcentajePagado: totales.porcentajePagado,
      ingresoMensual,
      disponibleParaDeudas,
      pagosMinimos,
      excedente,
      deudasOrdenadas,
      interesesMensuales,
      cantidadDeudas: deudas.filter(d => !d.liquidada).length,
    };
  }, [deudas, ingresos, selectedMonth]);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/debt-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtData),
      });

      if (!response.ok) {
        throw new Error('Error al obtener análisis');
      }

      const data = await response.json();

      if (data.success && data.analysis) {
        const result: DebtAnalysisResult = {
          ...data.analysis,
          timestamp: Date.now(),
        };
        setAnalysis(result);
        safeSetJSON('debt-advisor-analysis', result);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('Error en análisis de deudas:', err);
      setError(err.message || 'No se pudo obtener el análisis');
    } finally {
      setLoading(false);
    }
  };

  const getTimeSinceAnalysis = () => {
    if (!analysis?.timestamp) return null;
    const diff = Date.now() - analysis.timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) return `Hace ${Math.floor(hours / 24)} día(s)`;
    if (hours > 0) return `Hace ${hours}h ${minutes}m`;
    return `Hace ${minutes}m`;
  };

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Asesor de Deudas</h3>
            <p className="text-xs text-white/50">
              {analysis ? getTimeSinceAnalysis() : 'Estrategia de pago optimizada'}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              loading
                ? 'bg-amber-500/30 text-amber-300 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analizando...' : 'Analizar'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/50">Deudas activas</p>
              <p className="text-lg font-bold text-white">{debtData.cantidadDeudas}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/50">Intereses/mes</p>
              <p className="text-lg font-bold text-red-400">{formatMoney(debtData.interesesMensuales)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/50">Mínimos</p>
              <p className="text-lg font-bold text-amber-400">{formatMoney(debtData.pagosMinimos)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/50">Extra disponible</p>
              <p className="text-lg font-bold text-emerald-400">{formatMoney(Math.max(0, debtData.excedente))}</p>
            </div>
          </div>

          {/* Orden de pago recomendado (siempre visible) */}
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-medium text-amber-400">Orden de pago (Método Avalancha)</h4>
            </div>
            <div className="space-y-2">
              {debtData.deudasOrdenadas.slice(0, 5).map((d, idx) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/50'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={idx === 0 ? 'text-amber-400 font-medium' : 'text-white/70'}>{d.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 text-xs">{d.cat}% CAT</span>
                    <span className={idx === 0 ? 'text-amber-400 font-medium' : 'text-white/70'}>
                      {formatMoney(d.saldoActual)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {debtData.deudasOrdenadas.length > 0 && (
              <p className="text-xs text-white/40 mt-3">
                💡 Paga mínimos en todas y el extra ({formatMoney(Math.max(0, debtData.excedente))}) a <strong>{debtData.deudasOrdenadas[0]?.nombre}</strong>
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* AI Analysis Results */}
          {analysis ? (
            <div className="space-y-4">
              {/* Análisis */}
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-medium text-blue-400">Análisis</h4>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{analysis.analisis}</p>
              </div>

              {/* Estrategia */}
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-sm font-medium text-yellow-400">Estrategia recomendada</h4>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{analysis.estrategia}</p>
              </div>

              {/* Ahorro en intereses */}
              {analysis.ahorroIntereses && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-medium text-emerald-400">Ahorro potencial</h4>
                  </div>
                  <p className="text-sm text-white/80">{analysis.ahorroIntereses}</p>
                </div>
              )}

              {/* Motivación */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-sm text-white/90 italic text-center">"{analysis.motivacion}"</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/50 text-sm">Haz clic en "Analizar" para obtener</p>
              <p className="text-white/50 text-sm">estrategias personalizadas de pago</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
