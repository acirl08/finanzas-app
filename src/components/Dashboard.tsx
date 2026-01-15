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
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, ReferenceLine } from 'recharts';
import PresupuestosPersonales from './PresupuestosPersonales';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Sparkline component for mini trend charts
function Sparkline({ data, color, height = 30 }: { data: number[], color: string, height?: number }) {
  const chartData = data.map((value, index) => ({ value, index }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Change indicator component
function ChangeIndicator({ value, isPositive, suffix = '' }: { value: string, isPositive: boolean, suffix?: string }) {
  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-[#6EE7B7]' : 'text-[#F87171]'}`}>
      {isPositive ? (
        <ArrowUpRight className="w-4 h-4" />
      ) : (
        <ArrowDownRight className="w-4 h-4" />
      )}
      <span>{value}{suffix}</span>
    </div>
  );
}

// Data for charts - Updated colors to match new palette
const monthlyData = [
  { name: 'Ene', pagado: 38450, deuda: 452892, proyectado: 38450 },
  { name: 'Feb', pagado: 76900, deuda: 414442, proyectado: 76900 },
  { name: 'Mar', pagado: 115350, deuda: 375992, proyectado: 115350 },
  { name: 'Abr', pagado: 153800, deuda: 337542, proyectado: 153800 },
  { name: 'May', pagado: 192250, deuda: 299092, proyectado: 192250 },
  { name: 'Jun', pagado: 230700, deuda: 260642, proyectado: 230700 },
  { name: 'Jul', pagado: null, deuda: null, proyectado: 269150 },
  { name: 'Ago', pagado: null, deuda: null, proyectado: 307600 },
  { name: 'Sep', pagado: null, deuda: null, proyectado: 346050 },
  { name: 'Oct', pagado: null, deuda: null, proyectado: 384500 },
  { name: 'Nov', pagado: null, deuda: null, proyectado: 422950 },
  { name: 'Dic', pagado: null, deuda: null, proyectado: 461400 },
];

// Sparkline data for different metrics
const deudaSparkline = [491442, 475000, 460000, 445000, 430000, 420000];
const ingresoSparkline = [109000, 109000, 109000, 109000, 109000, 109000];
const gastosSparkline = [62000, 63500, 64000, 64200, 64550, 64550];
const disponibleSparkline = [35000, 36500, 37000, 38000, 38450, 38450];

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
              <MoreHorizontal className="w-4 h-4 text-[#6B7280] cursor-pointer hover:text-white transition-colors" />
            </div>
            <p className="text-xs text-[#6B7280] mb-2">Combinado Ale + Ricardo</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-[#6EE7B7] tracking-tight">
                  +{formatMoney(INGRESO_MENSUAL)}
                </p>
                <ChangeIndicator value="Estable" isPositive={true} />
              </div>
              <div className="w-20 h-8">
                <Sparkline data={ingresoSparkline} color="#6EE7B7" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F87171]" />
                <span className="text-sm text-[#9CA3AF]">Gastos Fijos</span>
                <span className="text-[#6B7280] text-sm">/ $</span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-[#6B7280] cursor-pointer hover:text-white transition-colors" />
            </div>
            <p className="text-xs text-[#6B7280] mb-2">Renta, carro, servicios, subs</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-[#F87171] tracking-tight">
                  -{formatMoney(gastosFijosTotal)}
                </p>
                <ChangeIndicator value="+$550" isPositive={false} suffix=" vs mes ant." />
              </div>
              <div className="w-20 h-8">
                <Sparkline data={gastosSparkline} color="#F87171" />
              </div>
            </div>
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

          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">
                {formatMoney(disponible)}
              </p>
              <ChangeIndicator value="+$450" isPositive={true} suffix=" vs mes ant." />
            </div>
            <div className="w-24 h-10">
              <Sparkline data={disponibleSparkline} color="#8B5CF6" />
            </div>
          </div>

          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill progress-purple"
              style={{ width: `${totales.porcentajePagado}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-[#6B7280]">{totales.porcentajePagado.toFixed(1)}% de la meta anual</p>
            <p className="text-xs text-[#8B5CF6]">Meta: $461,400</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Flow Chart - Enhanced with projections */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#6EE7B7]" />
              <span className="font-semibold text-white">Progreso de Pago</span>
              <span className="text-[#6B7280] text-sm">/ $</span>
            </div>
            <div className="nav-pill">
              <span className="nav-pill-item active">2026</span>
              <span className="nav-pill-item">Detalle</span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mb-2">Pagos acumulados vs proyección anual</p>

          {/* Summary metrics above chart */}
          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-xs text-[#6B7280]">Pagado YTD</p>
              <p className="text-lg font-bold text-[#6EE7B7]">{formatMoney(230700)}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Meta Dic 2026</p>
              <p className="text-lg font-bold text-white">{formatMoney(461400)}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">% Completado</p>
              <p className="text-lg font-bold text-[#8B5CF6]">50%</p>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorPagado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6EE7B7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6EE7B7" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorProyectado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: '#161B22',
                    border: '1px solid #30363D',
                    borderRadius: '12px',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                  formatter={(value, name) => {
                    if (value === null || value === undefined) return ['—', name === 'pagado' ? 'Pagado' : 'Proyectado'];
                    return [formatMoney(Number(value)), name === 'pagado' ? 'Pagado' : 'Proyectado'];
                  }}
                />
                {/* Projected area (full year) */}
                <Area
                  type="monotone"
                  dataKey="proyectado"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorProyectado)"
                />
                {/* Actual payments area */}
                <Area
                  type="monotone"
                  dataKey="pagado"
                  stroke="#6EE7B7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPagado)"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-[#30363D]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#6EE7B7]" />
              <span className="text-xs text-[#9CA3AF]">Pagado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#8B5CF6]" style={{ borderStyle: 'dashed', borderWidth: '1px', borderColor: '#8B5CF6', background: 'transparent' }} />
              <span className="text-xs text-[#9CA3AF]">Proyectado</span>
            </div>
            <div className="ml-auto">
              <span className="text-xs text-[#6B7280]">Actualizado: Ene 2026</span>
            </div>
          </div>
        </div>

        {/* Expense Split - Enhanced with tooltip and amounts */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              <span className="font-semibold text-white">Distribución de Gastos</span>
              <span className="text-[#6B7280] text-sm">/ %</span>
            </div>
            <span className="text-[#6B7280] text-sm">Ene 2026</span>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">Desglose mensual de gastos fijos</p>

          <div className="flex items-center gap-6">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="transition-all duration-200 hover:opacity-80"
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#161B22',
                      border: '1px solid #30363D',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                    formatter={(value: number, name: string) => [formatMoney(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <p className="text-xs text-[#6B7280]">Total</p>
                <p className="text-xl font-bold text-white">$64.5k</p>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {expenseData.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1C2128] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full transition-transform group-hover:scale-110" style={{ background: item.color }} />
                    <span className="text-sm text-[#9CA3AF] group-hover:text-white transition-colors">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">
                      {formatMoney(item.value)}
                    </span>
                    <span className="text-xs text-[#6B7280] ml-2">
                      {Math.round((item.value / 64550) * 100)}%
                    </span>
                  </div>
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
