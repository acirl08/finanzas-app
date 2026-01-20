'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, ShoppingCart, Utensils, Car, Heart, Sparkles, Package, Check, X } from 'lucide-react';
import { addGasto } from '@/lib/firestore';
import { toast } from 'sonner';

// 6 categorías simplificadas para quick-add
const QUICK_CATEGORIES = [
  { id: 'super', label: 'Súper', icon: ShoppingCart, color: 'from-blue-500 to-cyan-500', esVales: true },
  { id: 'restaurantes', label: 'Comida', icon: Utensils, color: 'from-orange-500 to-amber-500', esVales: false },
  { id: 'transporte', label: 'Transporte', icon: Car, color: 'from-emerald-500 to-green-500', esVales: false },
  { id: 'salud', label: 'Salud', icon: Heart, color: 'from-red-500 to-pink-500', esVales: false },
  { id: 'entretenimiento', label: 'Diversión', icon: Sparkles, color: 'from-purple-500 to-violet-500', esVales: false },
  { id: 'otros_gustos', label: 'Otros', icon: Package, color: 'from-gray-500 to-slate-500', esVales: false },
];

interface QuickAddProps {
  defaultTitular?: 'alejandra' | 'ricardo' | 'compartido';
  onSuccess?: () => void;
}

export default function QuickAdd({ defaultTitular = 'alejandra', onSuccess }: QuickAddProps) {
  const [monto, setMonto] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [titular, setTitular] = useState<'alejandra' | 'ricardo' | 'compartido'>(defaultTitular);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus en el input cuando se monta
  useEffect(() => {
    // Small delay to ensure smooth animation
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!monto || !selectedCategory) return;

    const montoNum = Number(monto);
    if (montoNum <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const categoria = QUICK_CATEGORIES.find(c => c.id === selectedCategory);

      await addGasto({
        fecha: new Date().toISOString().split('T')[0],
        descripcion: categoria?.label || selectedCategory,
        monto: montoNum,
        categoria: selectedCategory,
        titular: titular,
        conVales: categoria?.esVales || false,
      });

      // Show success state
      setShowSuccess(true);
      toast.success(`$${montoNum.toLocaleString()} registrado`, {
        description: `${categoria?.label} - ${titular === 'alejandra' ? 'Ale' : titular === 'ricardo' ? 'Ricardo' : 'Compartido'}`,
      });

      // Reset after animation
      setTimeout(() => {
        setMonto('');
        setSelectedCategory(null);
        setShowSuccess(false);
        onSuccess?.();
      }, 1500);

    } catch (error) {
      console.error('Error saving gasto:', error);
      toast.error('Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Si ya hay monto, enviar automáticamente
    if (monto && Number(monto) > 0) {
      setTimeout(handleSubmit, 100);
    }
  };

  const canSubmit = monto && Number(monto) > 0 && selectedCategory;

  // Success animation
  if (showSuccess) {
    return (
      <div className="glass-card bg-gradient-to-br from-emerald-500/20 to-green-500/10 border-emerald-500/30">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
            <Check className="w-8 h-8 text-white" />
          </div>
          <p className="text-emerald-400 font-semibold text-lg">Registrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Plus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Registrar Gasto</h3>
          <p className="text-xs text-white/50">Rápido y fácil</p>
        </div>
      </div>

      {/* Monto Input - BIG and prominent */}
      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-white/40 font-bold">$</span>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl pl-12 pr-4 py-5 text-4xl font-bold text-white text-center placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Titular selector - pequeño */}
      <div className="flex gap-2 mb-4">
        {[
          { value: 'alejandra' as const, label: 'Ale', color: 'pink' },
          { value: 'ricardo' as const, label: 'Ricardo', color: 'blue' },
          { value: 'compartido' as const, label: 'Ambos', color: 'green' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTitular(option.value)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              titular === option.value
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

      {/* Categories Grid - 2 taps */}
      <div className="grid grid-cols-3 gap-2">
        {QUICK_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              disabled={isSubmitting || !monto}
              className={`
                relative p-3 rounded-xl border-2 transition-all
                ${isSelected
                  ? `bg-gradient-to-br ${cat.color} border-white/30 scale-95`
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }
                ${!monto ? 'opacity-40 cursor-not-allowed' : ''}
                ${isSubmitting ? 'opacity-50' : ''}
              `}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-white/70'}`} />
                <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-white/70'}`}>
                  {cat.label}
                </span>
              </div>
              {cat.esVales && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                  Vales
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-center text-white/30 text-xs mt-4">
        {!monto
          ? 'Escribe el monto primero'
          : !selectedCategory
          ? 'Ahora toca una categoría para guardar'
          : 'Guardando...'
        }
      </p>
    </div>
  );
}
