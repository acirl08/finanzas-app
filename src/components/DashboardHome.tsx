'use client';

import Link from 'next/link';
import { ArrowRight, AlertCircle, CalendarClock, TrendingUp } from 'lucide-react';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useMonth, formatMonth } from '@/contexts/MonthContext';
import { useGastosDelMes, useGastosPorCategoria } from '@/hooks/useGastosFilters';
import { useIngresosMes } from '@/hooks/useIngresos';
import {
  PRESUPUESTO_VARIABLE,
  PRESUPUESTO_GUSTOS,
  VALES_DESPENSA,
  categoriaLabels,
} from '@/lib/data';
import { formatMoney } from '@/lib/utils';

type Status = 'good' | 'careful' | 'over';

function statusFor(used: number, budget: number, dayOfMonth: number, daysInMonth: number): Status {
  if (budget <= 0) return 'good';
  if (used > budget) return 'over';
  const projected = (used / Math.max(dayOfMonth, 1)) * daysInMonth;
  if (projected > budget * 1.05) return 'careful';
  return 'good';
}

const STATUS_COPY: Record<Status, { label: string; dot: string; pill: string }> = {
  good:    { label: 'Vas bien',    dot: 'bg-sage-500',  pill: 'pill-sage'  },
  careful: { label: 'Ojo con el ritmo', dot: 'bg-honey-500', pill: 'pill-honey' },
  over:    { label: 'Sobregirado', dot: 'bg-clay-500',  pill: 'pill-clay'  },
};

export default function DashboardHome() {
  const { selectedMonth, isCurrentMonth } = useMonth();
  const { gastos, loadingGastos, totalesDeudas } = useFirestore();
  const gastosData = useGastosDelMes(gastos, selectedMonth);
  const categoriaData = useGastosPorCategoria(gastosData.gastosVariables);
  const { ingresoMensual, usandoDefault } = useIngresosMes();

  const {
    totalVariables,
    disponibleVariables,
    gastosDelMes,
    daysRemaining,
  } = gastosData;

  // Para el "día del mes"
  const [, monthNum] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(new Date().getFullYear(), monthNum, 0).getDate();
  const dayOfMonth = isCurrentMonth ? new Date().getDate() : daysInMonth;

  const budget = PRESUPUESTO_VARIABLE;
  const pctUsed = budget > 0 ? Math.min(100, Math.round((totalVariables / budget) * 100)) : 0;
  const dailyAllowed = daysRemaining > 0 ? Math.max(0, Math.floor(disponibleVariables / daysRemaining)) : 0;

  const status = statusFor(totalVariables, budget, dayOfMonth, daysInMonth);
  const statusCopy = STATUS_COPY[status];

  // Alertas (solo las críticas del mes)
  const alertas: Array<{ id: string; icon: React.ReactNode; text: string; href: string }> = [];
  const sinCategorizar = gastosDelMes.filter((g) => g.categoria === 'no_reconocido').length;
  if (sinCategorizar > 0) {
    alertas.push({
      id: 'uncat',
      icon: <AlertCircle className="w-[18px] h-[18px] text-clay-500" strokeWidth={1.75} />,
      text: `${sinCategorizar} ${sinCategorizar === 1 ? 'gasto sin categorizar' : 'gastos sin categorizar'}`,
      href: '/gastos',
    });
  }

  const deudasPendientes = totalesDeudas.pagosMinimos;
  if (deudasPendientes > 0) {
    alertas.push({
      id: 'debt',
      icon: <CalendarClock className="w-[18px] h-[18px] text-honey-600" strokeWidth={1.75} />,
      text: `Pagos mínimos del mes: ${formatMoney(deudasPendientes)}`,
      href: '/analisis',
    });
  }

  const topCategorias = categoriaData.slice(0, 5);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días, Ale';
    if (h < 19) return 'Buenas tardes, Ale';
    return 'Buenas noches, Ale';
  })();

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-display text-ink-900">{greeting}</h1>
        <p className="text-[13px] text-ink-400 capitalize">{formatMonth(selectedMonth)}</p>
      </div>

      {/* ZONA 1 · Hero */}
      <section className="surface-raised p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-end gap-6">
          <div>
            <p className="text-label">Disponible este mes</p>
            <p className="mt-2 text-hero text-ink-900 font-numeric">
              {formatMoney(Math.max(0, disponibleVariables))}
            </p>
            <p className="mt-1 text-[14px] text-ink-500">
              De {formatMoney(budget)} presupuestado · {formatMoney(totalVariables)} ya gastado
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3">
            <span className={`pill ${statusCopy.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCopy.dot}`} />
              {statusCopy.label}
            </span>
            <Link href="/registrar" className="btn btn-primary">
              Registrar gasto
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </div>

        {/* Progreso */}
        <div className="mt-8">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[13px] text-ink-500">
              <span className="text-ink-900 font-medium tabular-nums">{pctUsed}%</span> del presupuesto usado
            </p>
            <p className="text-[13px] text-ink-500 tabular-nums">
              {daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'}
            </p>
          </div>
          <div className="progress-track h-2">
            <div
              className={`progress-fill ${status === 'over' ? 'progress-fill-danger' : status === 'careful' ? 'progress-fill-honey' : ''}`}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
        </div>

        {/* Ritmo diario */}
        <div className="mt-6 pt-6 border-t border-ink-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-ink-400" strokeWidth={1.75} />
            <div>
              <p className="text-[13px] text-ink-500">Puedes gastar</p>
              <p className="text-[18px] text-ink-900 font-semibold font-numeric">
                {formatMoney(dailyAllowed)} / día
              </p>
            </div>
          </div>
          <p className="text-[12px] text-ink-400 text-right max-w-[180px] leading-snug">
            Para llegar al final del mes sin pasarte del presupuesto
          </p>
        </div>
      </section>

      {/* ZONA 2 · Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Ingresos"
          value={formatMoney(ingresoMensual)}
          meta={usandoDefault ? 'promedio mensual' : 'este mes'}
        />
        <StatCard
          label="Gastado"
          value={formatMoney(totalVariables)}
          meta={`${gastosDelMes.length} ${gastosDelMes.length === 1 ? 'movimiento' : 'movimientos'}`}
        />
        <StatCard
          label="Deuda total"
          value={formatMoney(totalesDeudas.deudaTotal)}
          meta={totalesDeudas.porcentajePagado > 0
            ? `${Math.round(totalesDeudas.porcentajePagado)}% liquidada`
            : 'pendiente'}
        />
      </section>

      {/* ZONA 3 · Atención + Top categorías */}
      <section className="surface p-6 sm:p-8">
        {alertas.length > 0 && (
          <>
            <p className="text-label mb-4">Requiere tu atención</p>
            <ul className="space-y-2 mb-8">
              {alertas.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-subtle transition-colors group"
                  >
                    {a.icon}
                    <span className="flex-1 text-[14px] text-ink-900">{a.text}</span>
                    <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 transition-colors" strokeWidth={1.75} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex items-baseline justify-between mb-4">
          <p className="text-label">Top categorías del mes</p>
          <p className="text-[12px] text-ink-400">
            {loadingGastos ? 'Cargando…' : `${categoriaData.length} en total`}
          </p>
        </div>

        {topCategorias.length > 0 ? (
          <ul className="space-y-4">
            {topCategorias.map((c) => {
              const pct = totalVariables > 0 ? (c.total / totalVariables) * 100 : 0;
              return (
                <li key={c.categoria}>
                  <div className="flex justify-between items-baseline text-[14px]">
                    <span className="text-ink-700">
                      {categoriaLabels[c.categoria] || c.categoria}
                    </span>
                    <span className="text-ink-900 font-medium tabular-nums">
                      {formatMoney(c.total)}
                    </span>
                  </div>
                  <div className="progress-track mt-1.5">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-400 py-4">
            Aún no hay gastos este mes.{' '}
            <Link href="/registrar" className="text-sage-600 hover:text-sage-700 underline underline-offset-2">
              Registra el primero
            </Link>
            .
          </p>
        )}

        <div className="mt-8 pt-6 border-t border-ink-100">
          <Link
            href="/analisis"
            className="inline-flex items-center gap-1.5 text-[14px] text-sage-700 hover:text-sage-600 transition-colors"
          >
            Ver análisis completo
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="surface p-5">
      <p className="text-label">{label}</p>
      <p className="mt-2 text-[26px] text-ink-900 font-semibold font-numeric leading-tight">
        {value}
      </p>
      <p className="mt-1 text-[12px] text-ink-400">{meta}</p>
    </div>
  );
}
