'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, AlertTriangle, Heart, TrendingUp, TrendingDown, Bell, X, Check, MessageCircle } from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { presupuestosPersonales } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { safeGetJSON, safeSetJSON } from '@/lib/storage';
import { toast } from 'sonner';

interface CoupleAlertsProps {
  className?: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'success' | 'info';
  titular: 'alejandra' | 'ricardo' | 'compartido' | 'both';
  message: string;
  submessage?: string;
  timestamp: number;
  dismissed?: boolean;
}

const TITULAR_CONFIG = {
  alejandra: {
    name: 'Ale',
    color: 'pink',
    bgClass: 'bg-pink-500/10 border-pink-500/30',
    textClass: 'text-pink-400',
  },
  ricardo: {
    name: 'Ricardo',
    color: 'blue',
    bgClass: 'bg-blue-500/10 border-blue-500/30',
    textClass: 'text-blue-400',
  },
  compartido: {
    name: 'Compartido',
    color: 'green',
    bgClass: 'bg-green-500/10 border-green-500/30',
    textClass: 'text-green-400',
  },
  both: {
    name: 'Pareja',
    color: 'purple',
    bgClass: 'bg-purple-500/10 border-purple-500/30',
    textClass: 'text-purple-400',
  },
};

export default function CoupleAlerts({ className = '' }: CoupleAlertsProps) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [shownToastAlerts, setShownToastAlerts] = useState<Set<string>>(new Set());

  // Load dismissed alerts
  useEffect(() => {
    const dismissed = safeGetJSON<string[]>('couple-dismissed-alerts', []);
    setDismissedAlerts(new Set(dismissed));

    const shownToasts = safeGetJSON<string[]>('couple-shown-toasts', []);
    setShownToastAlerts(new Set(shownToasts));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Generar alertas basadas en el estado actual
  const alerts = useMemo(() => {
    const today = new Date();
    const mesActual = today.toISOString().slice(0, 7);
    const diaActual = today.getDate();
    const diasEnMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const porcentajeMes = (diaActual / diasEnMes) * 100;

    // Filtrar gastos del mes (solo variables)
    const gastosDelMes = gastos.filter(g =>
      g.fecha.startsWith(mesActual) && !g.esFijo && !g.conVales
    );

    // Gastos por titular
    const gastosPorTitular = {
      alejandra: gastosDelMes.filter(g => g.titular === 'alejandra').reduce((sum, g) => sum + g.monto, 0),
      ricardo: gastosDelMes.filter(g => g.titular === 'ricardo').reduce((sum, g) => sum + g.monto, 0),
      compartido: gastosDelMes.filter(g => g.titular === 'compartido' || !g.titular).reduce((sum, g) => sum + g.monto, 0),
    };

    // Porcentaje usado por titular
    const porcentajePorTitular = {
      alejandra: (gastosPorTitular.alejandra / presupuestosPersonales.alejandra) * 100,
      ricardo: (gastosPorTitular.ricardo / presupuestosPersonales.ricardo) * 100,
      compartido: (gastosPorTitular.compartido / presupuestosPersonales.compartido) * 100,
    };

    // Disponible por titular
    const disponiblePorTitular = {
      alejandra: presupuestosPersonales.alejandra - gastosPorTitular.alejandra,
      ricardo: presupuestosPersonales.ricardo - gastosPorTitular.ricardo,
      compartido: presupuestosPersonales.compartido - gastosPorTitular.compartido,
    };

    const newAlerts: Alert[] = [];

    // Alertas por exceso de presupuesto
    (['alejandra', 'ricardo', 'compartido'] as const).forEach(titular => {
      const pct = porcentajePorTitular[titular];
      const config = TITULAR_CONFIG[titular];
      const disponible = disponiblePorTitular[titular];

      if (pct >= 100) {
        newAlerts.push({
          id: `${titular}-over-${mesActual}`,
          type: 'danger',
          titular,
          message: `${config.name} se pasó del presupuesto`,
          submessage: `Excedido por ${formatMoney(Math.abs(disponible))}`,
          timestamp: Date.now(),
        });
      } else if (pct >= 80) {
        newAlerts.push({
          id: `${titular}-warning-${mesActual}`,
          type: 'warning',
          titular,
          message: `${config.name} está al ${pct.toFixed(0)}%`,
          submessage: `Solo quedan ${formatMoney(disponible)}`,
          timestamp: Date.now(),
        });
      }
    });

    // Alerta si uno gasta mucho más que el otro (desbalance)
    const gastosAle = gastosPorTitular.alejandra;
    const gastosRic = gastosPorTitular.ricardo;
    const diferencia = Math.abs(gastosAle - gastosRic);
    const promedioGastos = (gastosAle + gastosRic) / 2;

    if (promedioGastos > 1000 && diferencia > promedioGastos * 0.5) {
      const quienMas = gastosAle > gastosRic ? 'alejandra' : 'ricardo';
      const quienMenos = gastosAle > gastosRic ? 'ricardo' : 'alejandra';
      newAlerts.push({
        id: `desbalance-${mesActual}`,
        type: 'info',
        titular: 'both',
        message: `${TITULAR_CONFIG[quienMas].name} lleva ${formatMoney(diferencia)} más`,
        submessage: `Consideren balancear los gastos`,
        timestamp: Date.now(),
      });
    }

    // Alerta positiva si ambos van bien
    const ambosVanBien = porcentajePorTitular.alejandra <= porcentajeMes &&
                         porcentajePorTitular.ricardo <= porcentajeMes;
    if (ambosVanBien && diaActual > 7) {
      newAlerts.push({
        id: `both-good-${mesActual}`,
        type: 'success',
        titular: 'both',
        message: '¡Van muy bien los dos!',
        submessage: 'Están dentro del presupuesto ideal',
        timestamp: Date.now(),
      });
    }

    // Alerta si uno está muy bien y puede ayudar al otro
    if (porcentajePorTitular.alejandra <= 50 && porcentajePorTitular.ricardo >= 80) {
      newAlerts.push({
        id: `ale-can-help-${mesActual}`,
        type: 'info',
        titular: 'both',
        message: 'Ale puede cubrir gastos compartidos',
        submessage: `Ricardo necesita frenar un poco`,
        timestamp: Date.now(),
      });
    } else if (porcentajePorTitular.ricardo <= 50 && porcentajePorTitular.alejandra >= 80) {
      newAlerts.push({
        id: `ric-can-help-${mesActual}`,
        type: 'info',
        titular: 'both',
        message: 'Ricardo puede cubrir gastos compartidos',
        submessage: `Ale necesita frenar un poco`,
        timestamp: Date.now(),
      });
    }

    return newAlerts;
  }, [gastos]);

  // Mostrar toasts para alertas nuevas de tipo danger/warning
  useEffect(() => {
    alerts.forEach(alert => {
      const toastKey = alert.id;
      if ((alert.type === 'danger' || alert.type === 'warning') && !shownToastAlerts.has(toastKey)) {
        if (alert.type === 'danger') {
          toast.error(alert.message, { description: alert.submessage });
        } else {
          toast.warning(alert.message, { description: alert.submessage });
        }
        setShownToastAlerts(prev => {
          const newSet = new Set([...prev, toastKey]);
          safeSetJSON('couple-shown-toasts', Array.from(newSet));
          return newSet;
        });
      }
    });
  }, [alerts, shownToastAlerts]);

  const dismissAlert = (alertId: string) => {
    const newDismissed = new Set([...dismissedAlerts, alertId]);
    setDismissedAlerts(newDismissed);
    safeSetJSON('couple-dismissed-alerts', Array.from(newDismissed));
  };

  // Filtrar alertas no descartadas
  const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  if (loading) {
    return <div className={`glass-card animate-pulse h-32 ${className}`} />;
  }

  if (activeAlerts.length === 0) {
    return null; // No mostrar nada si no hay alertas
  }

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
          iconBg: 'bg-red-500/20',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          iconBg: 'bg-amber-500/20',
        };
      case 'success':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30',
          icon: <Check className="w-5 h-5 text-emerald-400" />,
          iconBg: 'bg-emerald-500/20',
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          icon: <MessageCircle className="w-5 h-5 text-blue-400" />,
          iconBg: 'bg-blue-500/20',
        };
    }
  };

  return (
    <div className={`glass-card ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Alertas de Pareja</h3>
          <p className="text-xs text-white/50">
            {activeAlerts.length} alerta{activeAlerts.length !== 1 ? 's' : ''} activa{activeAlerts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-2">
        {activeAlerts.map(alert => {
          const styles = getAlertStyles(alert.type);
          const titularConfig = TITULAR_CONFIG[alert.titular];

          return (
            <div
              key={alert.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${styles.bg} animate-in slide-in-from-left-2 duration-200`}
            >
              <div className={`w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                {styles.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${titularConfig.bgClass} ${titularConfig.textClass}`}>
                    {titularConfig.name}
                  </span>
                </div>
                <p className="text-sm font-medium text-white mt-1">{alert.message}</p>
                {alert.submessage && (
                  <p className="text-xs text-white/50">{alert.submessage}</p>
                )}
              </div>

              <button
                onClick={() => dismissAlert(alert.id)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                title="Descartar"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-xs text-white/40 text-center flex items-center justify-center gap-1">
          <Heart className="w-3 h-3 text-pink-400" />
          Trabajen juntos para alcanzar sus metas
        </p>
      </div>
    </div>
  );
}
