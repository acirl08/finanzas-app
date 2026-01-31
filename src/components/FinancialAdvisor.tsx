'use client';

import { useState, useEffect, useMemo } from 'react';
import { Brain, RefreshCw, TrendingDown, Lightbulb, AlertTriangle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { subscribeToGastos, subscribeToDeudas, Gasto, calcularTotalesFromDeudas } from '@/lib/firestore';
import { presupuestosPersonales, categoriasEsenciales, categoriasVales, categoriaLabels } from '@/lib/data';
import { safeGetJSON, safeSetJSON } from '@/lib/storage';
import { formatMoney } from '@/lib/utils';
import { Deuda } from '@/types';

interface AnalysisResult {
  analisis: string;
  recomendaciones: string[];
  consecuencias: string;
  motivacion: string;
  timestamp: number;
}

export default function FinancialAdvisor() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suscribirse a los datos
  useEffect(() => {
    const unsubGastos = subscribeToGastos(setGastos);
    const unsubDeudas = subscribeToDeudas(setDeudas);
    return () => {
      unsubGastos();
      unsubDeudas();
    };
  }, []);

  // Cargar análisis guardado
  useEffect(() => {
    const saved = safeGetJSON<AnalysisResult | null>('financial-advisor-analysis', null);
    if (saved) {
      setAnalysis(saved);
    }
  }, []);

  // Calcular datos para el análisis
  const financialData = useMemo(() => {
    const today = new Date();
    const mesActual = today.toISOString().slice(0, 7);

    // Filtrar gastos del mes (solo gustos, no esenciales ni vales)
    const gastosDelMes = gastos.filter(g =>
      g.fecha.startsWith(mesActual) &&
      !g.esFijo &&
      !g.conVales &&
      g.categoria !== 'imprevistos' &&
      !categoriasEsenciales.includes(g.categoria) &&
      !categoriasVales.includes(g.categoria)
    );

    // Por titular
    const gastosPorTitular = {
      alejandra: gastosDelMes.filter(g => g.titular === 'alejandra').reduce((sum, g) => sum + g.monto, 0),
      ricardo: gastosDelMes.filter(g => g.titular === 'ricardo').reduce((sum, g) => sum + g.monto, 0),
      compartido: gastosDelMes.filter(g => g.titular === 'compartido').reduce((sum, g) => sum + g.monto, 0),
    };

    // Por categoría
    const gastosPorCategoria: Record<string, number> = {};
    gastosDelMes.forEach(g => {
      gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] || 0) + g.monto;
    });

    // Deudas
    const totalesDeuda = calcularTotalesFromDeudas(deudas);

    return {
      gastosPorTitular,
      gastosPorCategoria,
      deudaTotal: totalesDeuda.deudaTotal,
      presupuestos: presupuestosPersonales,
    };
  }, [gastos, deudas]);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(financialData),
      });

      if (!response.ok) {
        throw new Error('Error al obtener análisis');
      }

      const data = await response.json();

      if (data.success && data.analysis) {
        const result: AnalysisResult = {
          ...data.analysis,
          timestamp: Date.now(),
        };
        setAnalysis(result);
        safeSetJSON('financial-advisor-analysis', result);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('Error en análisis:', err);
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

    if (hours > 24) {
      return `Hace ${Math.floor(hours / 24)} día(s)`;
    }
    if (hours > 0) {
      return `Hace ${hours}h ${minutes}m`;
    }
    return `Hace ${minutes}m`;
  };

  // Calcular si alguien se pasó
  const excesos = useMemo(() => {
    const result: { titular: string; exceso: number }[] = [];
    (['alejandra', 'ricardo', 'compartido'] as const).forEach(t => {
      const gastado = financialData.gastosPorTitular[t];
      const presupuesto = financialData.presupuestos[t];
      if (gastado > presupuesto) {
        result.push({ titular: t, exceso: gastado - presupuesto });
      }
    });
    return result;
  }, [financialData]);

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Asesor Financiero</h3>
            <p className="text-xs text-white/50">
              {analysis ? getTimeSinceAnalysis() : 'Sin análisis aún'}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              loading
                ? 'bg-purple-500/30 text-purple-300 cursor-not-allowed'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
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
          {/* Quick status */}
          {excesos.length > 0 && !analysis && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {excesos.map(e => `${e.titular === 'compartido' ? 'Compartido' : e.titular} se pasó por ${formatMoney(e.exceso)}`).join(', ')}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Analysis Results */}
          {analysis ? (
            <div className="space-y-4">
              {/* Análisis */}
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-medium text-blue-400">Análisis</h4>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{analysis.analisis}</p>
              </div>

              {/* Recomendaciones */}
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-sm font-medium text-yellow-400">Recomendaciones</h4>
                </div>
                <ul className="space-y-2">
                  {analysis.recomendaciones.map((rec, idx) => (
                    <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">{idx + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Consecuencias */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-medium text-amber-400">Consecuencias</h4>
                </div>
                <p className="text-sm text-white/80">{analysis.consecuencias}</p>
              </div>

              {/* Motivación */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-medium text-emerald-400">Motivación</h4>
                </div>
                <p className="text-sm text-white/90 italic">"{analysis.motivacion}"</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">Haz clic en "Analizar" para obtener</p>
              <p className="text-white/50 text-sm">recomendaciones personalizadas</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
