'use client';

import { useState, useEffect } from 'react';
import { FileText, TrendingUp, TrendingDown, AlertCircle, CheckCircle, ArrowRight, Users } from 'lucide-react';
import { categoriaLabels } from '@/lib/data';
import { formatMoney } from '@/lib/utils';

interface ReportData {
  mesActual: string;
  totalActual: number;
  totalAnterior: number;
  cambioVsMesAnterior: number;
  porCategoria: Record<string, { actual: number; anterior: number }>;
  porTitular: Record<string, { actual: number; anterior: number }>;
  presupuesto: number;
  disponible: number;
  proyeccionDeuda: {
    mesesRestantes: number;
    fechaLibertad: string;
    totalIntereses: number;
  };
  insights: string[];
  transacciones: number;
}

function formatMes(fecha: string) {
  const [year, month] = fecha.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${meses[parseInt(month) - 1]} ${year}`;
}

export default function FinancialReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'obtener_reporte_mensual', params: {} })
        });
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (e) {
        console.error('Error fetching report:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="h-6 bg-white/10 rounded w-40" />
        </div>
        <div className="space-y-3">
          <div className="h-20 bg-white/10 rounded-xl" />
          <div className="h-16 bg-white/10 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const topCategorias = Object.entries(data.porCategoria)
    .sort((a, b) => b[1].actual - a[1].actual)
    .slice(0, 5);

  const cambioPositivo = data.cambioVsMesAnterior <= 0;

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Reporte Mensual</h3>
            <p className="text-sm text-white/50">{formatMes(data.mesActual)}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      </div>

      {/* Resumen principal */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-1">Gastado este mes</p>
          <p className="text-2xl font-bold text-white">{formatMoney(data.totalActual)}</p>
          <div className={`flex items-center gap-1 mt-1 text-sm ${cambioPositivo ? 'text-green-400' : 'text-red-400'}`}>
            {cambioPositivo ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            <span>{Math.abs(data.cambioVsMesAnterior).toFixed(0)}% vs mes anterior</span>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-1">Disponible</p>
          <p className={`text-2xl font-bold ${data.disponible >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatMoney(data.disponible)}
          </p>
          <p className="text-xs text-white/40 mt-1">
            de {formatMoney(data.presupuesto)}
          </p>
        </div>
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <div className="space-y-2 mb-6">
          {data.insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-white/5 rounded-lg p-3 text-sm"
            >
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <span className="text-white/80">{insight}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top categorías */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-white/70 mb-3">Top Categorías</h4>
        <div className="space-y-2">
          {topCategorias.map(([cat, vals]) => {
            const cambio = vals.anterior > 0
              ? ((vals.actual - vals.anterior) / vals.anterior) * 100
              : 0;
            return (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-white/60">
                  {categoriaLabels[cat] || cat}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white font-medium">
                    {formatMoney(vals.actual)}
                  </span>
                  {cambio !== 0 && (
                    <span className={`text-xs ${cambio > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {cambio > 0 ? '+' : ''}{cambio.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandido */}
      {expanded && (
        <div className="space-y-6 pt-6 border-t border-white/10 animate-in fade-in duration-300">
          {/* Por titular */}
          <div>
            <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Por Persona
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(data.porTitular).map(([titular, vals]) => (
                <div key={titular} className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-xs text-white/50 capitalize mb-1">{titular}</p>
                  <p className="text-lg font-semibold text-white">{formatMoney(vals.actual)}</p>
                  {vals.anterior > 0 && (
                    <p className={`text-xs mt-1 ${vals.actual <= vals.anterior ? 'text-green-400' : 'text-red-400'}`}>
                      {vals.actual <= vals.anterior ? '-' : '+'}
                      {Math.abs(((vals.actual - vals.anterior) / vals.anterior) * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Proyección de deuda */}
          <div>
            <h4 className="text-sm font-medium text-white/70 mb-3">Proyección de Libertad Financiera</h4>
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70">Fecha estimada</span>
                <span className="text-white font-semibold">{formatMes(data.proyeccionDeuda.fechaLibertad)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70">Meses restantes</span>
                <span className="text-white font-semibold">{data.proyeccionDeuda.mesesRestantes} meses</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Intereses a pagar</span>
                <span className="text-red-400 font-semibold">{formatMoney(data.proyeccionDeuda.totalIntereses)}</span>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="flex items-center justify-between text-sm text-white/50">
            <span>{data.transacciones} transacciones este mes</span>
            <span>Promedio: {formatMoney(data.totalActual / Math.max(1, data.transacciones))}/tx</span>
          </div>
        </div>
      )}
    </div>
  );
}
