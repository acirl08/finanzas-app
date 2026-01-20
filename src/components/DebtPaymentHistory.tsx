'use client';

import { useState, useEffect } from 'react';
import { History, CreditCard, TrendingDown, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { deudasIniciales } from '@/lib/data';
import { formatMoney } from '@/lib/utils';

interface Pago {
  id: string;
  deudaId: string;
  deudaNombre: string;
  monto: number;
  fecha: string;
  saldoAnterior: number;
  saldoNuevo: number;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DebtPaymentHistory() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeuda, setExpandedDeuda] = useState<string | null>(null);
  const [selectedDeuda, setSelectedDeuda] = useState<string>('todas');

  useEffect(() => {
    const fetchPagos = async () => {
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'obtener_historial_pagos' }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setPagos(data.data);
        }
      } catch (e) {
        console.error('Error fetching pagos:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchPagos();
  }, []);

  // Agrupar pagos por deuda
  const pagosPorDeuda = pagos.reduce((acc, pago) => {
    if (!acc[pago.deudaNombre]) {
      acc[pago.deudaNombre] = [];
    }
    acc[pago.deudaNombre].push(pago);
    return acc;
  }, {} as Record<string, Pago[]>);

  // Calcular totales por deuda
  const totalesPorDeuda = Object.entries(pagosPorDeuda).map(([nombre, pagosDeuda]) => ({
    nombre,
    totalPagado: pagosDeuda.reduce((sum, p) => sum + p.monto, 0),
    cantidadPagos: pagosDeuda.length,
    ultimoPago: pagosDeuda[0]?.fecha || '',
  }));

  const deudasActivas = deudasIniciales.filter(d => !d.liquidada);

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-48 bg-[#252931] rounded-xl" />
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
              {pagos.length} pagos registrados
            </p>
          </div>
        </div>

        {/* Filtro de deuda */}
        <select
          value={selectedDeuda}
          onChange={(e) => setSelectedDeuda(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="todas">Todas las deudas</option>
          {deudasActivas.map(d => (
            <option key={d.id} value={d.nombre}>{d.nombre}</option>
          ))}
        </select>
      </div>

      {pagos.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">No hay pagos registrados aún</p>
          <p className="text-white/30 text-sm mt-1">
            Usa el chat para registrar pagos: "Pagué $5000 a Rappi"
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Resumen por deuda */}
          {selectedDeuda === 'todas' ? (
            totalesPorDeuda.map(({ nombre, totalPagado, cantidadPagos, ultimoPago }) => (
              <div
                key={nombre}
                className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedDeuda(expandedDeuda === nombre ? null : nombre)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">{nombre}</p>
                      <p className="text-xs text-white/50">
                        {cantidadPagos} pago(s) • Último: {ultimoPago ? formatDate(ultimoPago) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 font-medium">{formatMoney(totalPagado)}</span>
                    {expandedDeuda === nombre ? (
                      <ChevronUp className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    )}
                  </div>
                </button>

                {/* Detalle de pagos expandido */}
                {expandedDeuda === nombre && (
                  <div className="border-t border-white/10 p-3 space-y-2 bg-white/[0.02]">
                    {pagosPorDeuda[nombre].map((pago) => (
                      <div
                        key={pago.id}
                        className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-white/40" />
                          <span className="text-xs text-white/60">{formatDate(pago.fecha)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/40">
                            {formatMoney(pago.saldoAnterior)} → {formatMoney(pago.saldoNuevo)}
                          </span>
                          <span className="text-sm text-green-400 font-medium">
                            -{formatMoney(pago.monto)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            /* Vista de una sola deuda */
            <div className="space-y-2">
              {(pagosPorDeuda[selectedDeuda] || []).map((pago) => (
                <div
                  key={pago.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-white/40" />
                      <span className="text-sm text-white">{formatDate(pago.fecha)}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      Saldo: {formatMoney(pago.saldoAnterior)} → {formatMoney(pago.saldoNuevo)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-400">-{formatMoney(pago.monto)}</p>
                    <p className="text-xs text-white/40">
                      <TrendingDown className="w-3 h-3 inline mr-1" />
                      -{formatMoney(pago.saldoAnterior - pago.saldoNuevo)} al saldo
                    </p>
                  </div>
                </div>
              ))}
              {(!pagosPorDeuda[selectedDeuda] || pagosPorDeuda[selectedDeuda].length === 0) && (
                <div className="text-center py-6 text-white/50">
                  No hay pagos registrados para esta deuda
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Total pagado */}
      {pagos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
          <span className="text-white/70">Total pagado a deudas</span>
          <span className="text-green-400 font-semibold">
            {formatMoney(pagos.reduce((sum, p) => sum + p.monto, 0))}
          </span>
        </div>
      )}
    </div>
  );
}
