'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, X, Bell, CheckCircle, TrendingDown, TrendingUp,
  Users, Heart, MessageCircle, Target, Flame, Shield
} from 'lucide-react';
import { subscribeToGastos, Gasto, subscribeToDeudas, calcularTotalesFromDeudas } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE, presupuestosPersonales, deudasIniciales, PRESUPUESTO_IMPREVISTOS } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { safeGetJSON, safeSetJSON } from '@/lib/storage';
import { Deuda } from '@/types';
import { useGastosDelMes, useGastosPorTitular, filtrarImprevistos, calcularTotal } from '@/hooks/useGastosFilters';
import Link from 'next/link';

interface Alert {
  id: string;
  priority: number; // 1 = highest (danger), 2 = warning, 3 = info, 4 = success
  type: 'danger' | 'warning' | 'info' | 'success';
  category: 'budget' | 'couple' | 'debt' | 'emergency' | 'general';
  title: string;
  message: string;
  action?: { label: string; href: string };
  dismissible: boolean;
}

interface UnifiedAlertsProps {
  maxAlerts?: number;
  compact?: boolean;
  className?: string;
}

export default function UnifiedAlerts({ maxAlerts = 5, compact = false, className = '' }: UnifiedAlertsProps) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Load dismissed alerts
  useEffect(() => {
    const dismissed = safeGetJSON<string[]>('unified-dismissed-alerts', []);
    setDismissedAlerts(new Set(dismissed));
  }, []);

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

  // Usar hooks centralizados
  const gastosData = useGastosDelMes(gastos);
  const titularData = useGastosPorTitular(gastos);

  // Generate all alerts
  const alerts = useMemo(() => {
    const today = new Date();
    const mesActual = today.toISOString().slice(0, 7);
    const diaActual = today.getDate();
    const diasEnMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const diasRestantes = Math.max(1, diasEnMes - diaActual + 1);
    const porcentajeMes = (diaActual / diasEnMes) * 100;

    const allAlerts: Alert[] = [];

    // ========== BUDGET ALERTS ==========
    const { totalVariables, disponibleVariables, porcentajeVariables } = gastosData;

    // Critical: Over budget
    if (porcentajeVariables >= 100) {
      allAlerts.push({
        id: `budget-over-${mesActual}`,
        priority: 1,
        type: 'danger',
        category: 'budget',
        title: 'Presupuesto excedido',
        message: `Te pasaste por ${formatMoney(Math.abs(disponibleVariables))}. Pausa los gastos no esenciales.`,
        action: { label: 'Ver gastos', href: '/gastos' },
        dismissible: false,
      });
    }
    // Danger: 90%+ used
    else if (porcentajeVariables >= 90) {
      allAlerts.push({
        id: `budget-danger-${mesActual}`,
        priority: 1,
        type: 'danger',
        category: 'budget',
        title: 'Presupuesto al límite',
        message: `Has usado ${porcentajeVariables.toFixed(0)}% y quedan ${diasRestantes} días.`,
        action: { label: 'Revisar', href: '/gastos' },
        dismissible: false,
      });
    }
    // Warning: 70%+ used
    else if (porcentajeVariables >= 70) {
      allAlerts.push({
        id: `budget-warning-${mesActual}`,
        priority: 2,
        type: 'warning',
        category: 'budget',
        title: 'Cuidado con el presupuesto',
        message: `Llevas ${porcentajeVariables.toFixed(0)}% gastado. Te quedan ${formatMoney(disponibleVariables)}.`,
        dismissible: true,
      });
    }

    // ========== COUPLE ALERTS ==========
    const porcentajes = {
      alejandra: titularData.alejandra.porcentaje,
      ricardo: titularData.ricardo.porcentaje,
      compartido: titularData.compartido.porcentaje,
    };

    // Check each person
    (['alejandra', 'ricardo', 'compartido'] as const).forEach(titular => {
      const pct = porcentajes[titular];
      const disponible = titularData[titular].disponible;
      const name = titular === 'alejandra' ? 'Ale' : titular === 'ricardo' ? 'Ricardo' : 'Compartido';

      if (pct >= 100) {
        allAlerts.push({
          id: `${titular}-over-${mesActual}`,
          priority: 1,
          type: 'danger',
          category: 'couple',
          title: `${name} excedió su presupuesto`,
          message: `Se pasó por ${formatMoney(Math.abs(disponible))}`,
          dismissible: false,
        });
      } else if (pct >= 80) {
        allAlerts.push({
          id: `${titular}-warning-${mesActual}`,
          priority: 2,
          type: 'warning',
          category: 'couple',
          title: `${name} está al ${pct.toFixed(0)}%`,
          message: `Solo le quedan ${formatMoney(disponible)}`,
          dismissible: true,
        });
      }
    });

    // Imbalance alert
    const gastosAle = titularData.alejandra.total;
    const gastosRic = titularData.ricardo.total;
    const diferencia = Math.abs(gastosAle - gastosRic);
    const promedioGastos = (gastosAle + gastosRic) / 2;

    if (promedioGastos > 1000 && diferencia > promedioGastos * 0.5) {
      const quienMas = gastosAle > gastosRic ? 'Ale' : 'Ricardo';
      allAlerts.push({
        id: `imbalance-${mesActual}`,
        priority: 3,
        type: 'info',
        category: 'couple',
        title: `${quienMas} lleva ${formatMoney(diferencia)} más`,
        message: 'Consideren balancear los gastos compartidos',
        dismissible: true,
      });
    }

    // ========== EMERGENCY FUND ALERTS ==========
    const gastosImprevistos = filtrarImprevistos(gastosData.gastosDelMes);
    const totalImprevistos = calcularTotal(gastosImprevistos);
    const disponibleImprevistos = PRESUPUESTO_IMPREVISTOS - totalImprevistos;
    const porcentajeImprevistos = PRESUPUESTO_IMPREVISTOS > 0 ? (totalImprevistos / PRESUPUESTO_IMPREVISTOS) * 100 : 0;

    if (porcentajeImprevistos >= 80) {
      allAlerts.push({
        id: `imprevistos-warning-${mesActual}`,
        priority: 2,
        type: 'warning',
        category: 'emergency',
        title: 'Fondo de imprevistos bajo',
        message: `Has usado ${porcentajeImprevistos.toFixed(0)}% (${formatMoney(totalImprevistos)})`,
        dismissible: true,
      });
    }

    // ========== DEBT ALERTS ==========
    const totalesDeuda = calcularTotalesFromDeudas(deudas);
    const deudaInicial = deudasIniciales.reduce((sum, d) => sum + d.saldoInicial, 0);
    const porcentajePagado = deudaInicial > 0 ? ((deudaInicial - totalesDeuda.deudaTotal) / deudaInicial) * 100 : 0;

    // Celebration milestones
    if (porcentajePagado >= 75 && porcentajePagado < 76) {
      allAlerts.push({
        id: 'debt-75',
        priority: 4,
        type: 'success',
        category: 'debt',
        title: '75% de la deuda pagada',
        message: 'La recta final. Sigan con el mismo esfuerzo.',
        action: { label: 'Ver progreso', href: '/deudas' },
        dismissible: true,
      });
    } else if (porcentajePagado >= 50 && porcentajePagado < 51) {
      allAlerts.push({
        id: 'debt-50',
        priority: 4,
        type: 'success',
        category: 'debt',
        title: '50% de la deuda pagada',
        message: 'Llegaron a la mitad del camino. Excelente trabajo.',
        action: { label: 'Ver progreso', href: '/deudas' },
        dismissible: true,
      });
    }

    // ========== POSITIVE ALERTS ==========
    // Both under budget
    const ambosVanBien = porcentajes.alejandra <= porcentajeMes && porcentajes.ricardo <= porcentajeMes;
    if (ambosVanBien && diaActual > 7) {
      allAlerts.push({
        id: `both-good-${mesActual}`,
        priority: 4,
        type: 'success',
        category: 'couple',
        title: 'Van muy bien los dos',
        message: 'Están dentro del presupuesto ideal del mes',
        dismissible: true,
      });
    }

    // Budget surplus near end of month
    if (diasRestantes <= 5 && disponibleVariables > PRESUPUESTO_VARIABLE * 0.2) {
      allAlerts.push({
        id: `surplus-${mesActual}`,
        priority: 3,
        type: 'info',
        category: 'general',
        title: 'Presupuesto sobrante',
        message: `Quedan ${formatMoney(disponibleVariables)} y ${diasRestantes} días. Consideren abonar a deudas.`,
        action: { label: 'Ver deudas', href: '/deudas' },
        dismissible: true,
      });
    }

    // Sort by priority
    return allAlerts.sort((a, b) => a.priority - b.priority);
  }, [gastosData, titularData, deudas]);

  const dismissAlert = (alertId: string) => {
    const newDismissed = new Set([...dismissedAlerts, alertId]);
    setDismissedAlerts(newDismissed);
    safeSetJSON('unified-dismissed-alerts', Array.from(newDismissed));
  };

  // Filter and limit alerts
  const activeAlerts = alerts
    .filter(a => !dismissedAlerts.has(a.id))
    .slice(0, maxAlerts);

  if (loading) {
    return <div className={`glass-card animate-pulse h-24 ${className}`} />;
  }

  if (activeAlerts.length === 0) {
    if (compact) return null;

    return (
      <div className={`glass-card ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-white">Todo en orden</p>
            <p className="text-sm text-white/50">No hay alertas activas</p>
          </div>
        </div>
      </div>
    );
  }

  const getAlertConfig = (alert: Alert) => {
    const configs = {
      danger: {
        bg: 'bg-red-500/10 border-red-500/30',
        iconBg: 'bg-red-500/20',
        icon: AlertTriangle,
        iconColor: 'text-red-400',
      },
      warning: {
        bg: 'bg-amber-500/10 border-amber-500/30',
        iconBg: 'bg-amber-500/20',
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
      },
      info: {
        bg: 'bg-blue-500/10 border-blue-500/30',
        iconBg: 'bg-blue-500/20',
        icon: MessageCircle,
        iconColor: 'text-blue-400',
      },
      success: {
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        iconBg: 'bg-emerald-500/20',
        icon: CheckCircle,
        iconColor: 'text-emerald-400',
      },
    };
    return configs[alert.type];
  };

  const getCategoryIcon = (category: Alert['category']) => {
    switch (category) {
      case 'couple': return Users;
      case 'debt': return Target;
      case 'emergency': return Shield;
      case 'budget': return Flame;
      default: return Bell;
    }
  };

  return (
    <div className={`glass-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Alertas</h3>
            <p className="text-xs text-white/50">
              {activeAlerts.length} activa{activeAlerts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {activeAlerts.map(alert => {
          const config = getAlertConfig(alert);
          const Icon = config.icon;
          const CategoryIcon = getCategoryIcon(alert.category);

          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${config.bg} animate-in slide-in-from-left-2 duration-200`}
            >
              <div className={`w-9 h-9 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <CategoryIcon className="w-3 h-3 text-white/40" />
                  <span className="text-xs text-white/40 capitalize">{alert.category}</span>
                </div>
                <p className="text-sm font-medium text-white">{alert.title}</p>
                <p className="text-xs text-white/60 mt-0.5">{alert.message}</p>

                {alert.action && (
                  <Link
                    href={alert.action.href}
                    className={`inline-block text-xs font-medium mt-2 ${config.iconColor} hover:underline`}
                  >
                    {alert.action.label} →
                  </Link>
                )}
              </div>

              {alert.dismissible && (
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                  title="Descartar"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-xs text-white/40 text-center flex items-center justify-center gap-1">
          <Heart className="w-3 h-3 text-pink-400" />
          Cada peso que no gastas te acerca a la libertad
        </p>
      </div>
    </div>
  );
}
