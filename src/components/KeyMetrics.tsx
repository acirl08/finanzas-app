'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingDown, Calendar, Target, ArrowRight } from 'lucide-react';
import { subscribeToGastos, Gasto, subscribeToDeudas, calcularTotalesFromDeudas } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE, deudasIniciales, calcularProyeccionDeudas } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { useGastosDelMes } from '@/hooks/useGastosFilters';
import { Deuda } from '@/types';
import Link from 'next/link';

export default function KeyMetrics() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubGastos = subscribeToGastos((g) => {
      setGastos(g);
      setLoading(false);
    });
    const unsubDeudas = subscribeToDeudas((d) => {
      if (d && d.length > 0) setDeudas(d);
    });
    return () => {
      unsubGastos();
      unsubDeudas();
    };
  }, []);

  const gastosData = useGastosDelMes(gastos);

  const dailyBudget = useMemo(() => {
    const { totalVariables, disponibleVariables, daysRemaining, dayOfMonth, daysInMonth } = gastosData;

    // Presupuesto diario basado en lo que queda
    const presupuestoDiario = Math.max(0, Math.floor(disponibleVariables / daysRemaining));

    // Gastado hoy
    const hoy = new Date().toISOString().split('T')[0];
    const gastosHoy = gastos.filter(g =>
      g.fecha === hoy && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos'
    );
    const gastadoHoy = gastosHoy.reduce((sum, g) => sum + g.monto, 0);
    const disponibleHoy = presupuestoDiario - gastadoHoy;

    // Status
    let status: 'green' | 'yellow' | 'red' = 'green';
    if (gastadoHoy > presupuestoDiario) status = 'red';
    else if (gastadoHoy > presupuestoDiario * 0.7) status = 'yellow';

    return {
      presupuestoDiario,
      gastadoHoy,
      disponibleHoy,
      status,
      transaccionesHoy: gastosHoy.length,
    };
  }, [gastos, gastosData]);

  const deudaData = useMemo(() => {
    const totales = calcularTotalesFromDeudas(deudas);
    const deudaInicial = deudasIniciales.reduce((sum, d) => sum + d.saldoInicial, 0);
    const deudaPagada = deudaInicial - totales.deudaTotal;
    const porcentaje = deudaInicial > 0 ? (deudaPagada / deudaInicial) * 100 : 0;

    // Proyeccion
    const proyeccion = calcularProyeccionDeudas(deudas, 0);
    const fechaLibertad = new Date(proyeccion.fechaLibertad + '-01');

    return {
      deudaTotal: totales.deudaTotal,
      deudaPagada,
      porcentaje,
      fechaLibertad: fechaLibertad.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }),
      mesesRestantes: proyeccion.mesesParaLibertad,
    };
  }, [deudas]);

  const statusColors = {
    green: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    yellow: { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400' },
    red: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400' },
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        <div className="h-40 bg-[var(--bg-card)] rounded-2xl" />
        <div className="h-40 bg-[var(--bg-card)] rounded-2xl" />
      </div>
    );
  }

  const dailyStatus = statusColors[dailyBudget.status];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Disponible Hoy */}
      <div className={`relative overflow-hidden rounded-2xl ${dailyStatus.bg} border ${dailyStatus.border} p-5`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${dailyStatus.bg}`}>
              <Calendar className={`w-5 h-5 ${dailyStatus.text}`} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Hoy puedes gastar</p>
            </div>
          </div>
          <span className="text-xs text-white/40">{dailyBudget.transaccionesHoy} gastos</span>
        </div>

        <p className={`text-4xl font-black tracking-tight mb-2 ${dailyBudget.disponibleHoy >= 0 ? dailyStatus.text : 'text-red-400'}`}>
          {formatMoney(dailyBudget.disponibleHoy)}
        </p>

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/40">
            De ${dailyBudget.presupuestoDiario.toLocaleString()} diarios
          </span>
          {dailyBudget.gastadoHoy > 0 && (
            <span className="text-white/50">
              Gastado: {formatMoney(dailyBudget.gastadoHoy)}
            </span>
          )}
        </div>
      </div>

      {/* Progreso Deuda */}
      <Link
        href="/deudas"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-pink-500/5 border border-purple-500/30 p-5 hover:border-purple-500/50 transition-colors group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Deuda restante</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs">Ver detalles</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <p className="text-4xl font-black tracking-tight text-purple-400 mb-2">
          {formatMoney(deudaData.deudaTotal)}
        </p>

        {/* Progress */}
        <div className="space-y-2">
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${deudaData.porcentaje}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-emerald-400">
              {deudaData.porcentaje.toFixed(1)}% pagado
            </span>
            <span className="text-white/40">
              Libertad: {deudaData.fechaLibertad}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
