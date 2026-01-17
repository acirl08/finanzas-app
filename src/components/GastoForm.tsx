'use client';

import { useState, useEffect } from 'react';
import {
  categoriasVales,
  categoriasEsenciales,
  categoriasGustos,
  categoriaLabels,
  getTipoCategoria,
  PRESUPUESTO_VARIABLE
} from '@/lib/data';
import { addGasto, subscribeToGastos, Gasto } from '@/lib/firestore';
import { PlusCircle, X, CreditCard, Wallet, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import SpendingFrictionModal from './SpendingFrictionModal';

interface GastoFormProps {
  onClose?: () => void;
  onSubmit?: (gasto: any) => void;
}

export default function GastoForm({ onClose, onSubmit }: GastoFormProps) {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'super',
    descripcion: '',
    monto: '',
    titular: 'alejandra' as 'alejandra' | 'ricardo' | 'compartido',
    tarjeta: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [gastos, setGastos] = useState<Gasto[]>([]);

  // Subscribe to gastos for daily budget calculation
  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
    });
    return () => unsubscribe();
  }, []);

  // Calculate daily budget for friction modal
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysRemaining = daysInMonth - dayOfMonth + 1;

  const mesActual = today.toISOString().slice(0, 7);
  const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesActual));
  const totalGastadoMes = gastosDelMes.reduce((sum, g) => sum + g.monto, 0);

  const hoy = today.toISOString().split('T')[0];
  const gastosHoy = gastos.filter(g => g.fecha === hoy);
  const totalGastadoHoy = gastosHoy.reduce((sum, g) => sum + g.monto, 0);

  const presupuestoRestante = PRESUPUESTO_VARIABLE - totalGastadoMes;
  const presupuestoDiario = Math.max(0, Math.floor(presupuestoRestante / daysRemaining));

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fecha) {
      newErrors.fecha = 'La fecha es requerida';
    }

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      newErrors.monto = 'El monto debe ser mayor a 0';
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }

    if (formData.descripcion.length > 100) {
      newErrors.descripcion = 'La descripción no puede tener más de 100 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Categories that are essential (no friction needed) - vales and esenciales
  const ESSENTIAL_CATEGORIES = [...categoriasVales, ...categoriasEsenciales];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor corrige los errores del formulario');
      return;
    }

    // Check if we need to show friction modal for non-essential spending
    const isEssential = ESSENTIAL_CATEGORIES.includes(formData.categoria.toLowerCase());
    const amount = parseFloat(formData.monto);

    // Show friction for non-essential spending over $100
    if (!isEssential && amount > 100) {
      setShowFrictionModal(true);
      return;
    }

    // Proceed with submission
    await submitGasto();
  };

  const submitGasto = async () => {
    setIsSubmitting(true);

    try {
      const gasto = {
        fecha: formData.fecha,
        descripcion: formData.descripcion.trim(),
        monto: parseFloat(formData.monto),
        categoria: formData.categoria,
        titular: formData.titular,
      };

      // Guardar en Firebase
      await addGasto(gasto);

      // Also save to localStorage for backward compatibility
      const existingGastos = JSON.parse(localStorage.getItem('finanzas-gastos') || '[]');
      existingGastos.push({ ...gasto, id: Date.now().toString() });
      localStorage.setItem('finanzas-gastos', JSON.stringify(existingGastos));

      if (onSubmit) {
        onSubmit(gasto);
      }

      toast.success('Gasto registrado exitosamente', {
        description: `$${parseFloat(formData.monto).toLocaleString()} en ${formData.categoria}`,
      });

      // Reset form
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        categoria: 'super',
        descripcion: '',
        monto: '',
        titular: 'alejandra',
        tarjeta: '',
      });
      setErrors({});
      setShowFrictionModal(false);

      if (onClose) {
        setTimeout(onClose, 1500);
      }
    } catch (error) {
      console.error('Error saving gasto:', error);
      toast.error('Error al guardar el gasto', {
        description: 'Por favor intenta de nuevo',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFrictionConfirm = () => {
    setShowFrictionModal(false);
    submitGasto();
  };

  const handleFrictionClose = () => {
    setShowFrictionModal(false);
    toast.info('Gasto cancelado', {
      description: 'Buena decisión pensar dos veces',
    });
  };

  return (
    <>
      {/* Spending Friction Modal */}
      <SpendingFrictionModal
        isOpen={showFrictionModal}
        onClose={handleFrictionClose}
        onConfirm={handleFrictionConfirm}
        monto={parseFloat(formData.monto) || 0}
        categoria={formData.categoria}
        descripcion={formData.descripcion}
        presupuestoDiario={presupuestoDiario}
        gastadoHoy={totalGastadoHoy}
      />

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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Fecha
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => {
                setFormData({ ...formData, fecha: e.target.value });
                if (errors.fecha) setErrors({ ...errors, fecha: '' });
              }}
              className={`input-dark ${errors.fecha ? 'border-red-500 focus:border-red-500' : ''}`}
              required
            />
            {errors.fecha && (
              <p className="text-red-400 text-xs mt-1">{errors.fecha}</p>
            )}
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
                onChange={(e) => {
                  setFormData({ ...formData, monto: e.target.value });
                  if (errors.monto) setErrors({ ...errors, monto: '' });
                }}
                className={`input-dark pl-8 ${errors.monto ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
            {errors.monto && (
              <p className="text-red-400 text-xs mt-1">{errors.monto}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Descripción
          </label>
          <input
            type="text"
            value={formData.descripcion}
            onChange={(e) => {
              setFormData({ ...formData, descripcion: e.target.value });
              if (errors.descripcion) setErrors({ ...errors, descripcion: '' });
            }}
            className={`input-dark ${errors.descripcion ? 'border-red-500 focus:border-red-500' : ''}`}
            placeholder="¿En qué gastaste?"
            maxLength={100}
            required
          />
          <div className="flex justify-between mt-1">
            {errors.descripcion ? (
              <p className="text-red-400 text-xs">{errors.descripcion}</p>
            ) : (
              <span></span>
            )}
            <span className="text-xs text-white/30">{formData.descripcion.length}/100</span>
          </div>
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
              <optgroup label="🛒 Vales de Despensa">
                {categoriasVales.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoriaLabels[cat] || cat}
                  </option>
                ))}
              </optgroup>
              <optgroup label="📋 Esenciales">
                {categoriasEsenciales.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoriaLabels[cat] || cat}
                  </option>
                ))}
              </optgroup>
              <optgroup label="✨ Gustos">
                {categoriasGustos.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoriaLabels[cat] || cat}
                  </option>
                ))}
              </optgroup>
            </select>
            {/* Category type indicator */}
            <div className="mt-2">
              {getTipoCategoria(formData.categoria) === 'vales' && (
                <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
                  🛒 Se paga con vales de despensa
                </span>
              )}
              {getTipoCategoria(formData.categoria) === 'esencial' && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                  📋 Gasto esencial
                </span>
              )}
              {getTipoCategoria(formData.categoria) === 'gusto' && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                  ✨ Gusto personal
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              ¿Quién gastó?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'alejandra' as const, label: 'Ale', color: 'pink' },
                { value: 'ricardo' as const, label: 'Ricardo', color: 'blue' },
                { value: 'compartido' as const, label: 'Ambos', color: 'green' },
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
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </>
  );
}
