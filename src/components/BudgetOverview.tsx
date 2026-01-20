'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Wallet, Sparkles, AlertTriangle, ShieldAlert } from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import {
  PRESUPUESTO_DESPENSA,
  PRESUPUESTO_ESENCIALES,
  PRESUPUESTO_GUSTOS,
  PRESUPUESTO_IMPREVISTOS,
  presupuestosPersonales,
  categoriasVales,
  categoriasEsenciales,
  categoriasGustos,
  categoriaLabels,
} from '@/lib/data';
import { formatMoney } from '@/lib/utils';

interface BudgetCardProps {
  title: string;
  icon: React.ReactNode;
  presupuesto: number;
  gastado: number;
  color: string;
  bgGradient: string;
  detalles?: { label: string; gastado: number; presupuesto?: number }[];
  tipo: 'vales' | 'esencial' | 'gusto';
}

function BudgetCard({ title, icon, presupuesto, gastado, color, bgGradient, detalles, tipo }: BudgetCardProps) {
  const restante = presupuesto - gastado;
  const porcentaje = Math.min((gastado / presupuesto) * 100, 100);

  const getStatus = () => {
    if (porcentaje >= 100) return { text: 'Agotado', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (porcentaje >= 80) return { text: 'Cuidado', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { text: 'Bien', color: 'text-green-400', bg: 'bg-green-500/20' };
  };

  const status = getStatus();

  return (
    <div className={`glass-card overflow-hidden`}>
      {/* Header con gradiente */}
      <div className={`-mx-6 -mt-6 mb-4 p-4 bg-gradient-to-r ${bgGradient}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-xs text-white/60">
                {tipo === 'vales' ? 'Vales de despensa' : tipo === 'esencial' ? 'Necesidades' : 'No esencial'}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
            {status.text}
          </div>
        </div>
      </div>

      {/* Números principales */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs text-white/50 mb-1">Gastado</p>
            <p className="text-2xl font-bold text-white">{formatMoney(gastado)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50 mb-1">Presupuesto</p>
            <p className="text-lg text-white/70">{formatMoney(presupuesto)}</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              porcentaje >= 100 ? 'bg-red-500' :
              porcentaje >= 80 ? 'bg-yellow-500' :
              'bg-gradient-to-r from-green-500 to-emerald-400'
            }`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>

        {/* Restante */}
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-white/50">{porcentaje.toFixed(0)}% usado</span>
          <span className={restante >= 0 ? 'text-green-400' : 'text-red-400'}>
            {restante >= 0 ? `Te quedan ${formatMoney(restante)}` : `Excedido por ${formatMoney(Math.abs(restante))}`}
          </span>
        </div>
      </div>

      {/* Detalles por categoría o persona */}
      {detalles && detalles.length > 0 && (
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-white/40 mb-3">Desglose</p>
          <div className="space-y-2">
            {detalles.map((detalle, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-white/70">{detalle.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{formatMoney(detalle.gastado)}</span>
                  {detalle.presupuesto && (
                    <span className="text-xs text-white/40">/ {formatMoney(detalle.presupuesto)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BudgetOverview() {
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

  // Calcular gastos por tipo
  const gastosVales = gastosDelMes
    .filter(g => categoriasVales.includes(g.categoria))
    .reduce((sum, g) => sum + g.monto, 0);

  // Esenciales SIN imprevistos (los imprevistos van aparte)
  const gastosEsenciales = gastosDelMes
    .filter(g => categoriasEsenciales.includes(g.categoria) && g.categoria !== 'imprevistos')
    .reduce((sum, g) => sum + g.monto, 0);

  // Imprevistos - fondo separado
  const gastosImprevistos = gastosDelMes
    .filter(g => g.categoria === 'imprevistos')
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosGustos = gastosDelMes
    .filter(g => categoriasGustos.includes(g.categoria))
    .reduce((sum, g) => sum + g.monto, 0);

  // Detalles de vales por categoría
  const detallesVales = categoriasVales.map(cat => ({
    label: categoriaLabels[cat] || cat,
    gastado: gastosDelMes.filter(g => g.categoria === cat).reduce((sum, g) => sum + g.monto, 0),
  })).filter(d => d.gastado > 0);

  // Detalles de esenciales por categoría (sin imprevistos)
  const detallesEsenciales = categoriasEsenciales
    .filter(cat => cat !== 'imprevistos')
    .map(cat => ({
      label: categoriaLabels[cat] || cat,
      gastado: gastosDelMes.filter(g => g.categoria === cat).reduce((sum, g) => sum + g.monto, 0),
    })).filter(d => d.gastado > 0);

  // Detalles de imprevistos (lista de gastos individuales)
  const detallesImprevistos = gastosDelMes
    .filter(g => g.categoria === 'imprevistos')
    .map(g => ({
      label: g.descripcion || 'Imprevisto',
      gastado: g.monto,
    }));

  // Detalles de gustos por persona
  const gustosAle = gastosDelMes
    .filter(g => categoriasGustos.includes(g.categoria) && g.titular === 'alejandra')
    .reduce((sum, g) => sum + g.monto, 0);

  const gustosRicardo = gastosDelMes
    .filter(g => categoriasGustos.includes(g.categoria) && g.titular === 'ricardo')
    .reduce((sum, g) => sum + g.monto, 0);

  const gustosCompartido = gastosDelMes
    .filter(g => categoriasGustos.includes(g.categoria) && g.titular === 'compartido')
    .reduce((sum, g) => sum + g.monto, 0);

  const detallesGustos = [
    { label: 'Ale', gastado: gustosAle, presupuesto: presupuestosPersonales.alejandra },
    { label: 'Ricardo', gastado: gustosRicardo, presupuesto: presupuestosPersonales.ricardo },
    { label: 'Juntos', gastado: gustosCompartido, presupuesto: presupuestosPersonales.compartido },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card animate-pulse">
            <div className="h-20 bg-white/5 rounded-xl mb-4" />
            <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
            <div className="h-8 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Tu Presupuesto del Mes</h2>
        <span className="text-sm text-white/40">
          {today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Vales de Despensa */}
        <BudgetCard
          title="Despensa"
          icon={<ShoppingCart className="w-5 h-5 text-white" />}
          presupuesto={PRESUPUESTO_DESPENSA}
          gastado={gastosVales}
          color="bg-gradient-to-br from-orange-500 to-amber-500"
          bgGradient="from-orange-500/20 to-amber-500/10"
          detalles={detallesVales.length > 0 ? detallesVales : undefined}
          tipo="vales"
        />

        {/* Gastos Esenciales */}
        <BudgetCard
          title="Esenciales"
          icon={<Wallet className="w-5 h-5 text-white" />}
          presupuesto={PRESUPUESTO_ESENCIALES}
          gastado={gastosEsenciales}
          color="bg-gradient-to-br from-blue-500 to-cyan-500"
          bgGradient="from-blue-500/20 to-cyan-500/10"
          detalles={detallesEsenciales.length > 0 ? detallesEsenciales : undefined}
          tipo="esencial"
        />

        {/* Gustos */}
        <BudgetCard
          title="Gustos"
          icon={<Sparkles className="w-5 h-5 text-white" />}
          presupuesto={PRESUPUESTO_GUSTOS}
          gastado={gastosGustos}
          color="bg-gradient-to-br from-purple-500 to-pink-500"
          bgGradient="from-purple-500/20 to-pink-500/10"
          detalles={detallesGustos}
          tipo="gusto"
        />

        {/* Fondo de Imprevistos */}
        <BudgetCard
          title="Imprevistos"
          icon={<ShieldAlert className="w-5 h-5 text-white" />}
          presupuesto={PRESUPUESTO_IMPREVISTOS}
          gastado={gastosImprevistos}
          color="bg-gradient-to-br from-red-500 to-orange-500"
          bgGradient="from-red-500/20 to-orange-500/10"
          detalles={detallesImprevistos.length > 0 ? detallesImprevistos : undefined}
          tipo="esencial"
        />
      </div>

      {/* Resumen rápido */}
      <div className="glass-card-dark p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-white/40">Total gastado</p>
              <p className="text-lg font-bold text-white">
                {formatMoney(gastosVales + gastosEsenciales + gastosGustos + gastosImprevistos)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40">Presupuesto total</p>
              <p className="text-lg font-bold text-white/70">
                {formatMoney(PRESUPUESTO_DESPENSA + PRESUPUESTO_ESENCIALES + PRESUPUESTO_GUSTOS + PRESUPUESTO_IMPREVISTOS)}
              </p>
            </div>
            {gastosImprevistos > 0 && (
              <div>
                <p className="text-xs text-red-400/70">Usado de imprevistos</p>
                <p className="text-lg font-bold text-red-400">
                  {formatMoney(gastosImprevistos)}
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">Te queda</p>
            <p className={`text-lg font-bold ${
              (PRESUPUESTO_DESPENSA + PRESUPUESTO_ESENCIALES + PRESUPUESTO_GUSTOS + PRESUPUESTO_IMPREVISTOS) - (gastosVales + gastosEsenciales + gastosGustos + gastosImprevistos) >= 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {formatMoney(
                (PRESUPUESTO_DESPENSA + PRESUPUESTO_ESENCIALES + PRESUPUESTO_GUSTOS + PRESUPUESTO_IMPREVISTOS) -
                (gastosVales + gastosEsenciales + gastosGustos + gastosImprevistos)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
