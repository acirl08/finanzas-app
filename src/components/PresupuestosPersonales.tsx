'use client';

import { useState, useEffect } from 'react';
import { User, Users, Wallet } from 'lucide-react';
import { presupuestosPersonales, PRESUPUESTO_VARIABLE } from '@/lib/data';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { formatMoney } from '@/lib/utils';

export default function PresupuestosPersonales() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to real-time gastos updates from Firebase
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtrar gastos del mes actual
  const mesActual = new Date().toISOString().slice(0, 7); // "2026-01"
  const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesActual));

  // Solo gastos VARIABLES (no fijos, no vales) afectan el presupuesto de $15,000
  const gastosVariablesDelMes = gastosDelMes.filter(g => !g.esFijo && !g.conVales);

  // Calcular gastos por titular (solo variables)
  const gastosPorTitular = {
    alejandra: gastosVariablesDelMes.filter(g => g.titular === 'alejandra').reduce((sum, g) => sum + g.monto, 0),
    ricardo: gastosVariablesDelMes.filter(g => g.titular === 'ricardo').reduce((sum, g) => sum + g.monto, 0),
    compartido: gastosVariablesDelMes.filter(g => g.titular === 'compartido').reduce((sum, g) => sum + g.monto, 0),
  };

  const presupuestos = [
    {
      nombre: 'Ale',
      titular: 'alejandra',
      presupuesto: presupuestosPersonales.alejandra,
      gastado: gastosPorTitular.alejandra,
      icon: User,
      color: 'pink',
    },
    {
      nombre: 'Ricardo',
      titular: 'ricardo',
      presupuesto: presupuestosPersonales.ricardo,
      gastado: gastosPorTitular.ricardo,
      icon: User,
      color: 'blue',
    },
    {
      nombre: 'Juntos',
      titular: 'compartido',
      presupuesto: presupuestosPersonales.compartido,
      gastado: gastosPorTitular.compartido,
      icon: Users,
      color: 'green',
    },
  ];

  const totalGastado = gastosPorTitular.alejandra + gastosPorTitular.ricardo + gastosPorTitular.compartido;
  const totalRestante = PRESUPUESTO_VARIABLE - totalGastado;

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#252931]" />
            <div>
              <div className="h-4 w-40 bg-[#252931] rounded mb-2" />
              <div className="h-3 w-28 bg-[#252931] rounded" />
            </div>
          </div>
          <div className="text-right">
            <div className="h-6 w-24 bg-[#252931] rounded mb-1" />
            <div className="h-3 w-20 bg-[#252931] rounded" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-white/5 rounded-xl">
              <div className="h-16 bg-[#252931] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Presupuesto para Gustos</h3>
            <p className="text-xs text-white/50">Dinero libre este mes</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${totalRestante >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatMoney(totalRestante)}
          </p>
          <p className="text-xs text-white/40">restante de {formatMoney(PRESUPUESTO_VARIABLE)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {presupuestos.map((p) => {
          const restante = p.presupuesto - p.gastado;
          const porcentaje = Math.min((p.gastado / p.presupuesto) * 100, 100);
          const excedido = p.gastado > p.presupuesto;

          return (
            <div key={p.titular} className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    p.color === 'pink' ? 'bg-pink-500/20' :
                    p.color === 'blue' ? 'bg-blue-500/20' : 'bg-green-500/20'
                  }`}>
                    <p.icon className={`w-4 h-4 ${
                      p.color === 'pink' ? 'text-pink-400' :
                      p.color === 'blue' ? 'text-blue-400' : 'text-green-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-white">{p.nombre}</p>
                    <p className="text-xs text-white/40">
                      Gastado: {formatMoney(p.gastado)} de {formatMoney(p.presupuesto)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${excedido ? 'text-red-400' : 'text-white'}`}>
                    {formatMoney(restante)}
                  </p>
                  <p className="text-xs text-white/40">disponible</p>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    excedido ? 'bg-red-500' :
                    porcentaje > 75 ? 'bg-orange-500' :
                    p.color === 'pink' ? 'bg-pink-500' :
                    p.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>

              {excedido && (
                <p className="text-xs text-red-400 mt-2">
                  Excedido por {formatMoney(p.gastado - p.presupuesto)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/50 text-center">
          Este dinero es para darse gustos sin culpa. Cada quien decide cómo usarlo.
        </p>
      </div>
    </div>
  );
}
