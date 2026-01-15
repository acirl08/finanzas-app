'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Info,
  Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { deudasIniciales, suscripciones, INGRESO_MENSUAL, calcularTotales, calcularGastosFijos } from '@/lib/data';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Data
const deudaPorMes = [
  { mes: 'Ene', deuda: 491442, pagado: 0 },
  { mes: 'Feb', deuda: 452992, pagado: 38450 },
  { mes: 'Mar', deuda: 414542, pagado: 76900 },
  { mes: 'Abr', deuda: 376092, pagado: 115350 },
  { mes: 'May', deuda: 337642, pagado: 153800 },
  { mes: 'Jun', deuda: 299192, pagado: 192250 },
  { mes: 'Jul', deuda: 260742, pagado: 230700 },
  { mes: 'Ago', deuda: 222292, pagado: 269150 },
  { mes: 'Sep', deuda: 183842, pagado: 307600 },
  { mes: 'Oct', deuda: 145392, pagado: 346050 },
  { mes: 'Nov', deuda: 106942, pagado: 384500 },
  { mes: 'Dic', deuda: 68492, pagado: 422950 },
];

const distribucionDeuda = [
  { name: 'Alejandra', value: 267302, color: '#8b5cf6' },
  { name: 'Ricardo', value: 132373, color: '#3b82f6' },
  { name: 'Crédito Personal', value: 91767, color: '#10b981' },
];

const deudaPorTipo = [
  { tipo: 'TC Alta (>100% CAT)', monto: 60482, color: '#ef4444' },
  { tipo: 'TC Media (60-100%)', monto: 168547, color: '#f59e0b' },
  { tipo: 'TC Baja (<60%)', monto: 170646, color: '#10b981' },
  { tipo: 'Crédito Personal', monto: 91767, color: '#3b82f6' },
];

const gastosCategoria = [
  { categoria: 'Pagos deuda', monto: 32099, porcentaje: 49.7 },
  { categoria: 'Renta', monto: 12700, porcentaje: 19.7 },
  { categoria: 'Carro', monto: 13000, porcentaje: 20.1 },
  { categoria: 'Servicios', monto: 3200, porcentaje: 5.0 },
  { categoria: 'Suscripciones', monto: 3551, porcentaje: 5.5 },
];

export default function AnalisisPage() {
  const totales = calcularTotales(deudasIniciales);
  const gastosFijosTotal = calcularGastosFijos();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Análisis Financiero</h1>
          <p className="text-white/50 text-sm">Métricas detalladas de tu situación financiera</p>
        </div>
        <div className="text-sm text-white/40">
          Plan 2026
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deuda */}
        <div className="glass-card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-white/40" />
              <span className="text-white/60 text-sm">Deuda Total</span>
              <span className="text-white/40">/ $M</span>
            </div>
            <button className="p-1 hover:bg-white/10 rounded">
              <MoreHorizontal className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <p className="text-xs text-white/40 mb-2">Suma de todas las deudas activas</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-white">491,442</span>
            <div className="flex items-center gap-1 text-red-400 text-sm mb-1">
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <ArrowDownRight className="w-3 h-3" />
              </div>
              <span>-0%</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs text-white/50">Alejandra</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-white/50">Ricardo</span>
            </div>
          </div>
        </div>

        {/* Deudas por CAT */}
        <div className="glass-card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-white/40" />
              <span className="text-white/60 text-sm">Distribución CAT</span>
              <span className="text-white/40">/ %</span>
            </div>
            <button className="p-1 hover:bg-white/10 rounded">
              <Info className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <p className="text-xs text-white/40 mb-3">Deudas agrupadas por nivel de interés</p>

          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deudaPorTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={22}
                    outerRadius={35}
                    paddingAngle={2}
                    dataKey="monto"
                  >
                    {deudaPorTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white">4</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              {deudaPorTipo.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-white/60 truncate max-w-[100px]">{item.tipo}</span>
                  </div>
                  <span className="text-white/80">{Math.round((item.monto / 491442) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pagado vs Pendiente */}
        <div className="glass-card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white/40" />
              <span className="text-white/60 text-sm">Pagado vs Pendiente</span>
              <span className="text-white/40">/ $M</span>
            </div>
            <button className="p-1 hover:bg-white/10 rounded">
              <MoreHorizontal className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <p className="text-xs text-white/40 mb-2">Progreso del plan de pagos</p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Pagado</span>
                <span className="text-green-400 font-medium">{formatMoney(totales.deudaPagada)}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                  style={{ width: `${totales.porcentajePagado}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Pendiente</span>
                <span className="text-red-400 font-medium">{formatMoney(totales.deudaTotal)}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                  style={{ width: `${100 - totales.porcentajePagado}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Disponible Mensual */}
        <div className="glass-card bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-white/80 text-sm">Poder de Pago</span>
            </div>
            <span className="badge badge-success text-xs">Activo</span>
          </div>
          <p className="text-xs text-white/50 mb-2">Disponible mensual para atacar deuda</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">38,450</span>
            <span className="text-lg text-white/60">$</span>
          </div>
          <p className="text-xs text-purple-300 mt-2">
            En 12 meses = {formatMoney(38450 * 12)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyección de Deuda */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Proyección de Deuda</h3>
              <span className="text-white/40 text-sm">/ $M</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-white/10 rounded">
                <MoreHorizontal className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deudaPorMes}>
                <defs>
                  <linearGradient id="colorDeuda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPagado2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,15,26,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                  formatter={(value: number) => formatMoney(value)}
                />
                <Area
                  type="monotone"
                  dataKey="deuda"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDeuda)"
                  name="Deuda restante"
                />
                <Area
                  type="monotone"
                  dataKey="pagado"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPagado2)"
                  name="Total pagado"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-white/60">Deuda restante</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-white/60">Total pagado</span>
            </div>
          </div>
        </div>

        {/* Redistribución por Programa */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Distribución de Gastos</h3>
              <span className="text-white/40 text-sm">/ $M</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-white/10 rounded">
                <MoreHorizontal className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-white/40 mb-1">Total gastos fijos</p>
              <p className="text-2xl font-bold text-white">{formatMoney(gastosFijosTotal).replace('$', '')}</p>
              <p className="text-xs text-white/40">mensual</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-white/40 mb-1">Ingreso</p>
              <p className="text-2xl font-bold text-green-400">{formatMoney(INGRESO_MENSUAL).replace('$', '')}</p>
              <p className="text-xs text-white/40">mensual</p>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gastosCategoria} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,15,26,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                  formatter={(value: number) => formatMoney(value)}
                />
                <Bar
                  dataKey="monto"
                  fill="#8b5cf6"
                  radius={[0, 6, 6, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de Deudas Detallada */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Deudas Detalladas</h3>
            <span className="text-white/40 text-sm">{deudasIniciales.length} deudas</span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-4 gap-2 pb-3 border-b border-white/10 text-xs text-white/40">
            <span>Tarjeta</span>
            <span className="text-right">Saldo</span>
            <span className="text-right">CAT</span>
            <span className="text-right">Pagado %</span>
          </div>

          {/* Table Body */}
          <div className="space-y-2 mt-2 max-h-[400px] overflow-y-auto">
            {deudasIniciales.map((deuda, i) => {
              const porcentaje = ((deuda.saldoInicial - deuda.saldoActual) / deuda.saldoInicial) * 100;
              return (
                <div key={i} className="grid grid-cols-4 gap-2 py-2 items-center text-sm hover:bg-white/5 rounded-lg px-2 -mx-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      deuda.cat > 100 ? 'bg-red-500' :
                      deuda.cat > 60 ? 'bg-orange-500' : 'bg-green-500'
                    }`} />
                    <span className="text-white truncate">{deuda.nombre}</span>
                  </div>
                  <span className="text-right text-white/80">{formatMoney(deuda.saldoActual)}</span>
                  <span className={`text-right ${
                    deuda.cat > 100 ? 'text-red-400' :
                    deuda.cat > 60 ? 'text-orange-400' : 'text-green-400'
                  }`}>{deuda.cat}%</span>
                  <span className="text-right text-white/60">{porcentaje.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ahorro en Intereses */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Impacto del Plan Avalancha</h3>
            <span className="badge badge-success">Optimizado</span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60">Ahorro estimado en intereses</span>
                <Info className="w-4 h-4 text-white/40" />
              </div>
              <p className="text-3xl font-bold text-green-400">~$180,000</p>
              <p className="text-xs text-white/40 mt-1">vs pagar solo mínimos</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-white/40 mb-1">Tiempo estimado</p>
                <p className="text-xl font-bold text-white">11 meses</p>
                <p className="text-xs text-green-400">para liquidar TC</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-white/40 mb-1">Si pagaras mínimos</p>
                <p className="text-xl font-bold text-white">8+ años</p>
                <p className="text-xs text-red-400">mucho más interés</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-white/60 mb-3">Próximas deudas a liquidar</p>
              <div className="space-y-2">
                {deudasIniciales.slice(0, 3).map((deuda, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-purple-500' : 'bg-white/10'
                      }`}>{i + 1}</span>
                      <span className="text-sm text-white">{deuda.nombre}</span>
                    </div>
                    <span className="text-sm text-white/60">{formatMoney(deuda.saldoActual)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
