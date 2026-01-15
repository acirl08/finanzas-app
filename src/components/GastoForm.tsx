'use client';

import { useState } from 'react';
import { categorias } from '@/lib/data';
import { PlusCircle, X } from 'lucide-react';

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

    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 500));

    const gasto = {
      ...formData,
      monto: parseFloat(formData.monto),
      id: Date.now().toString(),
    };

    console.log('Gasto registrado:', gasto);

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
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-purple-600" />
          Registrar Gasto
        </h2>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {success ? (
        <div className="p-6 bg-green-50 rounded-lg text-center">
          <div className="text-4xl mb-2">✓</div>
          <p className="text-green-700 font-semibold">Gasto registrado correctamente</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="input pl-8"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="input"
              placeholder="¿En qué gastaste?"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="input"
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ¿Quién gastó?
              </label>
              <select
                value={formData.titular}
                onChange={(e) => setFormData({ ...formData, titular: e.target.value })}
                className="input"
              >
                <option value="alejandra">Alejandra</option>
                <option value="ricardo">Ricardo</option>
                <option value="compartido">Compartido</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <select
              value={formData.tarjeta}
              onChange={(e) => setFormData({ ...formData, tarjeta: e.target.value })}
              className="input"
            >
              <option value="">Seleccionar...</option>
              {tarjetas.map((tarjeta) => (
                <option key={tarjeta} value={tarjeta}>
                  {tarjeta}
                </option>
              ))}
            </select>
            {formData.tarjeta && formData.tarjeta !== 'Efectivo' && formData.tarjeta !== 'Vales de despensa' && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ Recuerda: Estamos tratando de NO usar las tarjetas
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Guardando...</span>
            ) : (
              <>
                <PlusCircle className="w-5 h-5" />
                Registrar Gasto
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
