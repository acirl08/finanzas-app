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
  Calendar,
  DollarSign,
  MoreHorizontal,
  Info
} from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import PresupuestosPersonales from './PresupuestosPersonales';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Data for charts - Updated colors to match new palette
const monthlyData = [
  { name: 'Ene', pagado: 38450, deuda: 360243 },
  { name: 'Feb', pagado: 76900, deuda: 304750 },
  { name: 'Mar', pagado: 115350, deuda: 266300 },
  { name: 'Abr', pagado: 153800, deuda: 231467 },
  { name: 'May', pagado: 192250, deuda: 193017 },
  { name: 'Jun', pagado: 230700, deuda: 147060 },
];

const expenseData = [
  { name: 'Deudas', value: 32099, color: '#F87171' },
  { name: 'Renta', value: 12700, color: '#8B5CF6' },
  { name: 'Carro', value: 13000, color: '#60A5FA' },
  { name: 'Servicios', value: 3200, color: '#FBBF24' },
  { name: 'Subs', value: 3551, color: '#6EE7B7' },
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
        <div className="balance-card lg:col-span-1 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <p className="text-white/80 text-sm font-medium">Deuda Total</p>
            <span className="text-white/50 text-sm">/ $</span>
          </div>
          <p className="text-xs text-white/60 mb-3">Suma de todas las deudas activas</p>
          <h2 className="text-4xl font-bold text-white mb-1 tracking-tight">
            {formatMoney(totales.deudaTotal).replace('$', '')}
            <span className="text-2xl ml-1">$</span>
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 text-white/80 text-sm">
              <TrendingDown className="w-4 h-4" />
              <span>{formatMoney(totales.deudaPagada)} pagados</span>
            </div>
          </div>

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
          <div className="glass-card hover-lift">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#6EE7B7]" />
                <span className="text-sm text-[#9CA3AF]">Ingreso Mensual</span>
                <span className="text-[#6B7280] text-sm">/ $</span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-[#6B7280]" />
            </div>
            <p className="text-xs text-[#6B7280] mb-2">Combinado Ale + Ricardo</p>
            <p className="text-2xl font-bold text-[#6EE7B7] tracking-tight">
              +{formatMoney(INGRESO_MENSUAL)}
            </p>
          </div>

          <div className="glass-card hover-lift">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F87171]" />
                <span className="text-sm text-[#9CA3AF]">Gastos Fijos</span>
                <span className="text-[#6B7280] text-sm">/ $</span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-[#6B7280]" />
            </div>
            <p className="text-xs text-[#6B7280] mb-2">Renta, carro, servicios, subs</p>
            <p className="text-2xl font-bold text-[#F87171] tracking-tight">
              -{formatMoney(gastosFijosTotal)}
            </p>
          </div>
        </div>

        {/* Available for Debt */}
        <div className="glass-card hover-lift">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              <span className="text-sm text-[#9CA3AF]">Disponible para Deudas</span>
              <span className="text-[#6B7280] text-sm">/ $</span>
            </div>
            <span className="badge badge-success">+Meta</span>
          </div>
          <p className="text-xs text-[#6B7280] mb-3">Cada mes para atacar deudas</p>
          <p className="text-3xl font-bold text-white mb-4 tracking-tight">
            {formatMoney(disponible)}
          </p>

          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill progress-purple"
              style={{ width: `${totales.porcentajePagado}%` }}
            />
          </div>
          <p className="text-xs text-[#6B7280] mt-2">{totales.porcentajePagado.toFixed(1)}% de la meta</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Flow Chart */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#6EE7B7]" />
              <span className="font-semibold text-white">Progreso de Pago</span>
              <span className="text-[#6B7280] text-sm">/ $</span>
            </div>
            <div className="nav-pill">
              <span className="nav-pill-item active">Mensual</span>
              <span className="nav-pill-item">Anual</span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">Proyección de pagos acumulados en 2026</p>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorPagado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6EE7B7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6EE7B7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: '#161B22',
                    border: '1px solid #30363D',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                  formatter={(value: number) => formatMoney(value)}
                />
                <Area
                  type="monotone"
                  dataKey="pagado"
                  stroke="#6EE7B7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPagado)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between mt-4 pt-4 border-t border-[#30363D]">
            {monthlyData.slice(0, 6).map((item, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-[#6B7280]">{item.name}</p>
                <p className="text-sm font-semibold text-[#6EE7B7]">+${(item.pagado/1000).toFixed(1)}k</p>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Split */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              <span className="font-semibold text-white">Distribución de Gastos</span>
              <span className="text-[#6B7280] text-sm">/ %</span>
            </div>
            <span className="text-[#6B7280] text-sm">Ene</span>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">Desglose mensual de gastos fijos</p>

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
                <p className="text-xs text-[#6B7280]">Total</p>
                <p className="text-lg font-bold text-white">$64.5k</p>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {expenseData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-sm text-[#9CA3AF]">{item.name}</span>
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F87171]" />
              <span className="font-semibold text-white">Deudas por Prioridad</span>
              <span className="text-[#6B7280] text-sm">/ {deudasActivas.length}</span>
            </div>
            <button className="flex items-center gap-1 text-[#8B5CF6] text-sm hover:text-[#A78BFA] transition-colors">
              Ver todas <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">Ordenadas por CAT (método avalancha)</p>

          <div className="space-y-3">
            {deudasActivas.slice(0, 5).map((deuda, index) => {
              const porcentaje = ((deuda.saldoInicial - deuda.saldoActual) / deuda.saldoInicial) * 100;
              const isFirst = index === 0;

              return (
                <div
                  key={deuda.id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isFirst
                      ? 'bg-gradient-to-r from-[#F87171]/20 to-[#FBBF24]/20 border border-[#F87171]/30'
                      : 'bg-[#1C2128] hover:bg-[#252931] border border-transparent hover:border-[#30363D]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    deuda.cat > 100 ? 'bg-[#F87171]' :
                    deuda.cat > 60 ? 'bg-[#FBBF24]' :
                    deuda.cat > 40 ? 'bg-[#FBBF24]' : 'bg-[#6EE7B7]'
                  }`}>
                    #{deuda.prioridad}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{deuda.nombre}</span>
                      <span className="text-xs text-[#6B7280] capitalize">({deuda.titular})</span>
                      {isFirst && <span className="badge badge-danger text-xs">Prioridad</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-[#9CA3AF]">CAT {deuda.cat}%</span>
                      <div className="flex-1 h-1.5 bg-[#252931] rounded-full max-w-[100px]">
                        <div
                          className={`h-full rounded-full ${
                            deuda.cat > 100 ? 'bg-[#F87171]' : 'bg-[#6EE7B7]'
                          }`}
                          style={{ width: `${Math.max(porcentaje, 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-white">{formatMoney(deuda.saldoActual)}</p>
                    <p className="text-xs text-[#6B7280]">Min: {formatMoney(deuda.pagoMinimo)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscriptions */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F472B6]" />
              <span className="font-semibold text-white">Suscripciones</span>
              <span className="text-[#6B7280] text-sm">/ {suscripciones.length}</span>
            </div>
            <button className="text-[#6B7280] text-sm hover:text-white transition-colors">Manage</button>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">Gastos recurrentes mensuales</p>

          {/* Subscription icons row */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['🎵', '🎬', '🎮', '📺', '☁️', '🛒'].map((icon, i) => (
              <div key={i} className="w-10 h-10 rounded-xl bg-[#1C2128] border border-[#30363D] flex items-center justify-center text-lg hover:border-[#484F58] transition-colors">
                {icon}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {suscripciones.slice(0, 4).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1C2128] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{sub.nombre}</p>
                    <p className="text-xs text-[#6B7280]">Próximo: 15 Feb</p>
                  </div>
                </div>
                <p className="font-semibold text-white">{formatMoney(sub.monto)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#30363D]">
            <div className="flex justify-between items-center">
              <span className="text-[#9CA3AF]">Total mensual</span>
              <span className="text-xl font-bold text-white">
                {formatMoney(suscripciones.reduce((sum, s) => sum + s.monto, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Presupuestos Personales */}
      <PresupuestosPersonales />

      {/* Timeline */}
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
          <Calendar className="w-5 h-5 text-[#8B5CF6]" />
          <span className="font-semibold text-white">Timeline 2026</span>
        </div>
        <p className="text-xs text-[#6B7280] mb-6">Tu camino hacia la libertad financiera</p>

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
              className={`flex-shrink-0 w-32 p-4 rounded-xl text-center transition-all hover-lift ${
                item.status === 'current'
                  ? 'bg-gradient-to-br from-[#8B5CF6]/30 to-[#F472B6]/30 border border-[#8B5CF6]/50'
                  : item.status === 'goal'
                  ? 'bg-gradient-to-br from-[#6EE7B7]/30 to-[#34d399]/30 border border-[#6EE7B7]/50'
                  : 'bg-[#1C2128] border border-[#30363D] hover:border-[#484F58]'
              }`}
            >
              <p className={`text-lg font-bold ${
                item.status === 'current' ? 'text-[#8B5CF6]' :
                item.status === 'goal' ? 'text-[#6EE7B7]' : 'text-white'
              }`}>{item.mes}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">{item.deudas}</p>
              {item.status === 'current' && (
                <div className="mt-2">
                  <span className="text-xs bg-[#8B5CF6] px-2 py-1 rounded-full">Ahora</span>
                </div>
              )}
              {item.status === 'goal' && (
                <div className="mt-2">
                  <span className="text-xs bg-[#6EE7B7] text-[#0D1117] px-2 py-1 rounded-full font-semibold">Meta</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
