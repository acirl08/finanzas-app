'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Utensils,
  Car,
  Heart,
  Sparkles,
  Package,
  Check,
  AlertCircle,
} from 'lucide-react';
import { addGasto } from '@/lib/firestore';
import { metodosPago } from '@/lib/data';
import { toast } from 'sonner';
import { useMonth } from '@/contexts/MonthContext';
import { useGastosDelMes } from '@/hooks/useGastosFilters';
import { useFirestore } from '@/contexts/FirestoreContext';

const QUICK_CATEGORIES = [
  { id: 'super',           label: 'Súper',       icon: ShoppingCart, esVales: true  },
  { id: 'restaurantes',    label: 'Comida',      icon: Utensils,     esVales: false },
  { id: 'transporte',      label: 'Transporte',  icon: Car,          esVales: false },
  { id: 'salud',           label: 'Salud',       icon: Heart,        esVales: false },
  { id: 'entretenimiento', label: 'Diversión',   icon: Sparkles,     esVales: false },
  { id: 'otros_gustos',    label: 'Otros',       icon: Package,      esVales: false },
] as const;

const QUICK_AMOUNTS = [50, 100, 200, 500];

const TITULAR_OPTIONS = [
  { value: 'alejandra',  label: 'Ale' },
  { value: 'ricardo',    label: 'Ricardo' },
  { value: 'compartido', label: 'Ambos' },
] as const;

interface QuickAddProps {
  defaultTitular?: 'alejandra' | 'ricardo' | 'compartido';
  onSuccess?: () => void;
}

export default function QuickAdd({ defaultTitular = 'alejandra', onSuccess }: QuickAddProps) {
  const { selectedMonth } = useMonth();
  const { gastos } = useFirestore();
  const [monto, setMonto] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [titular, setTitular] = useState<'alejandra' | 'ricardo' | 'compartido'>(defaultTitular);
  const [metodoPago, setMetodoPago] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const metodosFiltrados = metodosPago.filter(
    (m) => m.titular === null || m.titular === titular || titular === 'compartido'
  );

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const gastosData = useGastosDelMes(gastos, selectedMonth);

  const budgetInfo = useMemo(() => {
    const { disponibleVariables, daysRemaining } = gastosData;
    const presupuestoDiario = Math.max(0, Math.floor(disponibleVariables / daysRemaining));
    return { presupuestoDiario, disponible: disponibleVariables };
  }, [gastosData]);

  const handleSubmit = async (categoryId: string) => {
    const montoNum = Number(monto);
    if (!monto || montoNum <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const categoria = QUICK_CATEGORIES.find((c) => c.id === categoryId);
      await addGasto({
        fecha: new Date().toISOString().split('T')[0],
        descripcion: categoria?.label || categoryId,
        monto: montoNum,
        categoria: categoryId,
        titular,
        conVales: categoria?.esVales || false,
        metodoPago: metodoPago || undefined,
      });

      setShowSuccess(true);
      toast.success(`$${montoNum.toLocaleString()} registrado`, {
        description: `${categoria?.label} · ${titular === 'alejandra' ? 'Ale' : titular === 'ricardo' ? 'Ricardo' : 'Compartido'}`,
      });

      setTimeout(() => {
        setMonto('');
        setSelectedCategory(null);
        setShowSuccess(false);
        onSuccess?.();
        inputRef.current?.focus();
      }, 1400);
    } catch (error) {
      console.error('Error saving gasto:', error);
      toast.error('Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (monto && Number(monto) > 0) {
      handleSubmit(categoryId);
    }
  };

  const montoNum = Number(monto) || 0;
  const exceedsDaily = montoNum > budgetInfo.presupuestoDiario && budgetInfo.presupuestoDiario > 0;

  if (showSuccess) {
    return (
      <div className="surface-raised flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 rounded-full bg-sage-500 flex items-center justify-center mb-4">
          <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <p className="font-serif text-2xl text-ink-900">Registrado</p>
        <p className="text-sm text-ink-500 mt-1">Siguiente gasto en un momento…</p>
      </div>
    );
  }

  return (
    <div className="surface-raised p-6 sm:p-8 space-y-8">
      {/* Hero amount */}
      <div>
        <label className="text-label">Monto</label>
        <div className="relative mt-2">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 font-serif text-5xl sm:text-6xl text-ink-300">
            $
          </span>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent border-0 pl-10 sm:pl-14 pr-2 font-serif text-5xl sm:text-6xl text-ink-900 placeholder:text-ink-200 focus:outline-none tabular-nums"
            aria-label="Monto del gasto"
          />
        </div>

        {exceedsDaily && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-honey-50 border border-honey-100">
            <AlertCircle className="w-4 h-4 text-honey-600 mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-honey-600 leading-snug">
              Excede tu presupuesto diario de{' '}
              <span className="font-medium">${budgetInfo.presupuestoDiario.toLocaleString()}</span>
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amount) => {
            const active = Number(monto) === amount;
            return (
              <button
                key={amount}
                type="button"
                onClick={() => setMonto(amount.toString())}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-ink-900 text-app'
                    : 'bg-subtle text-ink-500 hover:bg-ink-100 hover:text-ink-900'
                }`}
              >
                ${amount}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divider" />

      {/* Titular */}
      <div>
        <label className="text-label">¿De quién?</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TITULAR_OPTIONS.map((option) => {
            const active = titular === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTitular(option.value);
                  setMetodoPago('');
                }}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-sage-50 border-sage-200 text-sage-700'
                    : 'bg-surface border-ink-100 text-ink-500 hover:border-ink-200 hover:text-ink-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Método de pago */}
      <div>
        <label htmlFor="metodo-pago" className="text-label">
          Método de pago <span className="text-ink-300 normal-case tracking-normal">(opcional)</span>
        </label>
        <select
          id="metodo-pago"
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value)}
          className="field mt-2 cursor-pointer"
        >
          <option value="">Selecciona…</option>
          {metodosFiltrados.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Categorías */}
      <div>
        <label className="text-label">Categoría</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {QUICK_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const selected = selectedCategory === cat.id;
            const disabled = !monto || isSubmitting;

            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                disabled={disabled}
                className={`relative group flex flex-col items-center justify-center gap-2 py-5 rounded-lg border transition-all ${
                  selected
                    ? 'bg-sage-50 border-sage-500 text-sage-700'
                    : 'bg-surface border-ink-100 text-ink-500 hover:border-ink-300 hover:text-ink-900 hover:bg-subtle'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.75} />
                <span className="text-[13px] font-medium">{cat.label}</span>
                {cat.esVales && (
                  <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-dust-50 text-dust-600 border border-dust-100">
                    Vales
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[13px] text-ink-400 text-center mt-4">
          {!monto
            ? 'Escribe el monto para activar las categorías'
            : isSubmitting
            ? 'Guardando…'
            : 'Toca una categoría para guardar'}
        </p>
      </div>
    </div>
  );
}
