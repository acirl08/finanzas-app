'use client';

import { useState } from 'react';
import { Settings, DollarSign, CreditCard, User, Bell, Save } from 'lucide-react';
import { deudasIniciales, suscripciones, INGRESO_MENSUAL } from '@/lib/data';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'deudas', label: 'Deudas', icon: CreditCard },
    { id: 'suscripciones', label: 'Suscripciones', icon: DollarSign },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>
        <p className="text-gray-500">Ajusta tu información financiera</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Información General</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingreso mensual combinado
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  defaultValue={INGRESO_MENSUAL}
                  className="input pl-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vales de despensa
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  defaultValue={4800}
                  className="input pl-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Renta mensual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    defaultValue={12700}
                    className="input pl-8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pago de carro
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    defaultValue={13000}
                    className="input pl-8"
                  />
                </div>
              </div>
            </div>

            <button className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* Deudas Tab */}
      {activeTab === 'deudas' && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Actualizar Saldos de Deudas</h2>
          <p className="text-sm text-gray-500 mb-4">
            Actualiza los saldos cada vez que hagas un pago o recibas tu estado de cuenta
          </p>
          <div className="space-y-4">
            {deudasIniciales.map((deuda) => (
              <div key={deuda.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{deuda.nombre}</span>
                    <span className="text-xs text-gray-500 ml-2 capitalize">({deuda.titular})</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-200 rounded">CAT {deuda.cat}%</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Saldo actual</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        defaultValue={deuda.saldoActual}
                        className="input pl-6 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pago mínimo</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        defaultValue={deuda.pagoMinimo}
                        className="input pl-6 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn-primary flex items-center gap-2 w-full justify-center">
              <Save className="w-4 h-4" />
              Guardar todos los saldos
            </button>
          </div>
        </div>
      )}

      {/* Suscripciones Tab */}
      {activeTab === 'suscripciones' && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Suscripciones Mensuales</h2>
          <div className="space-y-3">
            {suscripciones.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-purple-600" />
                  <div>
                    <span className="font-medium">{sub.nombre}</span>
                    <span className="text-xs text-gray-500 ml-2 capitalize">({sub.titular})</span>
                    {sub.esencial && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Trabajo
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-medium">{formatMoney(sub.monto)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-purple-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total suscripciones:</span>
              <span className="text-xl font-bold text-purple-700">
                {formatMoney(suscripciones.reduce((sum, s) => sum + s.monto, 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
