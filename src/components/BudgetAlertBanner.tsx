'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, X, List, Target, Pause, TrendingDown } from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { useMonth } from '@/contexts/MonthContext';
import { useGastosDelMes } from '@/hooks/useGastosFilters';

interface BudgetAlertBannerProps {
  onDismiss?: () => void;
}

export default function BudgetAlertBanner({ onDismiss }: BudgetAlertBannerProps) {
  const { selectedMonth } = useMonth();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Usar hook centralizado CON el mes seleccionado
  const gastosData = useGastosDelMes(gastos, selectedMonth);

  // Memoized calculations
  const alertData = useMemo(() => {
    const { totalVariables, porcentajeVariables, daysRemaining } = gastosData;

    // Determine alert level
    let alertLevel: 'critical' | 'danger' | 'warning' | null = null;
    if (porcentajeVariables >= 100) alertLevel = 'critical';
    else if (porcentajeVariables >= 90) alertLevel = 'danger';
    else if (porcentajeVariables >= 70) alertLevel = 'warning';

    return { totalGastado: totalVariables, porcentaje: porcentajeVariables, daysRemaining, alertLevel };
  }, [gastosData]);

  const { totalGastado, porcentaje, daysRemaining, alertLevel } = alertData;

  // Don't show if dismissed, loading, or no alert needed
  if (dismissed || loading || !alertLevel) return null;

  const alertConfig = {
    warning: {
      bg: 'from-yellow-500/20 to-orange-500/10',
      border: 'border-yellow-500/30',
      icon: TrendingDown,
      iconColor: 'text-yellow-400',
      title: 'Cuidado con el presupuesto',
      message: `Has usado ${porcentaje.toFixed(0)}% de tu presupuesto y faltan ${daysRemaining} días del mes.`,
    },
    danger: {
      bg: 'from-orange-500/20 to-red-500/10',
      border: 'border-orange-500/30',
      icon: AlertTriangle,
      iconColor: 'text-orange-400',
      title: '¡Alerta! Estás por pasarte',
      message: `Has usado ${porcentaje.toFixed(0)}% de tu presupuesto. Solo te quedan ${daysRemaining} días.`,
    },
    critical: {
      bg: 'from-red-500/20 to-pink-500/10',
      border: 'border-red-500/30',
      icon: AlertTriangle,
      iconColor: 'text-red-400',
      title: '¡Presupuesto excedido!',
      message: `Te pasaste por ${formatMoney(totalGastado - PRESUPUESTO_VARIABLE)}. Es hora de pausar los gastos.`,
    },
  };

  const config = alertConfig[alertLevel];
  const Icon = config.icon;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${config.bg} border ${config.border} p-4 mb-6`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)',
          backgroundSize: '10px 10px',
        }} />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-white/10`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <h4 className="font-semibold text-white">{config.title}</h4>
              <p className="text-sm text-white/70">{config.message}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                alertLevel === 'critical' ? 'bg-red-500' :
                alertLevel === 'danger' ? 'bg-orange-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-white/50">
            <span>Gastado: {formatMoney(totalGastado)}</span>
            <span>Presupuesto: {formatMoney(PRESUPUESTO_VARIABLE)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg text-sm text-white/80 hover:bg-white/20 transition-colors">
            <List className="w-4 h-4" />
            Ver mis gastos
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg text-sm text-white/80 hover:bg-white/20 transition-colors">
            <Target className="w-4 h-4" />
            Recordar mi meta
          </button>
          {alertLevel === 'critical' && (
            <button className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 rounded-lg text-sm text-purple-300 hover:bg-purple-500/30 transition-colors">
              <Pause className="w-4 h-4" />
              Modo austero
            </button>
          )}
        </div>

        {/* Recovery message for critical */}
        {alertLevel === 'critical' && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-white/60">
              💪 No te desanimes. Esto pasa. Los próximos {daysRemaining} días, intenta gastar $0 en no-esenciales.
              El dinero extra del próximo mes cubrirá esto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
