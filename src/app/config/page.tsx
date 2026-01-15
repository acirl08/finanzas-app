'use client';

import { useState } from 'react';
import { Settings, DollarSign, CreditCard, Bell, Save, Check, AlertTriangle } from 'lucide-react';
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
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'deudas', label: 'Deudas', icon: CreditCard },
    { id: 'suscripciones', label: 'Suscripciones', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-white/50">Ajusta tu información financiera</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
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
        <div className="glass-card">
          <h2 className="text-lg font-bold text-white mb-6">Información General</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Ingreso mensual combinado
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                <input
                  type="number"
                  defaultValue={INGRESO_MENSUAL}
                  className="input-dark pl-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Vales de despensa
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                <input
                  type="number"
                  defaultValue={4800}
                  className="input-dark pl-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Renta mensual
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input
                    type="number"
                    defaultValue={12700}
                    className="input-dark pl-8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Pago de carro
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input
                    type="number"
                    defaultValue={13000}
                    className="input-dark pl-8"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="btn-primary flex items-center gap-2"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Guardado
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Deudas Tab */}
      {activeTab === 'deudas' && (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Actualizar Saldos</h2>
            <span className="badge badge-warning">Actualiza cada mes</span>
          </div>
          <p className="text-sm text-white/50 mb-6">
            Actualiza los saldos cada vez que hagas un pago o recibas tu estado de cuenta
          </p>

          <div className="space-y-4">
            {deudasIniciales.map((deuda) => (
              <div key={deuda.id} className="p-4 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      deuda.cat > 100 ? 'bg-red-500' :
                      deuda.cat > 60 ? 'bg-orange-500' : 'bg-green-500'
                    }`} />
                    <span className="font-medium text-white">{deuda.nombre}</span>
                    <span className="text-xs text-white/40 capitalize">({deuda.titular})</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg ${
                    deuda.cat > 100 ? 'bg-red-500/20 text-red-400' :
                    deuda.cat > 60 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    CAT {deuda.cat}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Saldo actual</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                      <input
                        type="number"
                        defaultValue={deuda.saldoActual}
                        className="w-full px-3 py-2 pl-7 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Pago mínimo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                      <input
                        type="number"
                        defaultValue={deuda.pagoMinimo}
                        className="w-full px-3 py-2 pl-7 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={handleSave}
              className="btn-primary flex items-center gap-2 w-full justify-center"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saldos guardados
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar todos los saldos
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Suscripciones Tab */}
      {activeTab === 'suscripciones' && (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Suscripciones Mensuales</h2>
            <span className="text-sm text-white/40">{suscripciones.length} activas</span>
          </div>

          <div className="space-y-3">
            {suscripciones.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                  />
                  <div>
                    <span className="font-medium text-white">{sub.nombre}</span>
                    <span className="text-xs text-white/40 ml-2 capitalize">({sub.titular})</span>
                    {sub.esencial && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-lg">
                        Trabajo
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-medium text-white">{formatMoney(sub.monto)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
            <div className="flex justify-between items-center">
              <span className="text-white/60">Total mensual:</span>
              <span className="text-2xl font-bold text-white">
                {formatMoney(suscripciones.reduce((sum, s) => sum + s.monto, 0))}
              </span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">Tip</span>
            </div>
            <p className="text-sm text-white/60">
              Revisa si todas estas suscripciones son necesarias. Cancela las que no uses para ahorrar más.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
