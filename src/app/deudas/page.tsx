'use client';

import { useState, useEffect, useMemo } from 'react';
import { CreditCard, TrendingDown, Target, AlertTriangle, CheckCircle2, Flame } from 'lucide-react';
import { subscribeToDeudas, calcularTotalesFromDeudas } from '@/lib/firestore';
import { deudasIniciales, calcularProyeccionDeudas } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { Deuda } from '@/types';

export default function DeudasPage() {
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToDeudas((deudasActualizadas) => {
      // Only update if Firebase has data, otherwise keep local data
      if (deudasActualizadas && deudasActualizadas.length > 0) {
        setDeudas(deudasActualizadas);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totales = calcularTotalesFromDeudas(deudas);
  const deudaInicial = deudasIniciales.reduce((sum, d) => sum + d.saldoInicial, 0);
  const deudaPagada = deudaInicial - totales.deudaTotal;

  // Ordenar por prioridad (CAT más alto primero - método avalancha)
  const deudasOrdenadas = [...deudas].sort((a, b) => a.prioridad - b.prioridad);
  const deudasActivas = deudasOrdenadas.filter(d => !d.liquidada);
  const deudasLiquidadas = deudasOrdenadas.filter(d => d.liquidada);

  // Calcular fecha de libertad dinámica
  const fechaLibertad = useMemo(() => {
    const proyeccion = calcularProyeccionDeudas(deudas, 0);
    const fecha = new Date(proyeccion.fechaLibertad + '-01');
    return fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }, [deudas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Deudas</h1>
        <p className="text-white/50">Método avalancha - liquidando por CAT más alto</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-card-title">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Deuda Total</span>
            </div>
            <CreditCard className="w-4 h-4 text-red-400" />
          </div>
          <div className="metric-card-value text-red-400">
            {formatMoney(totales.deudaTotal)}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            De {formatMoney(deudaInicial)} inicial
          </p>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-card-title">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Ya Pagaste</span>
            </div>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="metric-card-value text-emerald-400">
            {formatMoney(deudaPagada)}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            {totales.porcentajePagado.toFixed(1)}% del total
          </p>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-card-title">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Pago Mensual</span>
            </div>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="metric-card-value">
            {formatMoney(totales.pagosMinimos)}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            Suma de mínimos
          </p>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-card-title">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Cuentas</span>
            </div>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="metric-card-value">
            {deudasActivas.length} <span className="text-lg text-[var(--text-tertiary)]">activas</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            {deudasLiquidadas.length} liquidadas
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-card">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-[var(--text-secondary)]">Progreso total</span>
          <span className="text-sm font-medium text-emerald-400">{totales.porcentajePagado.toFixed(1)}%</span>
        </div>
        <div className="progress-bar-bg h-3">
          <div
            className="progress-bar-fill progress-green"
            style={{ width: `${totales.porcentajePagado}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--text-tertiary)]">
          <span>{formatMoney(deudaPagada)} pagado</span>
          <span>{formatMoney(totales.deudaTotal)} restante</span>
        </div>
      </div>

      {/* Deudas Activas */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-header-title">
            <div className="dot bg-red-500" />
            <span>Deudas Activas</span>
          </div>
          <span className="text-sm text-[var(--text-tertiary)]">Ordenadas por prioridad (CAT)</span>
        </div>

        <div className="space-y-3">
          {deudasActivas.map((deuda, index) => {
            const progreso = deuda.saldoInicial > 0
              ? ((deuda.saldoInicial - deuda.saldoActual) / deuda.saldoInicial) * 100
              : 0;

            return (
              <div
                key={deuda.id}
                className={`p-4 rounded-xl border transition-all ${
                  index === 0
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-[var(--bg-elevated)] border-transparent hover:border-[var(--border-default)]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-red-500 text-white' :
                      index === 1 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{deuda.nombre}</p>
                      <p className="text-xs text-[var(--text-tertiary)] capitalize">{deuda.titular}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{formatMoney(deuda.saldoActual)}</p>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      <span className={`badge text-xs ${
                        deuda.cat > 100 ? 'badge-danger' :
                        deuda.cat > 50 ? 'badge-warning' : 'badge-info'
                      }`}>
                        CAT {deuda.cat}%
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        Min: {formatMoney(deuda.pagoMinimo)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar individual */}
                <div className="progress-bar-bg h-1.5">
                  <div
                    className={`progress-bar-fill ${index === 0 ? 'progress-red' : 'progress-purple'}`}
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-[var(--text-tertiary)]">
                  <span>{progreso.toFixed(0)}% pagado</span>
                  <span>Inicial: {formatMoney(deuda.saldoInicial)}</span>
                </div>

                {index === 0 && (
                  <div className="mt-3 p-2 bg-red-500/20 rounded-lg">
                    <p className="text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      Prioridad #1 - Pagar primero (CAT más alto)
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deudas Liquidadas */}
      {deudasLiquidadas.length > 0 && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-title">
              <div className="dot bg-emerald-500" />
              <span>Deudas Liquidadas</span>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="space-y-2">
            {deudasLiquidadas.map((deuda) => (
              <div
                key={deuda.id}
                className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="font-medium text-emerald-400">{deuda.nombre}</p>
                    <p className="text-xs text-[var(--text-tertiary)] capitalize">{deuda.titular}</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-400 font-medium">
                  {formatMoney(deuda.saldoInicial)} liquidado
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivational Footer */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
        <p className="text-purple-300">
          Meta: Ser libres de deuda en {fechaLibertad}
        </p>
      </div>
    </div>
  );
}
