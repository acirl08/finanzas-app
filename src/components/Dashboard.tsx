'use client';

import { useState } from 'react';
import { Deuda } from '@/types';
import { deudasIniciales, calcularTotales, calcularDisponible, INGRESO_MENSUAL } from '@/lib/data';
import { TrendingDown, TrendingUp, DollarSign, Target, AlertTriangle, CheckCircle } from 'lucide-react';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getCatColor(cat: number) {
  if (cat > 100) return 'bg-red-500';
  if (cat > 60) return 'bg-orange-500';
  if (cat > 40) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getCatBadge(cat: number) {
  if (cat > 100) return { text: 'URGENTE', class: 'bg-red-100 text-red-700' };
  if (cat > 60) return { text: 'ALTA', class: 'bg-orange-100 text-orange-700' };
  if (cat > 40) return { text: 'MEDIA', class: 'bg-yellow-100 text-yellow-700' };
  return { text: 'BAJA', class: 'bg-green-100 text-green-700' };
}

export default function Dashboard() {
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales);
  const totales = calcularTotales(deudas);
  const disponible = calcularDisponible(deudas);

  const deudasActivas = deudas.filter(d => !d.liquidada).sort((a, b) => a.prioridad - b.prioridad);
  const deudasLiquidadas = deudas.filter(d => d.liquidada);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Deuda Total</p>
              <p className="text-2xl font-bold text-red-600">{formatMoney(totales.deudaTotal)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${totales.porcentajePagado}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{totales.porcentajePagado.toFixed(1)}% pagado</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ya Pagaste</p>
              <p className="text-2xl font-bold text-green-600">{formatMoney(totales.deudaPagada)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingreso Mensual</p>
              <p className="text-2xl font-bold text-blue-600">{formatMoney(INGRESO_MENSUAL)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-100">Disponible para Deuda</p>
              <p className="text-2xl font-bold">{formatMoney(disponible)}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-purple-100 mt-2">Cada mes para atacar deudas</p>
        </div>
      </div>

      {/* Deudas Activas */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Deudas por Pagar (Método Avalancha)
        </h2>
        <div className="space-y-3">
          {deudasActivas.map((deuda, index) => {
            const porcentaje = ((deuda.saldoInicial - deuda.saldoActual) / deuda.saldoInicial) * 100;
            const badge = getCatBadge(deuda.cat);

            return (
              <div
                key={deuda.id}
                className={`p-4 rounded-lg border-l-4 ${index === 0 ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-300'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getCatColor(deuda.cat)}`}>
                      {deuda.prioridad}
                    </span>
                    <div>
                      <h3 className="font-semibold">{deuda.nombre}</h3>
                      <p className="text-xs text-gray-500 capitalize">{deuda.titular}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatMoney(deuda.saldoActual)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${badge.class}`}>
                      CAT {deuda.cat}% - {badge.text}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Pago mín: {formatMoney(deuda.pagoMinimo)}</span>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-full rounded-full ${getCatColor(deuda.cat)}`}
                        style={{ width: `${Math.max(porcentaje, 0)}%` }}
                      />
                    </div>
                  </div>
                  <span>{porcentaje.toFixed(0)}%</span>
                </div>
                {index === 0 && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                    Prioridad #1 - Atacar esta primero
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deudas Liquidadas */}
      {deudasLiquidadas.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            Deudas Liquidadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {deudasLiquidadas.map((deuda) => (
              <div key={deuda.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium line-through text-gray-500">{deuda.nombre}</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {formatMoney(deuda.saldoInicial)} liquidados
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Timeline - Plan 2026</h2>
        <div className="space-y-4">
          {[
            { mes: 'Enero', deudas: 'Amex Platinum + Rappi + Nu (Ale)', status: 'pending' },
            { mes: 'Febrero', deudas: 'HEB Afirme + Nu (Ricardo)', status: 'pending' },
            { mes: 'Abril', deudas: 'Santander LikeU', status: 'pending' },
            { mes: 'Junio', deudas: 'Amex Gold', status: 'pending' },
            { mes: 'Agosto', deudas: 'Banorte/Invex', status: 'pending' },
            { mes: 'Noviembre', deudas: 'BBVA (Ricardo)', status: 'pending' },
            { mes: 'Diciembre', deudas: 'LIBRES DE DEUDAS TC', status: 'goal' },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${
                item.status === 'completed' ? 'bg-green-500' :
                item.status === 'goal' ? 'bg-purple-500' : 'bg-gray-300'
              }`} />
              <div className={`flex-1 p-3 rounded-lg ${
                item.status === 'goal' ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300' :
                'bg-gray-50'
              }`}>
                <span className="font-semibold">{item.mes}</span>
                <span className="text-gray-600 ml-2">{item.deudas}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
