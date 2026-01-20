'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, TrendingUp, Flame, CheckCircle2, PiggyBank } from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE, VALES_DESPENSA } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { getTotalAhorroMensual } from './SavingsGoals';

export default function DailyBudgetCard() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [ahorroMensual, setAhorroMensual] = useState(0);

  useEffect(() => {
    // Cargar ahorro mensual
    setAhorroMensual(getTotalAhorroMensual());

    // Escuchar cambios en las metas de ahorro
    const handleSavingsUpdate = () => {
      setAhorroMensual(getTotalAhorroMensual());
    };
    window.addEventListener('savings-goals-updated', handleSavingsUpdate);

    // Fetch inicial via API (más confiable)
    fetch('/api/finanzas')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.gastosMes) {
          setGastos(data.data.gastosMes);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // También suscribirse para actualizaciones en tiempo real
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => {
      unsubscribe();
      window.removeEventListener('savings-goals-updated', handleSavingsUpdate);
    };
  }, []);

  // Memoized calculations to prevent unnecessary re-renders
  const budgetData = useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);

    const mesActual = today.toISOString().slice(0, 7);
    const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesActual));

    // Gastos variables (no fijos, no vales)
    const gastosVariables = gastosDelMes.filter(g => !g.esFijo && !g.conVales);
    const totalGastadoMes = gastosVariables.reduce((sum, g) => sum + g.monto, 0);

    // Gastos con vales
    const gastosConVales = gastosDelMes.filter(g => g.conVales === true);
    const totalGastadoVales = gastosConVales.reduce((sum, g) => sum + g.monto, 0);
    const disponibleVales = VALES_DESPENSA - totalGastadoVales;

    // Today's gastos
    const hoy = today.toISOString().split('T')[0];
    const gastosHoy = gastosVariables.filter(g => g.fecha === hoy);
    const totalGastadoHoy = gastosHoy.reduce((sum, g) => sum + g.monto, 0);

    // Budget calculations - DESCONTAR AHORRO MENSUAL del presupuesto disponible
    const presupuestoAjustado = PRESUPUESTO_VARIABLE - ahorroMensual;
    const presupuestoRestante = presupuestoAjustado - totalGastadoMes;
    const presupuestoDiario = Math.max(0, Math.floor(presupuestoRestante / daysRemaining));
    const disponibleHoy = Math.max(0, presupuestoDiario - totalGastadoHoy);

    // Status
    const porcentajeUsadoHoy = presupuestoDiario > 0 ? (totalGastadoHoy / presupuestoDiario) * 100 : 0;
    const status = porcentajeUsadoHoy <= 70 ? 'green' : porcentajeUsadoHoy <= 90 ? 'yellow' : 'red';

    // Greeting
    const hour = today.getHours();
    const isNight = hour >= 20 || hour < 6;
    const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

    // Streak calculation
    const diasDelMes = Array.from({ length: dayOfMonth }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
      return date.toISOString().split('T')[0];
    });

    const diasBajoPresupuesto = diasDelMes.filter(dia => {
      const gastosDia = gastos.filter(g => g.fecha === dia);
      const totalDia = gastosDia.reduce((sum, g) => sum + g.monto, 0);
      return totalDia <= presupuestoDiario;
    }).length;

    return {
      totalGastadoMes,
      totalGastadoHoy,
      presupuestoRestante,
      presupuestoDiario,
      disponibleHoy,
      disponibleVales,
      porcentajeUsadoHoy,
      status: status as 'green' | 'yellow' | 'red',
      isNight,
      greeting,
      diasBajoPresupuesto,
      presupuestoAjustado,
    };
  }, [gastos, ahorroMensual]);

  const {
    totalGastadoMes,
    totalGastadoHoy,
    presupuestoRestante,
    presupuestoDiario,
    disponibleHoy,
    disponibleVales,
    porcentajeUsadoHoy,
    status,
    isNight,
    greeting,
    diasBajoPresupuesto,
    presupuestoAjustado,
  } = budgetData;

  const statusColors = {
    green: {
      bg: 'from-green-500/20 to-emerald-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      label: 'Vas muy bien',
      icon: CheckCircle2,
    },
    yellow: {
      bg: 'from-yellow-500/20 to-orange-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      label: 'Ten cuidado',
      icon: TrendingUp,
    },
    red: {
      bg: 'from-red-500/20 to-pink-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      label: 'Te estás pasando',
      icon: Flame,
    },
  };

  const currentStatus = statusColors[status];
  const StatusIcon = currentStatus.icon;

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-32 bg-[#252931] rounded-xl" />
      </div>
    );
  }

  return (
    <div className={`glass-card bg-gradient-to-br ${currentStatus.bg} border ${currentStatus.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isNight ? (
            <Moon className="w-5 h-5 text-purple-400" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-400" />
          )}
          <span className="text-white/80 font-medium">{greeting}</span>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm text-white/60">{diasBajoPresupuesto} días en racha</span>
        </div>
      </div>

      {/* Main Number - Semanal más claro */}
      <div className="text-center py-4">
        <p className="text-sm text-white/50 mb-1">Esta semana te queda</p>
        <p className={`text-4xl font-bold ${presupuestoRestante > 0 ? 'text-white' : 'text-red-400'}`}>
          {formatMoney(Math.max(0, Math.floor(presupuestoRestante / 4)))}
        </p>
        <p className="text-xs text-white/30 mt-1">≈ {formatMoney(presupuestoDiario)}/día</p>
      </div>

      {/* Hoy */}
      {totalGastadoHoy > 0 && (
        <div className="text-center py-2 mb-2 bg-white/5 rounded-lg">
          <p className="text-xs text-white/50">Hoy llevas</p>
          <p className={`text-lg font-semibold ${totalGastadoHoy > presupuestoDiario ? 'text-red-400' : 'text-white'}`}>
            {formatMoney(totalGastadoHoy)}
          </p>
        </div>
      )}

      {/* Status Badge */}
      <div className="flex justify-center mb-4">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 ${currentStatus.text}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{currentStatus.label}</span>
        </div>
      </div>

      {/* Progress Bar - Mensual */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-white/50">
          <span>Gastado este mes</span>
          <span>{formatMoney(totalGastadoMes)} / {formatMoney(PRESUPUESTO_VARIABLE)}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              status === 'green' ? 'bg-green-500' :
              status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min((totalGastadoMes / PRESUPUESTO_VARIABLE) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Ahorro activo indicator */}
      {ahorroMensual > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4 py-2 px-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <PiggyBank className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-300">
            Apartando {formatMoney(ahorroMensual)}/mes para metas
          </span>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <p className="text-xs text-white/40">Gastado</p>
          <p className="text-sm font-semibold text-white">{formatMoney(totalGastadoMes)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/40">Disponible</p>
          <p className={`text-sm font-semibold ${presupuestoRestante > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatMoney(presupuestoRestante)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/40">Vales 🏷️</p>
          <p className={`text-sm font-semibold ${disponibleVales > 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {formatMoney(disponibleVales)}
          </p>
        </div>
      </div>
    </div>
  );
}
