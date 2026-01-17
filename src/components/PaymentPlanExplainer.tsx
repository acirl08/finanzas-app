'use client';

import { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Target,
  Zap,
  Shield,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { deudasIniciales, calcularGastosFijos, INGRESO_MENSUAL, PRESUPUESTO_VARIABLE } from '@/lib/data';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PaymentPlanExplainer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumen' | 'detalle'>('resumen');

  const gastosFijos = calcularGastosFijos();
  const pagosMinimos = deudasIniciales.reduce((sum, d) => sum + d.pagoMinimo, 0);
  const disponibleParaAtacar = INGRESO_MENSUAL - gastosFijos - pagosMinimos - PRESUPUESTO_VARIABLE;

  // Ordenar deudas por prioridad (CAT más alto primero)
  const deudasOrdenadas = [...deudasIniciales].sort((a, b) => a.prioridad - b.prioridad);
  const deudaAtacando = deudasOrdenadas[0];

  return (
    <div className="glass-card">
      {/* Header - Siempre visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">¿Cómo funciona el plan?</h3>
            <p className="text-xs text-white/50">Método avalancha explicado</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 hidden sm:block">
            {isExpanded ? 'Cerrar' : 'Ver explicación'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )}
        </div>
      </button>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Mensaje tranquilizador */}
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-400 font-medium">No se van a atrasar en ningún pago</p>
                <p className="text-xs text-white/60 mt-1">
                  El plan incluye pagar el mínimo de TODAS las tarjetas cada mes. Nunca tendrán cargos moratorios.
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'resumen'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Resumen simple
            </button>
            <button
              onClick={() => setActiveTab('detalle')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'detalle'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Ver todos los pagos
            </button>
          </div>

          {activeTab === 'resumen' ? (
            /* Vista Resumen */
            <div className="space-y-4">
              {/* Cómo se divide el dinero */}
              <div>
                <p className="text-sm text-white/50 mb-3">Cada mes su dinero se divide así:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-400" />
                      <span className="text-sm text-white/80">Gastos fijos</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{formatMoney(gastosFijos)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <span className="text-sm text-white/80">Mínimos de tarjetas</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{formatMoney(pagosMinimos)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-pink-400" />
                      <span className="text-sm text-white/80">Gastos del mes</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{formatMoney(PRESUPUESTO_VARIABLE)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/10 rounded-xl border border-green-500/30">
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-300 font-medium">Extra para atacar deuda</span>
                    </div>
                    <span className="text-sm font-bold text-green-400">{formatMoney(disponibleParaAtacar)}</span>
                  </div>
                </div>
              </div>

              {/* El truco del método */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-purple-300 font-medium">El truco del método avalancha</p>
                    <p className="text-xs text-white/60 mt-2">
                      Los <span className="text-green-400 font-semibold">{formatMoney(disponibleParaAtacar)}</span> extra
                      van directo a <span className="text-white font-semibold">{deudaAtacando.nombre}</span> (la del CAT más alto: {deudaAtacando.cat}%).
                    </p>
                    <p className="text-xs text-white/60 mt-2">
                      Cuando la liquiden, ese dinero + el mínimo que pagaban ahí va a la siguiente deuda.
                      Es como una bola de nieve que crece cada vez más.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pasos visuales */}
              <div>
                <p className="text-sm text-white/50 mb-3">Así funciona cada mes:</p>
                <div className="space-y-3">
                  {[
                    { step: 1, text: 'Pagan el mínimo de TODAS las tarjetas', icon: CheckCircle2, color: 'text-green-400' },
                    { step: 2, text: 'Cubren sus gastos fijos y del mes', icon: Wallet, color: 'text-blue-400' },
                    { step: 3, text: `Todo lo extra (${formatMoney(disponibleParaAtacar)}) va a ${deudaAtacando.nombre}`, icon: Zap, color: 'text-yellow-400' },
                    { step: 4, text: 'Cuando liquidan una, atacan la siguiente', icon: TrendingDown, color: 'text-purple-400' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white/60">
                        {item.step}
                      </div>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-sm text-white/80">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Vista Detalle - Todos los pagos */
            <div className="space-y-4">
              <p className="text-sm text-white/50">Pagos mínimos mensuales a cada tarjeta:</p>

              <div className="space-y-2">
                {deudasOrdenadas.map((deuda, index) => {
                  const isFirst = index === 0;
                  const pagoTotal = isFirst ? deuda.pagoMinimo + disponibleParaAtacar : deuda.pagoMinimo;

                  return (
                    <div
                      key={deuda.id}
                      className={`p-3 rounded-xl ${
                        isFirst
                          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30'
                          : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isFirst ? 'bg-green-500 text-white' : 'bg-white/10 text-white/60'
                          }`}>
                            {deuda.prioridad}
                          </div>
                          <div>
                            <span className="text-sm text-white">{deuda.nombre}</span>
                            <span className="text-xs text-white/40 ml-2 capitalize">({deuda.titular})</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {isFirst ? (
                            <div>
                              <span className="text-sm font-bold text-green-400">{formatMoney(pagoTotal)}</span>
                              <p className="text-xs text-white/40">
                                {formatMoney(deuda.pagoMinimo)} mín + {formatMoney(disponibleParaAtacar)} extra
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-white/80">{formatMoney(deuda.pagoMinimo)}</span>
                          )}
                        </div>
                      </div>
                      {isFirst && (
                        <div className="mt-2 flex items-center gap-2">
                          <Zap className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-green-400">Atacando ahora - CAT {deuda.cat}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total mensual */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Total a pagar en tarjetas este mes:</span>
                  <span className="text-lg font-bold text-white">{formatMoney(pagosMinimos + disponibleParaAtacar)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer motivacional */}
          <div className="pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-white/40">
              Siguiendo este plan, estarán libres de deuda en Diciembre 2026
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
