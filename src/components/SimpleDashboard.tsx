'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, Flame, CheckCircle2, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Plus, Target, Sparkles } from 'lucide-react';
import { subscribeToGastos, Gasto, subscribeToDeudas, calcularTotalesFromDeudas } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE, PRESUPUESTO_GUSTOS, presupuestosPersonales, calcularProyeccionDeudas } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import Link from 'next/link';
import { Deuda } from '@/types';

// Traffic light colors
type StatusType = 'green' | 'yellow' | 'red';

interface StatusConfig {
  bg: string;
  border: string;
  text: string;
  glow: string;
  label: string;
  emoji: string;
}

const statusColors: Record<StatusType, StatusConfig> = {
  green: {
    bg: 'from-green-500/30 to-emerald-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    glow: 'shadow-green-500/20',
    label: 'Vas muy bien',
    emoji: '✨',
  },
  yellow: {
    bg: 'from-yellow-500/30 to-orange-500/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/20',
    label: 'Ten cuidado',
    emoji: '⚠️',
  },
  red: {
    bg: 'from-red-500/30 to-pink-500/20',
    border: 'border-red-500/50',
    text: 'text-red-400',
    glow: 'shadow-red-500/20',
    label: 'Te pasaste',
    emoji: '🛑',
  },
};

export default function SimpleDashboard() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubGastos = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });

    const unsubDeudas = subscribeToDeudas((deudasActualizadas) => {
      setDeudas(deudasActualizadas);
    });

    return () => {
      unsubGastos();
      unsubDeudas();
    };
  }, []);

  // Calculate daily budget
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  // Ensure at least 1 day remaining to avoid division by zero
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);

  // Get current month gastos
  const mesActual = today.toISOString().slice(0, 7);
  const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesActual));

  // Solo gastos VARIABLES (no fijos, no vales) afectan el presupuesto de $15,000
  const gastosVariablesDelMes = gastosDelMes.filter(g => !g.esFijo && !g.conVales);
  const totalGastadoMes = gastosVariablesDelMes.reduce((sum, g) => sum + g.monto, 0);

  // Get today's gastos (solo variables)
  const hoy = today.toISOString().split('T')[0];
  const gastosHoy = gastos.filter(g => g.fecha === hoy && !g.esFijo && !g.conVales);
  const totalGastadoHoy = gastosHoy.reduce((sum, g) => sum + g.monto, 0);

  // Calculate remaining budget and daily allowance
  const presupuestoRestante = PRESUPUESTO_VARIABLE - totalGastadoMes;
  const presupuestoDiario = Math.max(0, Math.floor(presupuestoRestante / daysRemaining));
  const disponibleHoy = Math.max(0, presupuestoDiario - totalGastadoHoy);

  // Traffic light status
  const porcentajeUsadoHoy = presupuestoDiario > 0 ? (totalGastadoHoy / presupuestoDiario) * 100 : 0;
  const status: StatusType = porcentajeUsadoHoy <= 70 ? 'green' : porcentajeUsadoHoy <= 100 ? 'yellow' : 'red';

  // Time-based greeting
  const hour = today.getHours();
  const isNight = hour >= 20 || hour < 6;
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  // Streak calculation (days under budget this month)
  const diasDelMes = Array.from({ length: dayOfMonth }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
    return date.toISOString().split('T')[0];
  });

  const diasBajoPresupuesto = diasDelMes.filter(dia => {
    // Solo contar gastos variables para la racha
    const gastosDia = gastos.filter(g => g.fecha === dia && !g.esFijo && !g.conVales);
    const totalDia = gastosDia.reduce((sum, g) => sum + g.monto, 0);
    return totalDia <= presupuestoDiario;
  }).length;

  // Debt progress - calculado dinámicamente con intereses reales
  const totales = calcularTotalesFromDeudas(deudas);

  // Proyección real con intereses compuestos
  const proyeccion = useMemo(() => {
    if (deudas.length === 0) return null;
    return calcularProyeccionDeudas(deudas, 0);
  }, [deudas]);

  const mesesParaLibertad = proyeccion?.mesesParaLibertad || 0;

  // Fecha de libertad formateada
  const fechaLibertad = useMemo(() => {
    if (!proyeccion) return 'Calculando...';
    const fecha = new Date(proyeccion.fechaLibertad + '-01');
    return fecha.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
  }, [proyeccion]);

  const currentStatus = statusColors[status];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/50">Preparando tu día...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Greeting Header */}
      <div className="text-center pt-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          {isNight ? (
            <Moon className="w-6 h-6 text-purple-400" />
          ) : (
            <Sun className="w-6 h-6 text-yellow-400" />
          )}
          <span className="text-xl text-white/80 font-medium">{greeting}</span>
        </div>
      </div>

      {/* THE ONE NUMBER - Hero Card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentStatus.bg} border-2 ${currentStatus.border} shadow-2xl ${currentStatus.glow} p-8`}>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5" />

        {/* Traffic Light Indicator */}
        <div className="flex justify-center mb-6">
          <div className={`flex items-center gap-2 px-5 py-2 rounded-full bg-black/30 ${currentStatus.text} font-medium`}>
            <span className="text-lg">{currentStatus.emoji}</span>
            <span>{currentStatus.label}</span>
          </div>
        </div>

        {/* Main Number */}
        <div className="text-center relative z-10">
          <p className="text-lg text-white/70 mb-2 font-medium">HOY PUEDES GASTAR</p>
          <p className={`text-6xl md:text-7xl font-black tracking-tight ${disponibleHoy > 0 ? 'text-white' : 'text-red-400'}`}>
            {formatMoney(disponibleHoy)}
          </p>
          <p className="text-sm text-white/50 mt-3">sin afectar tu plan de libertad</p>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 space-y-2">
          <div className="flex justify-between text-sm text-white/60">
            <span>Gastado hoy: {formatMoney(totalGastadoHoy)}</span>
            <span>Límite: {formatMoney(presupuestoDiario)}</span>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                status === 'green' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                status === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                'bg-gradient-to-r from-red-400 to-pink-500'
              }`}
              style={{ width: `${Math.min(porcentajeUsadoHoy, 100)}%` }}
            />
          </div>
        </div>

        {/* Streak Badge */}
        {diasBajoPresupuesto > 0 && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-full border border-orange-500/30">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-orange-300 font-bold">{diasBajoPresupuesto} días en racha</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Button */}
      <Link
        href="/registrar"
        className="block w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-2xl text-white font-bold text-lg text-center transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/25"
      >
        <div className="flex items-center justify-center gap-3">
          <Plus className="w-6 h-6" />
          <span>Registrar Gasto</span>
        </div>
      </Link>

      {/* Freedom Progress - Compact */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-white">Tu Progreso</span>
          </div>
          <span className="text-sm text-green-400 font-medium">
            {totales.porcentajePagado.toFixed(1)}%
          </span>
        </div>

        <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-green-500 transition-all duration-1000"
            style={{ width: `${totales.porcentajePagado}%` }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-white/50">Faltan {mesesParaLibertad} meses</span>
          <span className="text-purple-400 font-medium">Meta: {fechaLibertad}</span>
        </div>
      </div>

      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full py-3 px-4 glass-card hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-white/70"
      >
        <span>{showDetails ? 'Ocultar detalles' : 'Ver más detalles'}</span>
        {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {/* Collapsible Details */}
      {showDetails && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {/* Monthly Summary */}
          <div className="glass-card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Resumen del Mes
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-white/40 mb-1">Gastado este mes</p>
                <p className="text-lg font-bold text-white">{formatMoney(totalGastadoMes)}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-white/40 mb-1">Presupuesto restante</p>
                <p className={`text-lg font-bold ${presupuestoRestante >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatMoney(presupuestoRestante)}
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-white/40 mb-1">Días restantes</p>
                <p className="text-lg font-bold text-white">{daysRemaining}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-white/40 mb-1">Gastos variables</p>
                <p className="text-lg font-bold text-white">{gastosVariablesDelMes.length}</p>
              </div>
            </div>
          </div>

          {/* Debt Summary - Positive Framing */}
          <div className="glass-card border border-green-500/20">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Camino a la Libertad
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Ya pagaste</span>
                <span className="text-green-400 font-bold">{formatMoney(totales.deudaPagada)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Deudas activas</span>
                <span className="text-white font-medium">{deudas.filter(d => !d.liquidada).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Este mes pagarás</span>
                <span className="text-purple-400 font-bold">{formatMoney(totales.pagosMinimos)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Motivational Footer */}
      <div className="text-center py-4">
        <p className="text-sm text-white/40">
          Cada peso que no gastas hoy te acerca a la libertad
        </p>
      </div>
    </div>
  );
}
