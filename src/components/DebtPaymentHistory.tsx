'use client';

import { useState, useMemo } from 'react';
import { History, TrendingDown, Calendar } from 'lucide-react';
import { Gasto } from '@/lib/firestore';
import { Deuda } from '@/types';
import { formatMoney } from '@/lib/utils';
import { useMonth } from '@/contexts/MonthContext';
import { useFirestore } from '@/contexts/FirestoreContext';

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DebtPaymentHistory() {
  const { selectedMonth } = useMonth();
  const { gastos, deudas, loadingGastos: loading } = useFirestore();
  const [selectedDeuda, setSelectedDeuda] = useState<string>('todas');

  // Filtrar solo gastos de tipo deuda del mes seleccionado
  const pagosDelMes = useMemo(() => {
    return gastos
      .filter(g =>
        g.categoria === 'deuda' &&
        g.fecha.startsWith(selectedMonth)
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [gastos, selectedMonth]);

  // Agrupar pagos por deuda
  const pagosPorDeuda = useMemo(() => {
    const grupos: Record<string, { pagos: Gasto[]; deuda?: Deuda; total: number }> = {};

    pagosDelMes.forEach(pago => {
      const deuda = deudas.find(d => d.id === pago.deudaId);
      const nombre = deuda?.nombre || pago.descripcion || 'Sin especificar';

      if (!grupos[nombre]) {
        grupos[nombre] = { pagos: [], deuda, total: 0 };
      }
      grupos[nombre].pagos.push(pago);
      grupos[nombre].total += pago.monto;
    });

    return grupos;
  }, [pagosDelMes, deudas]);

  const totalPagado = pagosDelMes.reduce((sum, p) => sum + p.monto, 0);

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-48 bg-[#252931] rounded-xl" />
      </div>
    );
  }

  if (pagosDelMes.length === 0) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Historial de Pagos</h3>
            <p className="text-xs text-white/50">No hay pagos este mes</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Historial de Pagos</h3>
            <p className="text-xs text-white/50">
              {pagosDelMes.length} pago{pagosDelMes.length !== 1 ? 's' : ''} • {formatMoney(totalPagado)}
            </p>
          </div>
        </div>

        {/* Filtro de deuda */}
        <select
          value={selectedDeuda}
          onChange={(e) => setSelectedDeuda(e.target.value)}
          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="todas">Todas las deudas</option>
          {Object.keys(pagosPorDeuda).map(nombre => (
            <option key={nombre} value={nombre}>{nombre}</option>
          ))}
        </select>
      </div>

      {/* Lista de pagos */}
      <div className="space-y-3">
        {selectedDeuda === 'todas' ? (
          // Mostrar todas las deudas agrupadas
          Object.entries(pagosPorDeuda).map(([nombre, { pagos, deuda, total }]) => (
            <div key={nombre} className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-white">{nombre}</h4>
                  <p className="text-xs text-white/50">{pagos.length} pago{pagos.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-400">{formatMoney(total)}</p>
                  {deuda && (
                    <p className="text-xs text-white/40">
                      CAT {deuda.cat}%
                    </p>
                  )}
                </div>
              </div>

              {/* Desglose de pagos */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                {pagos.map(pago => (
                  <div key={pago.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-white/60">{formatDate(pago.fecha)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white">{formatMoney(pago.monto)}</span>
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          // Mostrar solo la deuda seleccionada
          <div className="space-y-2">
            {pagosPorDeuda[selectedDeuda]?.pagos.map(pago => (
              <div key={pago.id} className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-sm text-white">{formatDate(pago.fecha)}</p>
                    <p className="text-xs text-white/50">{pago.descripcion}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-400">{formatMoney(pago.monto)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
