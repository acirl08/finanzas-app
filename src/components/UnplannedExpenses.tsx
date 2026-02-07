'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { Gasto } from '@/lib/firestore';
import { formatMoney } from '@/lib/utils';
import { categoriaLabels } from '@/lib/data';
import { useMonth, formatMonth } from '@/contexts/MonthContext';
import { useFirestore } from '@/contexts/FirestoreContext';


export default function UnplannedExpenses() {
  const { selectedMonth } = useMonth();
  const { gastos, deudas, ingresos, pagos, loadingGastos: loading } = useFirestore();
  const [expanded, setExpanded] = useState(false);


  // Gastos no planificados del mes seleccionado
  const gastosNoPlanificados = useMemo(() => {
    return gastos.filter(g =>
      g.fecha.startsWith(selectedMonth) &&
      (g as any).planificado === false
    ).sort((a, b) => b.monto - a.monto);
  }, [gastos, selectedMonth]);

  // Agrupar por categoría
  const porCategoria = useMemo(() => {
    const grouped: Record<string, { total: number; count: number; gastos: Gasto[] }> = {};

    gastosNoPlanificados.forEach(g => {
      const cat = g.categoria;
      if (!grouped[cat]) {
        grouped[cat] = { total: 0, count: 0, gastos: [] };
      }
      grouped[cat].total += g.monto;
      grouped[cat].count++;
      grouped[cat].gastos.push(g);
    });

    return Object.entries(grouped)
      .map(([categoria, data]) => ({ categoria, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [gastosNoPlanificados]);

  const totalNoPlanificado = useMemo(() => {
    return gastosNoPlanificados.reduce((sum, g) => sum + g.monto, 0);
  }, [gastosNoPlanificados]);

  // Si no hay gastos no planificados, no mostrar
  if (gastosNoPlanificados.length === 0) {
    return null;
  }

  return (
    <div className="glass-card border-orange-500/30">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Gastos No Planificados</h3>
            <p className="text-xs text-orange-400">
              {gastosNoPlanificados.length} gasto{gastosNoPlanificados.length !== 1 ? 's' : ''} fuera de presupuesto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-orange-400">{formatMoney(totalNoPlanificado)}</span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )}
        </div>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Resumen por categoría */}
          <div className="space-y-2">
            {porCategoria.map(({ categoria, total, count }) => (
              <div key={categoria} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-sm text-white">{categoriaLabels[categoria] || categoria}</span>
                  <span className="text-xs px-2 py-0.5 bg-white/10 text-white/50 rounded">
                    {count}
                  </span>
                </div>
                <span className="text-sm font-medium text-orange-400">{formatMoney(total)}</span>
              </div>
            ))}
          </div>

          {/* Mensaje informativo */}
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-orange-300">
                  Estos gastos no estaban contemplados en el presupuesto original.
                  Aunque están en sus categorías correctas, representan un exceso sobre lo planeado.
                </p>
              </div>
            </div>
          </div>

          {/* Detalle completo */}
          <details className="group">
            <summary className="text-xs text-white/50 cursor-pointer hover:text-white/70 transition-colors">
              Ver detalle completo ({gastosNoPlanificados.length} gastos)
            </summary>
            <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
              {gastosNoPlanificados.map(g => (
                <div key={g.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm">
                  <div>
                    <span className="text-white">{g.descripcion}</span>
                    <span className="text-white/40 text-xs ml-2">
                      {new Date(g.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <span className="text-orange-400 font-medium">{formatMoney(g.monto)}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
