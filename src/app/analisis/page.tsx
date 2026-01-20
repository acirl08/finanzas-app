'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Info,
  Zap,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import {
  deudasIniciales,
  INGRESO_MENSUAL,
  calcularTotales,
  calcularGastosFijos,
  calcularProyeccionDeudas,
  compararEscenarios,
  gastosFijos,
  suscripciones
} from '@/lib/data';
import { subscribeToDeudas, calcularTotalesFromDeudas } from '@/lib/firestore';
import { Deuda } from '@/types';
import { formatMoney, MESES_CORTOS } from '@/lib/utils';
import GastosPieChart from '@/components/GastosPieChart';
import GastosTrendChart from '@/components/GastosTrendChart';
import DebtSimulator from '@/components/DebtSimulator';
import DebtPaymentHistory from '@/components/DebtPaymentHistory';
import SavingsGoals from '@/components/SavingsGoals';
import HealthScore from '@/components/HealthScore';
import FinancialReport from '@/components/FinancialReport';
import CashflowForecast from '@/components/CashflowForecast';
import SmartAlerts from '@/components/SmartAlerts';

export default function AnalisisPage() {
  // Estado para deudas desde Firestore
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  // Suscribirse a deudas de Firestore
  useEffect(() => {
    const unsubscribe = subscribeToDeudas((deudasActualizadas) => {
      if (deudasActualizadas.length > 0) {
        setDeudas(deudasActualizadas);
        setUsingFallback(false);
      } else {
        setDeudas(deudasIniciales);
        setUsingFallback(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Calcular todos los datos dinámicamente desde deudas de Firestore
  const totales = useMemo(() => calcularTotalesFromDeudas(deudas), [deudas]);
  const gastosFijosTotal = useMemo(() => calcularGastosFijos(), []);

  // Calcular cuánto dinero extra hay disponible para atacar deudas
  const pagoExtraMensual = useMemo(() => {
    const disponibleParaDeuda = INGRESO_MENSUAL - gastosFijosTotal;
    return Math.max(0, disponibleParaDeuda - totales.pagosMinimos);
  }, [gastosFijosTotal, totales.pagosMinimos]);

  // Proyección de deuda con intereses REALES (incluyendo pago extra)
  const proyeccion = useMemo(() => calcularProyeccionDeudas(deudas, pagoExtraMensual), [deudas, pagoExtraMensual]);

  // Comparar con escenario de solo pagar mínimos
  const comparacionMinimos = useMemo(() => {
    return compararEscenarios(deudas, pagoExtraMensual);
  }, [deudas, pagoExtraMensual]);

  // Datos para gráfica de proyección de deuda (dinámico)
  const deudaPorMes = useMemo(() => {
    const hoy = new Date();
    return proyeccion.proyeccionMensual
      .filter((_, i) => i < 12) // Solo 12 meses
      .map((p, i) => {
        const fecha = new Date(hoy);
        fecha.setMonth(hoy.getMonth() + i + 1);
        return {
          mes: MESES_CORTOS[fecha.getMonth()],
          deuda: p.saldoTotal,
          pagado: totales.deudaTotal - p.saldoTotal,
          intereses: p.interesesMes
        };
      });
  }, [proyeccion, totales.deudaTotal]);

  // Distribución de deuda por titular (dinámico)
  const distribucionDeuda = useMemo(() => {
    const porTitular: Record<string, number> = {};
    deudas.forEach(d => {
      const titular = d.titular === 'alejandra' ? 'Alejandra' : 'Ricardo';
      porTitular[titular] = (porTitular[titular] || 0) + d.saldoActual;
    });

    const colors: Record<string, string> = {
      'Alejandra': '#8b5cf6',
      'Ricardo': '#3b82f6'
    };

    return Object.entries(porTitular).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#10b981'
    }));
  }, [deudas]);

  // Deuda por tipo de CAT (dinámico)
  const deudaPorTipo = useMemo(() => {
    const grupos = {
      'TC Alta (>100% CAT)': { monto: 0, color: '#ef4444' },
      'TC Media (60-100%)': { monto: 0, color: '#f59e0b' },
      'TC Baja (<60%)': { monto: 0, color: '#10b981' },
    };

    deudas.forEach(d => {
      if (d.cat > 100) {
        grupos['TC Alta (>100% CAT)'].monto += d.saldoActual;
      } else if (d.cat > 60) {
        grupos['TC Media (60-100%)'].monto += d.saldoActual;
      } else {
        grupos['TC Baja (<60%)'].monto += d.saldoActual;
      }
    });

    return Object.entries(grupos)
      .filter(([_, data]) => data.monto > 0)
      .map(([tipo, data]) => ({ tipo, ...data }));
  }, [deudas]);

  // Gastos por categoría (dinámico)
  const gastosCategoria = useMemo(() => {
    const categorias = [
      { categoria: 'Pagos deuda', monto: totales.pagosMinimos },
    ];

    // Agregar gastos fijos
    gastosFijos.forEach(g => {
      const montoMensual = g.frecuencia === 'bimestral' ? g.monto / 2 : g.monto;
      categorias.push({ categoria: g.nombre, monto: montoMensual });
    });

    // Agregar suscripciones agrupadas
    const totalSuscripciones = suscripciones.reduce((sum, s) => sum + s.monto, 0);
    categorias.push({ categoria: 'Suscripciones', monto: totalSuscripciones });

    return categorias
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 6);
  }, [totales.pagosMinimos]);

  // Poder de pago mensual (dinámico) con desglose completo
  const poderDePagoDesglose = useMemo(() => {
    const ingresoMensual = INGRESO_MENSUAL;
    const gastosFijos = gastosFijosTotal;
    const disponibleTotal = ingresoMensual - gastosFijos;
    const pagosMinimos = totales.pagosMinimos;
    const dineroExtra = Math.max(0, disponibleTotal - pagosMinimos);

    // Encontrar la deuda que se está atacando (mayor CAT, no liquidada)
    const deudaAtacando = [...deudas]
      .filter(d => !d.liquidada && d.saldoActual > 0)
      .sort((a, b) => b.cat - a.cat)[0];

    // Contar deudas activas
    const deudasActivas = deudas.filter(d => !d.liquidada && d.saldoActual > 0).length;

    return {
      ingresoMensual,
      gastosFijos,
      disponibleTotal,
      pagosMinimos,
      dineroExtra,
      deudaAtacando,
      deudasActivas,
    };
  }, [gastosFijosTotal, totales.pagosMinimos, deudas]);

  // Para compatibilidad con código existente
  const poderDePago = poderDePagoDesglose.disponibleTotal;

  // Calcular ahorro en intereses vs pagar solo mínimos
  const ahorroIntereses = useMemo(() => {
    // Escenario 1: Solo pagar mínimos (0 extra)
    const soloMinimos = calcularProyeccionDeudas(deudas, 0);

    // El ahorro es la diferencia en intereses totales si se paga más
    // Como actualmente pagan los mínimos, el ahorro mostrado es cuánto
    // ahorrarían si pudieran pagar extra
    return {
      mesesConPlan: soloMinimos.mesesParaLibertad,
      totalIntereses: soloMinimos.totalInteresesPagados,
      fechaLibertad: soloMinimos.fechaLibertad
    };
  }, [deudas]);

  // Formato de fecha legible
  const formatFecha = (fecha: string) => {
    const [year, month] = fecha.split('-');
    return `${MESES_CORTOS[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Análisis Financiero</h1>
          <p className="text-white/50 text-sm">Métricas calculadas en tiempo real</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Calendar className="w-4 h-4" />
          Libertad: {formatFecha(proyeccion.fechaLibertad)}
        </div>
      </div>

      {/* Fallback indicator */}
      {usingFallback && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-yellow-300">
            Usando datos locales - Firebase no disponible
          </span>
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deuda */}
        <div className="glass-card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-white/40" />
              <span className="text-white/60 text-sm">Deuda Total</span>
            </div>
          </div>
          <p className="text-xs text-white/40 mb-2">Suma de todas las deudas activas</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-white">
              {formatMoney(totales.deudaTotal).replace('$', '')}
            </span>
            {totales.porcentajePagado > 0 && (
              <div className="flex items-center gap-1 text-green-400 text-sm mb-1">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <ArrowDownRight className="w-3 h-3" />
                </div>
                <span>-{totales.porcentajePagado.toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-4">
            {distribucionDeuda.map((d, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-white/50">{d.name}: {formatMoney(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deudas por CAT */}
        <div className="glass-card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-white/40" />
              <span className="text-white/60 text-sm">Distribución CAT</span>
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
                <span className="text-xs font-bold text-white">{deudaPorTipo.length}</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              {deudaPorTipo.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-white/60 truncate max-w-[100px]">{item.tipo}</span>
                  </div>
                  <span className="text-white/80">
                    {Math.round((item.monto / totales.deudaTotal) * 100)}%
                  </span>
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
            </div>
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
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${Math.max(1, totales.porcentajePagado)}%` }}
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
                  className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all"
                  style={{ width: `${100 - totales.porcentajePagado}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Poder de Pago - Desglose Completo */}
        <div className="glass-card bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-white/80 text-sm">Poder de Pago</span>
            </div>
            <span className="badge badge-success text-xs">{poderDePagoDesglose.deudasActivas} deudas activas</span>
          </div>

          {/* Desglose */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Ingreso mensual</span>
              <span className="text-white">{formatMoney(poderDePagoDesglose.ingresoMensual)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">− Gastos fijos</span>
              <span className="text-red-400">-{formatMoney(poderDePagoDesglose.gastosFijos)}</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between">
              <span className="text-white/70 font-medium">= Disponible para deudas</span>
              <span className="text-white font-bold">{formatMoney(poderDePagoDesglose.disponibleTotal)}</span>
            </div>
          </div>

          {/* Distribución */}
          <div className="mt-4 p-3 bg-white/5 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-yellow-400">Mínimos ({poderDePagoDesglose.deudasActivas} tarjetas)</span>
              <span className="text-yellow-400">{formatMoney(poderDePagoDesglose.pagosMinimos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-400">Extra → {poderDePagoDesglose.deudaAtacando?.nombre || 'N/A'}</span>
              <span className="text-green-400 font-bold">{formatMoney(poderDePagoDesglose.dineroExtra)}</span>
            </div>
          </div>

          {/* Deuda atacando */}
          {poderDePagoDesglose.deudaAtacando && (
            <div className="mt-3 flex items-center gap-2 text-xs text-purple-300">
              <Target className="w-3 h-3" />
              <span>
                Atacando: {poderDePagoDesglose.deudaAtacando.nombre} ({poderDePagoDesglose.deudaAtacando.cat}% CAT)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyección de Deuda */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Proyección de Deuda</h3>
              <span className="text-white/40 text-sm">con intereses reales</span>
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
                  formatter={(value: number, name: string) => [
                    formatMoney(value),
                    name === 'deuda' ? 'Deuda restante' : name === 'pagado' ? 'Total pagado' : 'Intereses mes'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="deuda"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDeuda)"
                  name="deuda"
                />
                <Area
                  type="monotone"
                  dataKey="pagado"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPagado2)"
                  name="pagado"
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

        {/* Distribución de Gastos */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Distribución de Gastos Fijos</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-white/40 mb-1">Total gastos fijos</p>
              <p className="text-2xl font-bold text-white">{formatMoney(gastosFijosTotal)}</p>
              <p className="text-xs text-white/40">mensual</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-white/40 mb-1">Ingreso</p>
              <p className="text-2xl font-bold text-green-400">{formatMoney(INGRESO_MENSUAL)}</p>
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
            <span className="text-white/40 text-sm">{deudas.length} deudas</span>
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
            {deudas.map((deuda, i) => {
              const porcentaje = deuda.saldoInicial > 0
                ? ((deuda.saldoInicial - deuda.saldoActual) / deuda.saldoInicial) * 100
                : 0;
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

        {/* Impacto del Plan - CON DATOS REALES */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Impacto del Plan Avalancha</h3>
            <span className="badge badge-success">Calculado</span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60">Total de intereses a pagar</span>
                <Info className="w-4 h-4 text-white/40" />
              </div>
              <p className="text-3xl font-bold text-red-400">
                {formatMoney(ahorroIntereses.totalIntereses)}
              </p>
              <p className="text-xs text-white/40 mt-1">
                Total a pagar: {formatMoney(totales.deudaTotal + ahorroIntereses.totalIntereses)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-white/40 mb-1">Tiempo para liquidar</p>
                <p className="text-xl font-bold text-white">{ahorroIntereses.mesesConPlan} meses</p>
                <p className="text-xs text-green-400">{formatFecha(ahorroIntereses.fechaLibertad)}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-white/40 mb-1">Interés mensual promedio</p>
                <p className="text-xl font-bold text-white">
                  {formatMoney(ahorroIntereses.totalIntereses / Math.max(1, ahorroIntereses.mesesConPlan))}
                </p>
                <p className="text-xs text-orange-400">en intereses</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-white/60 mb-3">Orden de liquidación (avalancha)</p>
              <div className="space-y-2">
                {proyeccion.ordenLiquidacion.slice(0, 4).map((deuda, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-purple-500' : 'bg-white/10'
                      }`}>{i + 1}</span>
                      <span className="text-sm text-white">{deuda.nombre}</span>
                    </div>
                    <span className="text-sm text-white/60">{formatFecha(deuda.fechaLiquidacion)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Charts Row - Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GastosPieChart />
        <GastosTrendChart />
      </div>

      {/* Debt Simulator */}
      <DebtSimulator />

      {/* Payment History & Savings Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DebtPaymentHistory />
        <SavingsGoals />
      </div>

      {/* Advanced Analytics Section */}
      <div className="pt-6 border-t border-white/10">
        <h2 className="text-xl font-bold text-white mb-6">Análisis Avanzado</h2>

        {/* Health Score & Smart Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <HealthScore />
          <SmartAlerts />
        </div>

        {/* Financial Report & Cashflow Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinancialReport />
          <CashflowForecast />
        </div>
      </div>
    </div>
  );
}
