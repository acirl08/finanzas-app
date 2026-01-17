'use client';

import { useState, useEffect } from 'react';
import GastoForm from '@/components/GastoForm';
import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE } from '@/lib/data';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function RegistrarPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filtrar gastos del mes actual
  const today = new Date();
  const mesActual = today.toISOString().slice(0, 7);
  const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesActual));
  const totalGastado = gastosDelMes.reduce((sum, g) => sum + g.monto, 0);
  const restante = PRESUPUESTO_VARIABLE - totalGastado;
  const porcentaje = Math.min((totalGastado / PRESUPUESTO_VARIABLE) * 100, 100);

  // Calcular gastos por categoría
  const gastosPorCategoria = gastosDelMes.reduce((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + g.monto;
    return acc;
  }, {} as Record<string, number>);

  const categoriasOrdenadas = Object.entries(gastosPorCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const categoryColors: Record<string, string> = {
    comida: 'bg-orange-500',
    transporte: 'bg-blue-500',
    entretenimiento: 'bg-purple-500',
    salud: 'bg-green-500',
    ropa: 'bg-pink-500',
    hogar: 'bg-yellow-500',
    servicios: 'bg-indigo-500',
    otros: 'bg-gray-500',
  };

  // Determinar color del progreso
  const getProgressColor = () => {
    if (porcentaje >= 100) return 'progress-red';
    if (porcentaje >= 70) return 'progress-purple';
    return 'progress-green';
  };

  // Tips rotativos dinámicos
  const tips = [
    {
      text: "Registra tus gastos inmediatamente después de hacerlos. Esto te ayudará a ser más consciente de tu dinero.",
      stat: gastosDelMes.length > 0 ? `Ya registraste ${gastosDelMes.length} gastos este mes` : null,
    },
    {
      text: "Antes de comprar algo, espera 24 horas. Si aún lo quieres mañana, considera comprarlo.",
      stat: restante > 0 ? `Aún te quedan ${formatMoney(restante)} del mes` : null,
    },
    {
      text: "Los gastos pequeños se acumulan. Un café de $80 al día son $2,400 al mes.",
      stat: null,
    },
    {
      text: "Pregúntate: ¿Esto me acerca o me aleja de mi meta de libertad financiera?",
      stat: null,
    },
    {
      text: "Cada peso que no gastas hoy es un peso más para salir de deudas.",
      stat: totalGastado > 0 ? `Este mes has gastado ${formatMoney(totalGastado)}` : null,
    },
    {
      text: "Usa efectivo para gastos variables. Es más fácil controlar lo que ves.",
      stat: null,
    },
    {
      text: "Distingue entre necesidad y deseo. ¿Realmente lo necesitas o solo lo quieres?",
      stat: null,
    },
  ];

  // Seleccionar tip basado en el día
  const tipIndex = today.getDate() % tips.length;
  const currentTip = tips[tipIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Registrar Gasto</h1>
        <p className="text-white/50">Lleva el control de cada peso que gastas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <GastoForm />
        </div>

        {/* Tips Sidebar */}
        <div className="space-y-4">
          {/* Tip Card - Rotativo */}
          <div className="glass-card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Tip del día</h3>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              {currentTip.text}
            </p>
            {currentTip.stat && (
              <p className="text-xs text-purple-400 mt-3 font-medium">
                {currentTip.stat}
              </p>
            )}
          </div>

          {/* Meta Card - Datos reales de Firebase */}
          <div className="glass-card-dark">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-white">Tu meta mensual</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/50">Gastos variables</span>
                  <span className="text-white">
                    {loading ? '...' : `${formatMoney(totalGastado)} / ${formatMoney(PRESUPUESTO_VARIABLE)}`}
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className={`progress-bar-fill ${getProgressColor()}`}
                    style={{ width: loading ? '0%' : `${porcentaje}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-white/40">
                {loading ? 'Cargando...' : restante >= 0
                  ? `Te quedan ${formatMoney(restante)} para el resto del mes`
                  : `Te pasaste por ${formatMoney(Math.abs(restante))}`
                }
              </p>
            </div>
          </div>

          {/* Warning Card */}
          <div className="glass-card border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold text-yellow-400">Recordatorio</h3>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Estamos en modo ahorro. Evita usar las tarjetas de crédito
              excepto para gastos absolutamente necesarios.
            </p>
          </div>

          {/* Categories Quick Stats - Datos reales */}
          <div className="glass-card">
            <h3 className="font-semibold text-white mb-4">Gastos por categoría</h3>
            {loading ? (
              <p className="text-sm text-white/40">Cargando...</p>
            ) : categoriasOrdenadas.length > 0 ? (
              <div className="space-y-3">
                {categoriasOrdenadas.map(([categoria, amount]) => {
                  const percent = totalGastado > 0 ? (amount / totalGastado) * 100 : 0;
                  return (
                    <div key={categoria} className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${categoryColors[categoria] || 'bg-gray-500'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70 capitalize">{categoria}</span>
                          <span className="text-white font-medium">{formatMoney(amount)}</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full mt-1">
                          <div
                            className={`h-full rounded-full ${categoryColors[categoria] || 'bg-gray-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-white/40">Sin gastos este mes</p>
                <p className="text-xs text-white/30 mt-1">Registra tu primer gasto</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
