'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE } from '@/lib/data';
import { formatMoney } from '@/lib/utils';

export default function HeroMetric() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const data = useMemo(() => {
    const today = new Date();
    const mesActual = today.toISOString().slice(0, 7);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();

    // Filtrar gastos variables del mes (no fijos, no vales, no imprevistos)
    const gastosDelMes = gastos.filter(g =>
      g.fecha.startsWith(mesActual) && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos'
    );
    const totalGastado = gastosDelMes.reduce((sum, g) => sum + g.monto, 0);
    const disponible = PRESUPUESTO_VARIABLE - totalGastado;

    // Calcular si van bien según el día del mes
    const presupuestoIdealHastaHoy = (PRESUPUESTO_VARIABLE / daysInMonth) * dayOfMonth;
    const diferencia = presupuestoIdealHastaHoy - totalGastado;
    const porcentajeUsado = (totalGastado / PRESUPUESTO_VARIABLE) * 100;
    const porcentajeDelMes = (dayOfMonth / daysInMonth) * 100;

    // Determinar estado
    let status: 'excellent' | 'good' | 'warning' | 'danger' = 'good';
    if (porcentajeUsado <= porcentajeDelMes - 10) status = 'excellent';
    else if (porcentajeUsado <= porcentajeDelMes + 5) status = 'good';
    else if (porcentajeUsado <= porcentajeDelMes + 20) status = 'warning';
    else status = 'danger';

    // Mensaje contextual
    let mensaje = '';
    let submensaje = '';

    if (status === 'excellent') {
      mensaje = 'Van muy bien';
      submensaje = `${formatMoney(Math.abs(diferencia))} adelantados del plan`;
    } else if (status === 'good') {
      mensaje = 'En buen camino';
      submensaje = 'Sigan así para cerrar bien el mes';
    } else if (status === 'warning') {
      mensaje = 'Cuidado';
      submensaje = `${formatMoney(Math.abs(diferencia))} arriba de lo ideal`;
    } else {
      mensaje = 'Se están pasando';
      submensaje = `Reduzcan gastos los próximos ${daysInMonth - dayOfMonth} días`;
    }

    return {
      disponible,
      totalGastado,
      porcentajeUsado,
      status,
      mensaje,
      submensaje,
      diasRestantes: daysInMonth - dayOfMonth,
    };
  }, [gastos]);

  const statusConfig = {
    excellent: {
      bg: 'from-emerald-500/30 via-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-500/20',
      textColor: 'text-emerald-400',
      icon: CheckCircle,
      ring: 'ring-emerald-500/30',
    },
    good: {
      bg: 'from-blue-500/30 via-blue-500/20 to-cyan-500/10',
      border: 'border-blue-500/40',
      glow: 'shadow-blue-500/20',
      textColor: 'text-blue-400',
      icon: CheckCircle,
      ring: 'ring-blue-500/30',
    },
    warning: {
      bg: 'from-amber-500/30 via-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-500/20',
      textColor: 'text-amber-400',
      icon: AlertTriangle,
      ring: 'ring-amber-500/30',
    },
    danger: {
      bg: 'from-red-500/30 via-red-500/20 to-pink-500/10',
      border: 'border-red-500/40',
      glow: 'shadow-red-500/20',
      textColor: 'text-red-400',
      icon: XCircle,
      ring: 'ring-red-500/30',
    },
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-[#1C2128] animate-pulse h-48" />
    );
  }

  const config = statusConfig[data.status];
  const StatusIcon = config.icon;

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.bg} border ${config.border} shadow-2xl ${config.glow}`}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br ${config.bg} blur-3xl opacity-50`} />
        <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-gradient-to-br ${config.bg} blur-3xl opacity-30`} />
      </div>

      <div className="relative p-6 md:p-8">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 ${config.textColor}`}>
            <StatusIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{data.mensaje}</span>
          </div>
          <span className="text-white/40 text-sm">{data.diasRestantes} días restantes</span>
        </div>

        {/* Main metric */}
        <div className="text-center py-4">
          <p className="text-white/60 text-sm mb-2">Te queda este mes</p>
          <p className={`text-6xl md:text-7xl font-black tracking-tight ${data.disponible >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatMoney(Math.max(0, data.disponible))}
          </p>
          {data.disponible < 0 && (
            <p className="text-red-400 mt-2">
              Te pasaste por {formatMoney(Math.abs(data.disponible))}
            </p>
          )}
        </div>

        {/* Submessage */}
        <p className="text-center text-white/50 text-sm mt-2">{data.submensaje}</p>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-white/40 mb-2">
            <span>Gastado: {formatMoney(data.totalGastado)}</span>
            <span>Presupuesto: {formatMoney(PRESUPUESTO_VARIABLE)}</span>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                data.status === 'excellent' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                data.status === 'good' ? 'bg-gradient-to-r from-blue-500 to-cyan-400' :
                data.status === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                'bg-gradient-to-r from-red-500 to-pink-400'
              }`}
              style={{ width: `${Math.min(data.porcentajeUsado, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
