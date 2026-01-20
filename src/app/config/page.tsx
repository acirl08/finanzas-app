'use client';

import { useState, useEffect } from 'react';
import { Settings, DollarSign, CreditCard, Bell, Save, Check, AlertTriangle, RotateCcw, Download } from 'lucide-react';
import ExportData from '@/components/ExportData';
import { deudasIniciales, suscripciones, INGRESO_MENSUAL, VALES_DESPENSA } from '@/lib/data';
import { subscribeToDeudas, updateDeuda, updateConfiguracion, getConfiguracion } from '@/lib/firestore';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';
import { Deuda } from '@/types';

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales);

  // Form states
  const [generalForm, setGeneralForm] = useState({
    ingresoMensual: INGRESO_MENSUAL,
    valesDespensa: VALES_DESPENSA,
    renta: 12700,
    pagoCarro: 13000,
  });

  const [deudaForms, setDeudaForms] = useState<Record<string, { saldoActual: number; pagoMinimo: number }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Subscribe to real-time deuda updates
  useEffect(() => {
    const unsubscribe = subscribeToDeudas((deudasActualizadas) => {
      setDeudas(deudasActualizadas.length > 0 ? deudasActualizadas : deudasIniciales);
      // Initialize form states with current values
      const forms: Record<string, { saldoActual: number; pagoMinimo: number }> = {};
      (deudasActualizadas.length > 0 ? deudasActualizadas : deudasIniciales).forEach(d => {
        forms[d.id] = { saldoActual: d.saldoActual, pagoMinimo: d.pagoMinimo };
      });
      setDeudaForms(forms);
    });

    return () => unsubscribe();
  }, []);

  // Load configuration
  useEffect(() => {
    getConfiguracion().then(config => {
      setGeneralForm(prev => ({
        ...prev,
        ingresoMensual: config.ingresoMensual,
        valesDespensa: config.valesDespensa,
      }));
    });
  }, []);

  const validateGeneralForm = () => {
    const newErrors: Record<string, string> = {};

    if (generalForm.ingresoMensual <= 0) {
      newErrors.ingresoMensual = 'El ingreso debe ser mayor a 0';
    }
    if (generalForm.valesDespensa < 0) {
      newErrors.valesDespensa = 'Los vales no pueden ser negativos';
    }
    if (generalForm.renta < 0) {
      newErrors.renta = 'La renta no puede ser negativa';
    }
    if (generalForm.pagoCarro < 0) {
      newErrors.pagoCarro = 'El pago de carro no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveGeneral = async () => {
    if (!validateGeneralForm()) {
      toast.error('Por favor corrige los errores');
      return;
    }

    setIsLoading(true);
    try {
      await updateConfiguracion({
        ingresoMensual: generalForm.ingresoMensual,
        valesDespensa: generalForm.valesDespensa,
      });
      toast.success('Configuración guardada', {
        description: 'Los cambios se aplicarán en el dashboard',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar', {
        description: 'Por favor intenta de nuevo',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDeudas = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading('Guardando saldos...');

    try {
      let hasErrors = false;

      for (const deuda of deudas) {
        const form = deudaForms[deuda.id];
        if (form) {
          if (form.saldoActual < 0 || form.pagoMinimo < 0) {
            hasErrors = true;
            continue;
          }
          await updateDeuda(deuda.id, {
            saldoActual: form.saldoActual,
            pagoMinimo: form.pagoMinimo,
            liquidada: form.saldoActual === 0,
          });
        }
      }

      toast.dismiss(loadingToast);

      if (hasErrors) {
        toast.warning('Algunos saldos no se guardaron', {
          description: 'Verifica que todos los valores sean positivos',
        });
      } else {
        toast.success('Saldos actualizados', {
          description: `${deudas.length} deudas actualizadas correctamente`,
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error saving deudas:', error);
      toast.error('Error al guardar los saldos', {
        description: 'Por favor intenta de nuevo',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeudaChange = (deudaId: string, field: 'saldoActual' | 'pagoMinimo', value: number) => {
    setDeudaForms(prev => ({
      ...prev,
      [deudaId]: {
        ...prev[deudaId],
        [field]: value,
      },
    }));
  };

  const handleResetDeuda = (deuda: Deuda) => {
    setDeudaForms(prev => ({
      ...prev,
      [deuda.id]: {
        saldoActual: deuda.saldoActual,
        pagoMinimo: deuda.pagoMinimo,
      },
    }));
    toast.info('Valores restaurados');
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'deudas', label: 'Deudas', icon: CreditCard },
    { id: 'suscripciones', label: 'Suscripciones', icon: DollarSign },
    { id: 'exportar', label: 'Exportar', icon: Download },
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
                  value={generalForm.ingresoMensual}
                  onChange={(e) => setGeneralForm({ ...generalForm, ingresoMensual: parseFloat(e.target.value) || 0 })}
                  className={`input-dark pl-8 ${errors.ingresoMensual ? 'border-red-500' : ''}`}
                  min="0"
                />
              </div>
              {errors.ingresoMensual && (
                <p className="text-red-400 text-xs mt-1">{errors.ingresoMensual}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Vales de despensa
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                <input
                  type="number"
                  value={generalForm.valesDespensa}
                  onChange={(e) => setGeneralForm({ ...generalForm, valesDespensa: parseFloat(e.target.value) || 0 })}
                  className={`input-dark pl-8 ${errors.valesDespensa ? 'border-red-500' : ''}`}
                  min="0"
                />
              </div>
              {errors.valesDespensa && (
                <p className="text-red-400 text-xs mt-1">{errors.valesDespensa}</p>
              )}
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
                    value={generalForm.renta}
                    onChange={(e) => setGeneralForm({ ...generalForm, renta: parseFloat(e.target.value) || 0 })}
                    className={`input-dark pl-8 ${errors.renta ? 'border-red-500' : ''}`}
                    min="0"
                  />
                </div>
                {errors.renta && (
                  <p className="text-red-400 text-xs mt-1">{errors.renta}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Pago de carro
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input
                    type="number"
                    value={generalForm.pagoCarro}
                    onChange={(e) => setGeneralForm({ ...generalForm, pagoCarro: parseFloat(e.target.value) || 0 })}
                    className={`input-dark pl-8 ${errors.pagoCarro ? 'border-red-500' : ''}`}
                    min="0"
                  />
                </div>
                {errors.pagoCarro && (
                  <p className="text-red-400 text-xs mt-1">{errors.pagoCarro}</p>
                )}
              </div>
            </div>

            <button
              onClick={handleSaveGeneral}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
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
            {deudas.map((deuda) => {
              const form = deudaForms[deuda.id] || { saldoActual: deuda.saldoActual, pagoMinimo: deuda.pagoMinimo };
              const hasChanged = form.saldoActual !== deuda.saldoActual || form.pagoMinimo !== deuda.pagoMinimo;

              return (
                <div key={deuda.id} className={`p-4 rounded-xl transition-all ${
                  hasChanged ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-white/5'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        deuda.cat > 100 ? 'bg-red-500' :
                        deuda.cat > 60 ? 'bg-orange-500' : 'bg-green-500'
                      }`} />
                      <span className="font-medium text-white">{deuda.nombre}</span>
                      <span className="text-xs text-white/40 capitalize">({deuda.titular})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasChanged && (
                        <button
                          onClick={() => handleResetDeuda(deuda)}
                          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                          title="Restaurar valores"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-white/40" />
                        </button>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-lg ${
                        deuda.cat > 100 ? 'bg-red-500/20 text-red-400' :
                        deuda.cat > 60 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        CAT {deuda.cat}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Saldo actual</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                        <input
                          type="number"
                          value={form.saldoActual}
                          onChange={(e) => handleDeudaChange(deuda.id, 'saldoActual', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 pl-7 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
                          min="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Pago mínimo</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                        <input
                          type="number"
                          value={form.pagoMinimo}
                          onChange={(e) => handleDeudaChange(deuda.id, 'pagoMinimo', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 pl-7 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              onClick={handleSaveDeudas}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
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

      {/* Exportar Tab */}
      {activeTab === 'exportar' && (
        <ExportData />
      )}
    </div>
  );
}
