'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertTriangle, TrendingUp, CheckCircle, X, Zap, Target, Clock } from 'lucide-react';
import { categoriaLabels } from '@/lib/data';
import { formatMoney } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'success' | 'info';
  title: string;
  message: string;
  action?: string;
  actionRoute?: string;  // Ruta para navegar cuando se hace click
  dismissible: boolean;
}

export default function SmartAlerts() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Handler para acciones de alertas
  const handleAlertAction = (alert: Alert) => {
    if (alert.actionRoute) {
      router.push(alert.actionRoute);
    }
  };

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // Fetch reporte mensual para generar alertas inteligentes
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'obtener_reporte_mensual', params: {} })
        });
        const result = await res.json();

        if (result.success) {
          const data = result.data;
          const generatedAlerts: Alert[] = [];

          // Alerta: Cerca del límite de presupuesto
          const porcentajeUsado = (data.totalActual / data.presupuesto) * 100;
          if (porcentajeUsado >= 90) {
            generatedAlerts.push({
              id: 'budget-critical',
              type: 'danger',
              title: 'Presupuesto al límite',
              message: `Has usado el ${porcentajeUsado.toFixed(0)}% de tu presupuesto. Solo te quedan ${formatMoney(data.disponible)}.`,
              action: 'Revisar gastos',
              actionRoute: '/analisis',
              dismissible: false
            });
          } else if (porcentajeUsado >= 70) {
            generatedAlerts.push({
              id: 'budget-warning',
              type: 'warning',
              title: 'Presupuesto al 70%',
              message: `Llevas ${formatMoney(data.totalActual)} de ${formatMoney(data.presupuesto)}. Considera reducir gastos.`,
              action: 'Ver detalles',
              actionRoute: '/analisis',
              dismissible: true
            });
          }

          // Alerta: Aumento significativo vs mes anterior
          if (data.cambioVsMesAnterior > 30) {
            generatedAlerts.push({
              id: 'spending-spike',
              type: 'warning',
              title: 'Aumento de gastos',
              message: `Gastas ${data.cambioVsMesAnterior.toFixed(0)}% más que el mes pasado. Revisa qué cambió.`,
              action: 'Ver categorías',
              actionRoute: '/analisis',
              dismissible: true
            });
          }

          // Alerta: Categoría con aumento anormal
          Object.entries(data.porCategoria).forEach(([cat, vals]: [string, any]) => {
            if (vals.anterior > 500 && vals.actual > vals.anterior * 2) {
              generatedAlerts.push({
                id: `category-spike-${cat}`,
                type: 'info',
                title: `${categoriaLabels[cat] || cat} duplicó`,
                message: `Esta categoría pasó de ${formatMoney(vals.anterior)} a ${formatMoney(vals.actual)}.`,
                action: 'Ver análisis',
                actionRoute: '/analisis',
                dismissible: true
              });
            }
          });

          // Alerta: Buen progreso
          if (data.cambioVsMesAnterior < -15) {
            generatedAlerts.push({
              id: 'spending-decrease',
              type: 'success',
              title: '¡Buen trabajo!',
              message: `Redujiste gastos ${Math.abs(data.cambioVsMesAnterior).toFixed(0)}% vs mes pasado.`,
              dismissible: true
            });
          }

          // Alerta: Deuda casi libre
          if (data.proyeccionDeuda.mesesRestantes <= 6) {
            generatedAlerts.push({
              id: 'debt-almost-free',
              type: 'success',
              title: '¡Libertad financiera cerca!',
              message: `Solo ${data.proyeccionDeuda.mesesRestantes} meses para estar libre de deudas.`,
              action: 'Ver progreso',
              actionRoute: '/deudas',
              dismissible: true
            });
          }

          // Alerta: Día del mes (si quedan pocos días y mucho presupuesto)
          const diaActual = new Date().getDate();
          const diasEnMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
          const diasRestantes = diasEnMes - diaActual;

          if (diasRestantes <= 5 && data.disponible > data.presupuesto * 0.3) {
            generatedAlerts.push({
              id: 'budget-surplus',
              type: 'info',
              title: 'Presupuesto sobrante',
              message: `Quedan ${diasRestantes} días y ${formatMoney(data.disponible)}. ¿Abonar a deudas?`,
              action: 'Simular pago',
              actionRoute: '/deudas',
              dismissible: true
            });
          }

          setAlerts(generatedAlerts);
        }
      } catch (e) {
        console.error('Error fetching alerts:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const dismissAlert = (id: string) => {
    setDismissed(prev => [...prev, id]);
  };

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id));

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="h-6 bg-white/10 rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-16 bg-white/10 rounded-xl" />
          <div className="h-16 bg-white/10 rounded-xl" />
        </div>
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Todo en orden</h3>
            <p className="text-sm text-white/50">No hay alertas activas</p>
          </div>
        </div>
        <p className="text-white/60 text-sm text-center py-4">
          Tus finanzas están bajo control. ¡Sigue así!
        </p>
      </div>
    );
  }

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          icon: AlertTriangle,
          iconColor: 'text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30',
          icon: AlertTriangle,
          iconColor: 'text-yellow-400'
        };
      case 'success':
        return {
          bg: 'bg-green-500/10 border-green-500/30',
          icon: CheckCircle,
          iconColor: 'text-green-400'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          icon: Zap,
          iconColor: 'text-blue-400'
        };
    }
  };

  return (
    <div className="glass-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Alertas Inteligentes</h3>
          <p className="text-sm text-white/50">{visibleAlerts.length} alertas activas</p>
        </div>
      </div>

      <div className="space-y-3">
        {visibleAlerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          const Icon = styles.icon;

          return (
            <div
              key={alert.id}
              className={`relative p-4 rounded-xl border ${styles.bg} animate-in fade-in duration-300`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{alert.title}</p>
                  <p className="text-white/60 text-sm mt-1">{alert.message}</p>
                  {alert.action && (
                    <button
                      onClick={() => handleAlertAction(alert)}
                      className={`mt-2 text-xs font-medium ${styles.iconColor} hover:underline cursor-pointer`}
                    >
                      {alert.action} →
                    </button>
                  )}
                </div>
                {alert.dismissible && (
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
