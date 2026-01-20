'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  categoriasVales,
  categoriasEsenciales,
  categoriasGustos,
  categoriaLabels,
  getTipoCategoria,
  PRESUPUESTO_VARIABLE
} from '@/lib/data';
import { addGasto, subscribeToGastos, Gasto } from '@/lib/firestore';
import { safeGetJSON, safeSetJSON } from '@/lib/storage';
import { PlusCircle, X, CreditCard, Wallet, ChevronDown, ShoppingCart, Utensils, Car, Heart, Sparkles, Package } from 'lucide-react';
import { toast } from 'sonner';
import SpendingFrictionModal from './SpendingFrictionModal';

interface GastoFormProps {
  onClose?: () => void;
  onSubmit?: (gasto: any) => void;
}

// Categorías simplificadas para selección rápida móvil
const QUICK_CATEGORIES = [
  { key: 'super', label: 'Súper', icon: ShoppingCart, color: 'blue' },
  { key: 'restaurantes', label: 'Comida', icon: Utensils, color: 'orange' },
  { key: 'transporte', label: 'Transporte', icon: Car, color: 'emerald' },
  { key: 'salud', label: 'Salud', icon: Heart, color: 'red' },
  { key: 'entretenimiento', label: 'Diversión', icon: Sparkles, color: 'purple' },
  { key: 'otros_gustos', label: 'Otros', icon: Package, color: 'gray' },
];

// Montos rápidos sugeridos
const QUICK_AMOUNTS = [50, 100, 200, 500];

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const montoInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to gastos for daily budget calculation
  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
    });
    return () => unsubscribe();
  }, []);

  // Focus monto input on mount for quick entry
  useEffect(() => {
    setTimeout(() => {
      montoInputRef.current?.focus();
    }, 100);
  }, []);

  // Memoized budget calculations for friction modal
  const { presupuestoDiario, totalGastadoHoy } = useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);

    const mesActual = today.toISOString().slice(0, 7);
    const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesActual));
    const totalGastadoMes = gastosDelMes.reduce((sum, g) => sum + g.monto, 0);

    const hoy = today.toISOString().split('T')[0];
    const gastosHoyFiltered = gastos.filter(g => g.fecha === hoy);
    const totalGastadoHoy = gastosHoyFiltered.reduce((sum, g) => sum + g.monto, 0);

    const presupuestoRestante = PRESUPUESTO_VARIABLE - totalGastadoMes;
    const presupuestoDiario = Math.max(0, Math.floor(presupuestoRestante / daysRemaining));

    return { presupuestoDiario, totalGastadoHoy };
  }, [gastos]);

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

    if (!formData.monto || Number(formData.monto) <= 0) {
      newErrors.monto = 'El monto debe ser mayor a 0';
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
    const amount = Number(formData.monto);

    // Show friction for non-essential spending over $300
    if (!isEssential && amount > 300) {
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
        descripcion: formData.descripcion.trim() || categoriaLabels[formData.categoria] || formData.categoria,
        monto: Number(formData.monto),
        categoria: formData.categoria,
        titular: formData.titular,
      };

      // Guardar en Firebase
      await addGasto(gasto);

      // Also save to localStorage for backward compatibility
      const existingGastos = safeGetJSON<any[]>('finanzas-gastos', []);
      existingGastos.push({ ...gasto, id: Date.now().toString() });
      safeSetJSON('finanzas-gastos', existingGastos);

      if (onSubmit) {
        onSubmit(gasto);
      }

      toast.success('Gasto registrado', {
        description: `$${Number(formData.monto).toLocaleString()} en ${categoriaLabels[formData.categoria] || formData.categoria}`,
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
        setTimeout(onClose, 500);
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

  const handleFrictionConfirm = useCallback(() => {
    setShowFrictionModal(false);
    submitGasto();
  }, []);

  const handleFrictionClose = useCallback(() => {
    setShowFrictionModal(false);
    toast.info('Gasto cancelado', {
      description: 'Buena decisión pensar dos veces',
    });
  }, []);

  const handleQuickAmount = (amount: number) => {
    setFormData({ ...formData, monto: amount.toString() });
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { selected: string; unselected: string }> = {
      blue: { selected: 'bg-blue-500 text-white border-blue-500', unselected: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      orange: { selected: 'bg-orange-500 text-white border-orange-500', unselected: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
      emerald: { selected: 'bg-emerald-500 text-white border-emerald-500', unselected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
      red: { selected: 'bg-red-500 text-white border-red-500', unselected: 'bg-red-500/10 text-red-400 border-red-500/30' },
      purple: { selected: 'bg-purple-500 text-white border-purple-500', unselected: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      gray: { selected: 'bg-gray-500 text-white border-gray-500', unselected: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
    };
    return isSelected ? colors[color]?.selected : colors[color]?.unselected;
  };

  return (
    <>
      {/* Spending Friction Modal */}
      <SpendingFrictionModal
        isOpen={showFrictionModal}
        onClose={handleFrictionClose}
        onConfirm={handleFrictionConfirm}
        monto={Number(formData.monto) || 0}
        categoria={formData.categoria}
        descripcion={formData.descripcion}
        presupuestoDiario={presupuestoDiario}
        gastadoHoy={totalGastadoHoy}
      />

      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
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
          {/* MONTO - Lo más importante primero, grande y fácil de tocar */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold text-xl">$</span>
              <input
                ref={montoInputRef}
                type="number"
                inputMode="decimal"
                value={formData.monto}
                onChange={(e) => {
                  setFormData({ ...formData, monto: e.target.value });
                  if (errors.monto) setErrors({ ...errors, monto: '' });
                }}
                className={`w-full bg-white/5 border rounded-2xl pl-10 pr-4 py-4 text-3xl font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors ${
                  errors.monto ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-purple-500'
                }`}
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            {errors.monto && (
              <p className="text-red-400 text-xs mt-1">{errors.monto}</p>
            )}

            {/* Montos rápidos */}
            <div className="flex gap-2 mt-3">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleQuickAmount(amount)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    Number(formData.monto) === amount
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* CATEGORÍA - Botones grandes touch-friendly */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Categoría
            </label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = formData.categoria === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setFormData({ ...formData, categoria: cat.key })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 ${
                      getColorClasses(cat.color, isSelected)
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TITULAR - Botones grandes */}
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
                  className={`py-3.5 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
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

          {/* OPCIONES AVANZADAS - Colapsable */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors w-full justify-center py-2"
            >
              <span>{showAdvanced ? 'Ocultar opciones' : 'Más opciones'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-200">
                {/* Fecha */}
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
                    className="input-dark"
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={(e) => {
                      setFormData({ ...formData, descripcion: e.target.value });
                    }}
                    className="input-dark"
                    placeholder="¿En qué gastaste?"
                    maxLength={100}
                  />
                </div>

                {/* Método de pago */}
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
                      <p className="text-xs text-red-400">
                        ⚠️ Recuerda: Estamos tratando de NO usar las tarjetas de crédito
                      </p>
                    </div>
                  )}
                </div>

                {/* Categoría avanzada */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Categoría específica
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
                </div>
              </div>
            )}
          </div>

          {/* BOTÓN SUBMIT - Grande y llamativo */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.monto}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
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
