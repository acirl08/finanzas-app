'use client';

import { useState } from 'react';
import { categorias } from '@/lib/data';
import { PlusCircle, X, CreditCard, Wallet, CheckCircle2 } from 'lucide-react';

interface GastoFormProps {
  onClose?: () => void;
  onSubmit?: (gasto: any) => void;
}

export default function GastoForm({ onClose, onSubmit }: GastoFormProps) {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'otros',
    descripcion: '',
    monto: '',
    titular: 'alejandra',
    tarjeta: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const tarjetas = [
    'Efectivo',
    'Vales de despensa',
    'Rappi',
    'Nu (Ale)',
    'HEB Afirme',
    'Amex Gold',
    'Santander LikeU',
    'Amex Platinum (Ricardo)',
    'Nu (Ricardo)',
    'BBVA (Ricardo)',
    'Banorte/Invex',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const gasto = {
      ...formData,
      monto: parseFloat(formData.monto),
      id: Date.now().toString(),
    };

    // Guardar en localStorage
    const existingGastos = JSON.parse(localStorage.getItem('finanzas-gastos') || '[]');
    existingGastos.push(gasto);
    localStorage.setItem('finanzas-gastos', JSON.stringify(existingGastos));

    if (onSubmit) {
      onSubmit(gasto);
    }

    setSuccess(true);
    setIsSubmitting(false);

    // Reset form
    setTimeout(() => {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        categoria: 'otros',
        descripcion: '',
        monto: '',
        titular: 'alejandra',
        tarjeta: '',
      });
      setSuccess(false);
    }, 2000);
  };

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Nuevo Gasto</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        )}
      </div>

      {success ? (
        <div className="p-8 bg-green-500/10 border border-green-500/30 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-green-400 font-semibold text-lg">Gasto registrado</p>
          <p className="text-white/50 text-sm mt-1">Se agregó correctamente</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="input-dark"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Monto
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">$</span>
                <input
                  type="number"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="input-dark pl-8"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Descripción
            </label>
            <input
              type="text"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="input-dark"
              placeholder="¿En qué gastaste?"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Categoría
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="input-dark"
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                ¿Quién gastó?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'alejandra', label: 'Ale', color: 'pink' },
                  { value: 'ricardo', label: 'Ricardo', color: 'blue' },
                  { value: 'compartido', label: 'Ambos', color: 'green' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, titular: option.value })}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                      formData.titular === option.value
                        ? option.color === 'pink'
                          ? 'bg-pink-500 text-white'
                          : option.color === 'blue'
                          ? 'bg-blue-500 text-white'
                          : 'bg-green-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Método de pago
            </label>
            <div className="relative">
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <select
                value={formData.tarjeta}
                onChange={(e) => setFormData({ ...formData, tarjeta: e.target.value })}
                className="input-dark pl-11"
              >
                <option value="">Seleccionar método...</option>
                {tarjetas.map((tarjeta) => (
                  <option key={tarjeta} value={tarjeta}>
                    {tarjeta}
                  </option>
                ))}
              </select>
            </div>
            {formData.tarjeta && formData.tarjeta !== 'Efectivo' && formData.tarjeta !== 'Vales de despensa' && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-xs text-red-400 flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  Recuerda: Estamos tratando de NO usar las tarjetas de crédito
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                Registrar Gasto
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
