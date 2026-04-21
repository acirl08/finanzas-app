'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, Flame, ArrowRight } from 'lucide-react';
import { calcularProyeccionDeudas } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { useFirestore } from '@/contexts/FirestoreContext';

export default function DeudasPage() {
  const { deudas, totalesDeudas: totales, loadingDeudas: loading } = useFirestore();

  const deudasOrdenadas = [...deudas].sort((a, b) => a.prioridad - b.prioridad);
  const deudasActivas = deudasOrdenadas.filter((d) => !d.liquidada);
  const deudasLiquidadas = deudasOrdenadas.filter((d) => d.liquidada);

  const fechaLibertad = useMemo(() => {
    const proyeccion = calcularProyeccionDeudas(deudas, 0);
    const fecha = new Date(proyeccion.fechaLibertad + '-01');
    return fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }, [deudas]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-display text-ink-900">Deudas</h1>
        <p className="text-ink-500 mt-1 text-[14px]">
          Método avalancha — liquidando primero las de mayor CAT.
        </p>
      </header>

      {/* Hero */}
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
          <div className="flex justify-between mt-2 text-[12px] text-ink-400 tabular-nums">
            <span>{formatMoney(totales.deudaPagada)} pagado</span>
            <span>{formatMoney(totales.deudaTotal)} restante</span>
          </div>
        </div>

        {deudasActivas.length > 0 && (
          <div className="mt-6 pt-6 border-t border-ink-100 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[13px] text-ink-500">Meta</p>
            <p className="text-[15px] text-ink-900 font-medium capitalize">
              Libres de deuda en {fechaLibertad}
            </p>
          </div>
        )}
      </section>

      {/* Stats fila */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface p-5">
          <p className="text-label">Pagos mínimos</p>
          <p className="mt-2 text-[24px] text-ink-900 font-semibold font-numeric">
            {formatMoney(totales.pagosMinimos)}
          </p>
          <p className="mt-1 text-[12px] text-ink-400">suma mensual</p>
        </div>
        <div className="surface p-5">
          <p className="text-label">Activas</p>
          <p className="mt-2 text-[24px] text-ink-900 font-semibold font-numeric">
            {deudasActivas.length}
          </p>
          <p className="mt-1 text-[12px] text-ink-400">
            {deudasActivas.length === 1 ? 'tarjeta' : 'tarjetas'}
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-label">Liquidadas</p>
          <p className="mt-2 text-[24px] text-sage-700 font-semibold font-numeric">
            {deudasLiquidadas.length}
          </p>
          <p className="mt-1 text-[12px] text-ink-400">ya libres</p>
        </div>
      </section>

      {/* Deudas activas */}
      <section className="surface p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[15px] text-ink-900 font-medium">Deudas activas</h2>
          <p className="text-label">Por prioridad</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-md bg-subtle animate-pulse" />
            ))}
          </div>
        ) : deudasActivas.length > 0 ? (
          <ul className="space-y-3">
            {deudasActivas.map((deuda, index) => {
              const progreso =
                deuda.saldoInicial > 0
                  ? ((deuda.saldoInicial - deuda.saldoActual) / deuda.saldoInicial) * 100
                  : 0;
              const isPriority = index === 0;
              const catBadge =
                deuda.cat >= 100 ? 'pill-clay' : deuda.cat >= 60 ? 'pill-honey' : 'pill-ink';

              return (
                <li
                  key={deuda.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    isPriority
                      ? 'bg-clay-50 border-clay-100'
                      : 'bg-surface border-ink-100 hover:border-ink-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0 ${
                          isPriority
                            ? 'bg-clay-500 text-white'
                            : 'bg-subtle text-ink-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] text-ink-900 font-medium truncate">
                          {deuda.nombre}
                        </p>
                        <p className="text-[12px] text-ink-400 capitalize">{deuda.titular}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[15px] text-ink-900 font-medium tabular-nums">
                        {formatMoney(deuda.saldoActual)}
                      </p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <span className={`pill ${catBadge}`}>CAT {deuda.cat}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="progress-track h-1.5">
                    <div
                      className={isPriority ? 'progress-fill progress-fill-danger' : 'progress-fill'}
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[11px] text-ink-400 tabular-nums">
                    <span>{progreso.toFixed(0)}% pagado</span>
                    <span>Mínimo {formatMoney(deuda.pagoMinimo)} · inicial {formatMoney(deuda.saldoInicial)}</span>
                  </div>

                  {isPriority && (
                    <div className="mt-3 flex items-center gap-2 text-[12px] text-clay-600">
                      <Flame className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Prioridad 1 · pagar primero (CAT más alto)
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-400 py-6 text-center">
            Sin deudas activas. Enhorabuena.
          </p>
        )}
      </section>

      {/* Liquidadas */}
      {deudasLiquidadas.length > 0 && (
        <section className="surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-sage-600" strokeWidth={1.75} />
            <h2 className="text-[15px] text-ink-900 font-medium">Deudas liquidadas</h2>
          </div>
          <ul className="space-y-2">
            {deudasLiquidadas.map((deuda) => (
              <li
                key={deuda.id}
                className="flex items-center justify-between p-3 rounded-md bg-sage-50 border border-sage-100"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-sage-600" strokeWidth={2} />
                  <div>
                    <p className="text-[14px] text-ink-900 font-medium">{deuda.nombre}</p>
                    <p className="text-[12px] text-ink-500 capitalize">{deuda.titular}</p>
                  </div>
                </div>
                <p className="text-[13px] text-sage-700 font-medium tabular-nums">
                  {formatMoney(deuda.saldoInicial)} liquidado
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Link a análisis */}
      <Link
        href="/analisis"
        className="surface p-4 flex items-center justify-between hover:bg-subtle transition-colors group"
      >
        <div>
          <p className="text-[14px] text-ink-900">Ver proyección y plan avalancha</p>
          <p className="text-[12px] text-ink-400">Simulaciones a 12 meses · intereses ahorrados</p>
        </div>
        <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 transition-colors" strokeWidth={1.75} />
      </Link>
    </div>
  );
}
