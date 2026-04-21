'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingDown, Zap, CalendarClock, ArrowRight } from 'lucide-react';
import {
  INGRESO_MENSUAL,
  calcularGastosFijos,
  calcularProyeccionDeudas,
  compararEscenarios,
  categoriaLabels,
} from '@/lib/data';
import { formatMoney, MESES_CORTOS } from '@/lib/utils';
import { useMonth } from '@/contexts/MonthContext';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useGastosDelMes, useGastosPorCategoria } from '@/hooks/useGastosFilters';

type Tab = 'mes' | 'deudas';

const CHART_COLORS = ['#2F7D57', '#4A6B85', '#B8860B', '#A84238', '#6B6960', '#8DB79B', '#D2CEC1'];

export default function AnalisisPage() {
  const [tab, setTab] = useState<Tab>('mes');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-display text-ink-900">Análisis</h1>
        <p className="text-ink-500 mt-1 text-[14px]">
          Detalle del mes y plan de deudas.
        </p>
      </header>

      {/* Tabs */}
      <nav className="inline-flex bg-subtle rounded-lg p-1">
        <TabButton active={tab === 'mes'} onClick={() => setTab('mes')}>
          Este mes
        </TabButton>
        <TabButton active={tab === 'deudas'} onClick={() => setTab('deudas')}>
          Deudas
        </TabButton>
      </nav>

      {tab === 'mes' ? <MesTab /> : <DeudasTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-[14px] font-medium transition-colors ${
        active ? 'bg-surface text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-900'
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
   TAB · Este mes
   ============================================================ */
function MesTab() {
  const { selectedMonth } = useMonth();
  const { gastos } = useFirestore();
  const gastosData = useGastosDelMes(gastos, selectedMonth);
  const categoriaData = useGastosPorCategoria(gastosData.gastosVariables);

  const pieData = categoriaData.slice(0, 7).map((c, i) => ({
    name: categoriaLabels[c.categoria] || c.categoria,
    value: c.total,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Trend: últimos 6 meses
  const trend = useMemo(() => {
    const result: Array<{ mes: string; total: number }> = [];
    const base = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const sum = gastos
        .filter((g) => g.fecha.startsWith(key) && !g.esFijo && g.categoria !== 'deuda')
        .reduce((acc, g) => acc + g.monto, 0);
      result.push({ mes: MESES_CORTOS[d.getMonth()], total: sum });
    }
    return result;
  }, [gastos]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Distribución */}
      <section className="surface p-6">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-[15px] text-ink-900 font-medium">Distribución del gasto</h2>
          <p className="text-[12px] text-ink-400 tabular-nums">{formatMoney(gastosData.totalVariables)}</p>
        </div>
        <p className="text-label mb-4">Top categorías variables</p>

        {pieData.length === 0 ? (
          <p className="text-ink-400 text-[14px] py-8 text-center">
            Sin gastos registrados este mes.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-[180px] h-[180px] flex-shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E0DDD3',
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                    formatter={(v: number) => formatMoney(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="flex-1 w-full space-y-2">
              {pieData.map((d) => (
                <li key={d.name} className="flex items-center gap-3 text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="flex-1 text-ink-700 truncate">{d.name}</span>
                  <span className="text-ink-900 font-medium tabular-nums">{formatMoney(d.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Tendencia 6 meses */}
      <section className="surface p-6">
        <h2 className="text-[15px] text-ink-900 font-medium">Tendencia</h2>
        <p className="text-label mt-0.5">Gasto variable · últimos 6 meses</p>
        <div className="h-[220px] mt-4">
          <ResponsiveContainer>
            <AreaChart data={trend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="sageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F7D57" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2F7D57" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#A09E96', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#A09E96', fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E0DDD3',
                  borderRadius: 10,
                  fontSize: 13,
                }}
                formatter={(v: number) => formatMoney(v)}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#2F7D57"
                strokeWidth={2}
                fill="url(#sageGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   TAB · Deudas
   ============================================================ */
function DeudasTab() {
  const { deudas, ingresos, totalesDeudas: totales } = useFirestore();
  const { selectedMonth } = useMonth();

  const ingresoMensual = useMemo(() => {
    const t = ingresos
      .filter((i) => i.fecha.startsWith(selectedMonth))
      .reduce((a, i) => a + i.monto, 0);
    return t > 0 ? t : INGRESO_MENSUAL;
  }, [ingresos, selectedMonth]);

  const gastosFijosTotal = useMemo(() => calcularGastosFijos(), []);
  const pagoExtraMensual = Math.max(0, ingresoMensual - gastosFijosTotal - totales.pagosMinimos);

  const proyeccion = useMemo(
    () => calcularProyeccionDeudas(deudas, pagoExtraMensual),
    [deudas, pagoExtraMensual]
  );
  const comparacion = useMemo(
    () => compararEscenarios(deudas, pagoExtraMensual),
    [deudas, pagoExtraMensual]
  );

  const deudaPorMes = useMemo(() => {
    const hoy = new Date();
    return proyeccion.proyeccionMensual.slice(0, 12).map((p, i) => {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i + 1, 1);
      return {
        mes: MESES_CORTOS[fecha.getMonth()],
        deuda: p.saldoTotal,
      };
    });
  }, [proyeccion]);

  const deudasOrdenadas = [...deudas].sort((a, b) => b.cat - a.cat);
  const catPromedio =
    deudas.length > 0 ? deudas.reduce((a, d) => a + d.cat, 0) / deudas.length : 0;

  return (
    <div className="space-y-6">
      {/* Hero deuda */}
      <section className="surface-raised p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-end gap-6">
          <div>
            <p className="text-label">Deuda total</p>
            <p className="mt-2 text-hero text-ink-900 font-numeric">
              {formatMoney(totales.deudaTotal)}
            </p>
            <p className="mt-1 text-[14px] text-ink-500">
              De {formatMoney(totales.deudaInicial)} inicial ·{' '}
              <span className="text-sage-700 font-medium">
                {formatMoney(totales.deudaPagada)} liquidado
              </span>
            </p>
          </div>
          <span className="pill pill-sage self-start lg:self-end">
            {Math.round(totales.porcentajePagado)}% pagado
          </span>
        </div>

        <div className="mt-6">
          <div className="progress-track h-2">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, totales.porcentajePagado)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="CAT promedio"
          value={`${catPromedio.toFixed(1)}%`}
          meta={`${deudas.length} ${deudas.length === 1 ? 'tarjeta' : 'tarjetas'}`}
        />
        <StatCard
          label="Pagos mínimos"
          value={formatMoney(totales.pagosMinimos)}
          meta="al mes"
        />
        <StatCard
          label="Pago extra disponible"
          value={formatMoney(pagoExtraMensual)}
          meta="atacando deuda"
          accent={pagoExtraMensual > 0}
        />
      </section>

      {/* Tabla deudas */}
      <section className="surface p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[15px] text-ink-900 font-medium">Detalle por tarjeta</h2>
          <p className="text-label">CAT descendente</p>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-label">
                <th className="px-2 pb-3 font-normal">Tarjeta</th>
                <th className="px-2 pb-3 font-normal">Titular</th>
                <th className="px-2 pb-3 font-normal text-right">Saldo</th>
                <th className="px-2 pb-3 font-normal text-right">Mínimo</th>
                <th className="px-2 pb-3 font-normal text-right">CAT</th>
              </tr>
            </thead>
            <tbody>
              {deudasOrdenadas.map((d) => {
                const pctPagado =
                  d.saldoInicial > 0 ? ((d.saldoInicial - d.saldoActual) / d.saldoInicial) * 100 : 0;
                return (
                  <tr key={d.id} className="border-t border-ink-100">
                    <td className="px-2 py-3">
                      <p className="text-ink-900">{d.nombre}</p>
                      <div className="progress-track h-1 mt-1.5 w-32">
                        <div className="progress-fill" style={{ width: `${pctPagado}%` }} />
                      </div>
                    </td>
                    <td className="px-2 py-3 text-ink-500 capitalize">{d.titular}</td>
                    <td className="px-2 py-3 text-right text-ink-900 font-medium tabular-nums">
                      {formatMoney(d.saldoActual)}
                    </td>
                    <td className="px-2 py-3 text-right text-ink-500 tabular-nums">
                      {formatMoney(d.pagoMinimo)}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      <span
                        className={
                          d.cat >= 100
                            ? 'text-clay-500'
                            : d.cat >= 60
                            ? 'text-honey-600'
                            : 'text-ink-700'
                        }
                      >
                        {d.cat.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Proyección + Plan avalancha */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <section className="surface p-6">
          <h2 className="text-[15px] text-ink-900 font-medium">Proyección 12 meses</h2>
          <p className="text-label mt-0.5">Pagando mínimos + {formatMoney(pagoExtraMensual)} extra</p>
          <div className="h-[240px] mt-4">
            <ResponsiveContainer>
              <AreaChart data={deudaPorMes} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A84238" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#A84238" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A09E96', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A09E96', fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E0DDD3',
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Area
                  type="monotone"
                  dataKey="deuda"
                  stroke="#A84238"
                  strokeWidth={2}
                  fill="url(#debtGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-sage-600" strokeWidth={1.75} />
            <h2 className="text-[15px] text-ink-900 font-medium">Plan avalancha</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-label">Con tu plan</p>
              <p className="mt-1 text-[22px] font-semibold text-ink-900 font-numeric">
                {comparacion.conExtra.mesesParaLibertad} meses
              </p>
              <p className="text-[12px] text-ink-500 mt-0.5">
                Intereses: {formatMoney(comparacion.conExtra.totalInteresesPagados)}
              </p>
            </div>

            <div className="divider" />

            <div>
              <p className="text-label">Solo mínimos</p>
              <p className="mt-1 text-[22px] font-semibold text-ink-500 font-numeric">
                {comparacion.sinExtra.mesesParaLibertad} meses
              </p>
              <p className="text-[12px] text-ink-500 mt-0.5">
                Intereses: {formatMoney(comparacion.sinExtra.totalInteresesPagados)}
              </p>
            </div>

            <div className="pill pill-sage w-full justify-center py-2">
              <TrendingDown className="w-3.5 h-3.5" strokeWidth={2} />
              Ahorras {formatMoney(comparacion.sinExtra.totalInteresesPagados - comparacion.conExtra.totalInteresesPagados)}
            </div>
          </div>
        </section>
      </div>

      {/* CTA más detalle */}
      <Link
        href="/deudas"
        className="surface p-4 flex items-center justify-between hover:bg-subtle transition-colors group"
      >
        <div className="flex items-center gap-3">
          <CalendarClock className="w-5 h-5 text-ink-500" strokeWidth={1.75} />
          <div>
            <p className="text-[14px] text-ink-900">Historial de pagos</p>
            <p className="text-[12px] text-ink-400">Ver cada abono y simular escenarios</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 transition-colors" strokeWidth={1.75} />
      </Link>
    </div>
  );
}

/* ============================================================
   Shared
   ============================================================ */
function StatCard({
  label,
  value,
  meta,
  accent = false,
}: {
  label: string;
  value: string;
  meta: string;
  accent?: boolean;
}) {
  return (
    <div className="surface p-5">
      <p className="text-label">{label}</p>
      <p
        className={`mt-2 text-[26px] font-semibold font-numeric leading-tight ${
          accent ? 'text-sage-700' : 'text-ink-900'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px] text-ink-400">{meta}</p>
    </div>
  );
}
