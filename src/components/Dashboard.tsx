'use client';

import { useState } from 'react';
import { Deuda } from '@/types';
import { deudasIniciales, calcularTotales, calcularDisponible, calcularGastosFijos, INGRESO_MENSUAL, suscripciones } from '@/lib/data';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Wallet,
  RefreshCw,
  Plus,
  ChevronRight,
  Zap,
  Target,
  Calendar
} from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Data for charts
const monthlyData = [
  { name: 'Ene', pagado: 38450, deuda: 360243 },
  { name: 'Feb', pagado: 76900, deuda: 304750 },
  { name: 'Mar', pagado: 115350, deuda: 266300 },
  { name: 'Abr', pagado: 153800, deuda: 231467 },
  { name: 'May', pagado: 192250, deuda: 193017 },
  { name: 'Jun', pagado: 230700, deuda: 147060 },
];

const expenseData = [
  { name: 'Deudas', value: 32099, color: '#ef4444' },
  { name: 'Renta', value: 12700, color: '#8b5cf6' },
  { name: 'Carro', value: 13000, color: '#3b82f6' },
  { name: 'Servicios', value: 3200, color: '#f59e0b' },
  { name: 'Subs', value: 3551, color: '#10b981' },
];

export default function Dashboard() {
  const [deudas] = useState<Deuda[]>(deudasIniciales);
  const totales = calcularTotales(deudas);
  const disponible = calcularDisponible(deudas);
  const gastosFijosTotal = calcularGastosFijos();

  const deudasActivas = deudas.filter(d => !d.liquidada).sort((a, b) => a.prioridad - b.prioridad);

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Balance Card */}
        <div className="balance-card lg:col-span-1">
          <p className="text-white/80 text-sm mb-2">Deuda Total</p>
          <h2 className="text-4xl font-bold text-white mb-1">
            {formatMoney(totales.deudaTotal).replace('$', '')}
            <span className="text-2xl">$</span>
          </h2>
          <p className="text-white/70 text-sm flex items-center gap-1">
            <TrendingDown className="w-4 h-4" />
            {formatMoney(totales.deudaPagada)} pagados
          </p>

          <div className="flex gap-3 mt-6">
            <button className="btn-secondary bg-white/20 border-white/30 text-white text-sm px-4 py-2">
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Actualizar
            </button>
            <button className="btn-icon bg-white/20 border-white/30">
              <Zap className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Income & Expense Cards */}
        <div className="space-y-4">
          <div className="glass-card">
            <p className="text-white/60 text-sm">Ingreso Mensual</p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              +{formatMoney(INGRESO_MENSUAL)}
            </p>
            <p className="text-xs text-white/40 mt-1">Combinado Ale + Ricardo</p>
          </div>

          <div className="glass-card">
            <p className="text-white/60 text-sm">Gastos Fijos</p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              -{formatMoney(gastosFijosTotal)}
            </p>
            <p className="text-xs text-white/40 mt-1">Renta, carro, servicios, subs</p>
          </div>
        </div>

        {/* Available for Debt */}
        <div className="glass-card-dark">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/60 text-sm">Disponible para Deudas</p>
            <span className="badge badge-success">+Meta</span>
          </div>
          <p className="text-3xl font-bold text-white mb-2">
            {formatMoney(disponible)}
          </p>
          <p className="text-sm text-white/50 mb-4">Cada mes para atacar deudas</p>

          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill progress-green"
              style={{ width: `${totales.porcentajePagado}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2">{totales.porcentajePagado.toFixed(1)}% de la meta</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Flow Chart */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Progreso de Pago</h3>
            <div className="nav-pill">
              <span className="nav-pill-item active">Mensual</span>
              <span className="nav-pill-item">Anual</span>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorPagado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30,30,50,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                  formatter={(value: number) => formatMoney(value)}
                />
                <Area
                  type="monotone"
                  dataKey="pagado"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPagado)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
            {monthlyData.slice(0, 6).map((item, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-white/40">{item.name}</p>
                <p className="text-sm font-semibold text-green-400">+${(item.pagado/1000).toFixed(1)}k</p>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Split */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Distribución de Gastos</h3>
            <span className="text-white/40 text-sm">Ene</span>
          </div>

          <div className="flex items-center gap-8">
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <p className="text-xs text-white/50">Total</p>
                <p className="text-lg font-bold text-white">$64.5k</p>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {expenseData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-sm text-white/70">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {Math.round((item.value / 64550) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Debts & Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deudas Priority List */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Deudas por Prioridad</h3>
              <span className="text-white/40 text-sm">{deudasActivas.length}</span>
            </div>
            <button className="text-purple-400 text-sm hover:text-purple-300 flex items-center gap-1">
              Ver todas <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {deudasActivas.slice(0, 5).map((deuda, index) => {
              const porcentaje = ((deuda.saldoInicial - deuda.saldoActual) / deuda.saldoInicial) * 100;
              const isFirst = index === 0;

              return (
                <div
                  key={deuda.id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isFirst
                      ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    deuda.cat > 100 ? 'bg-red-500' :
                    deuda.cat > 60 ? 'bg-orange-500' :
                    deuda.cat > 40 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
                    #{deuda.prioridad}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{deuda.nombre}</span>
                      <span className="text-xs text-white/40 capitalize">({deuda.titular})</span>
                      {isFirst && <span className="badge badge-danger text-xs">Prioridad</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-white/50">CAT {deuda.cat}%</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full max-w-[100px]">
                        <div
                          className={`h-full rounded-full ${
                            deuda.cat > 100 ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.max(porcentaje, 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-white">{formatMoney(deuda.saldoActual)}</p>
                    <p className="text-xs text-white/40">Min: {formatMoney(deuda.pagoMinimo)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscriptions */}
        <div className="glass-card-dark">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Suscripciones</h3>
              <span className="text-white/40 text-sm">{suscripciones.length}</span>
            </div>
            <button className="text-white/40 text-sm hover:text-white">Manage</button>
          </div>

          {/* Subscription icons row */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['🎵', '🎬', '🎮', '📺', '☁️', '🛒'].map((icon, i) => (
              <div key={i} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg">
                {icon}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {suscripciones.slice(0, 4).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{sub.nombre}</p>
                    <p className="text-xs text-white/40">Próximo: 15 Feb</p>
                  </div>
                </div>
                <p className="font-semibold text-white">{formatMoney(sub.monto)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-white/50">Total mensual</span>
              <span className="text-xl font-bold text-white">
                {formatMoney(suscripciones.reduce((sum, s) => sum + s.monto, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Timeline 2026</h3>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {[
            { mes: 'Ene', deudas: 'Rappi, Nu, Amex Plat', status: 'current' },
            { mes: 'Feb', deudas: 'HEB, Nu Ricardo', status: 'pending' },
            { mes: 'Abr', deudas: 'Santander', status: 'pending' },
            { mes: 'Jun', deudas: 'Amex Gold', status: 'pending' },
            { mes: 'Ago', deudas: 'Banorte', status: 'pending' },
            { mes: 'Nov', deudas: 'BBVA', status: 'pending' },
            { mes: 'Dic', deudas: 'LIBRE!', status: 'goal' },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex-shrink-0 w-32 p-4 rounded-xl text-center ${
                item.status === 'current'
                  ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/50'
                  : item.status === 'goal'
                  ? 'bg-gradient-to-br from-green-500/30 to-emerald-500/30 border border-green-500/50'
                  : 'bg-white/5'
              }`}
            >
              <p className={`text-lg font-bold ${
                item.status === 'current' ? 'text-purple-400' :
                item.status === 'goal' ? 'text-green-400' : 'text-white'
              }`}>{item.mes}</p>
              <p className="text-xs text-white/50 mt-1">{item.deudas}</p>
              {item.status === 'current' && (
                <div className="mt-2">
                  <span className="text-xs bg-purple-500 px-2 py-1 rounded-full">Ahora</span>
                </div>
              )}
              {item.status === 'goal' && (
                <div className="mt-2">
                  <span className="text-xs bg-green-500 px-2 py-1 rounded-full">Meta</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
