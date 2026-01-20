'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { categoriaLabels } from '@/lib/data';
import { Gasto, deleteGasto } from '@/lib/firestore';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

interface SwipeableGastoItemProps {
  gasto: Gasto;
  onEdit?: (gasto: Gasto) => void;
  onDelete?: (gastoId: string) => void;
}

const SWIPE_THRESHOLD = 80; // px to trigger action
const MAX_SWIPE = 120; // max swipe distance

export default function SwipeableGastoItem({ gasto, onEdit, onDelete }: SwipeableGastoItemProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // Reset swipe when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setSwipeOffset(0);
        setShowConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const currentTouch = e.targetTouches[0].clientX;
    const diff = touchStart - currentTouch;

    // Only allow left swipe (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, MAX_SWIPE));
    } else {
      // Allow right swipe to close
      setSwipeOffset(Math.max(diff, -swipeOffset));
    }

    setTouchEnd(currentTouch);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;

    const diff = touchStart - touchEnd;

    if (diff > SWIPE_THRESHOLD) {
      // Swiped left enough - show delete option
      setSwipeOffset(MAX_SWIPE);
      setShowConfirm(true);
    } else if (diff < -SWIPE_THRESHOLD / 2 && swipeOffset > 0) {
      // Swiped right - close
      setSwipeOffset(0);
      setShowConfirm(false);
    } else {
      // Didn't swipe enough - reset
      setSwipeOffset(0);
      setShowConfirm(false);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleDelete = async () => {
    if (!gasto.id) return;

    setIsDeleting(true);
    try {
      await deleteGasto(gasto.id);
      toast.success('Gasto eliminado', {
        description: `${formatMoney(gasto.monto)} - ${gasto.descripcion || categoriaLabels[gasto.categoria]}`,
      });
      if (onDelete) {
        onDelete(gasto.id);
      }
    } catch (error) {
      console.error('Error deleting gasto:', error);
      toast.error('Error al eliminar');
      setIsDeleting(false);
      setSwipeOffset(0);
      setShowConfirm(false);
    }
  };

  const handleEdit = () => {
    setSwipeOffset(0);
    setShowConfirm(false);
    if (onEdit) {
      onEdit(gasto);
    }
  };

  // Categoría íconos (simplified mapping)
  const getCategoryEmoji = (categoria: string) => {
    const emojis: Record<string, string> = {
      super: '🛒',
      frutas_verduras: '🥬',
      restaurantes: '🍽️',
      cafe_snacks: '☕',
      transporte: '🚗',
      gasolina: '⛽',
      salud: '💊',
      entretenimiento: '🎬',
      ropa: '👕',
      personal: '💅',
      hogar: '🏠',
      imprevistos: '❓',
      otros_gustos: '✨',
    };
    return emojis[categoria] || '📦';
  };

  const titularColors: Record<string, string> = {
    alejandra: 'bg-pink-500/20 text-pink-400',
    ricardo: 'bg-blue-500/20 text-blue-400',
    compartido: 'bg-green-500/20 text-green-400',
  };

  return (
    <div
      ref={itemRef}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Delete/Edit Action Background */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <div
          className={`flex items-center gap-2 pr-4 transition-opacity duration-200 ${
            swipeOffset > 0 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {onEdit && (
            <button
              onClick={handleEdit}
              className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        className="relative bg-white/5 border border-white/10 rounded-xl p-4 transition-transform duration-200 ease-out"
        style={{ transform: `translateX(-${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          {/* Category Emoji */}
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-lg">
            {getCategoryEmoji(gasto.categoria)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {gasto.descripcion || categoriaLabels[gasto.categoria] || gasto.categoria}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/50">
                {new Date(gasto.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${titularColors[gasto.titular || 'compartido']}`}>
                {gasto.titular === 'alejandra' ? 'Ale' : gasto.titular === 'ricardo' ? 'Ricardo' : 'Ambos'}
              </span>
              {gasto.conVales && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  Vales
                </span>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{formatMoney(gasto.monto)}</p>
          </div>

          {/* Hint indicator */}
          <div className={`transition-opacity ${swipeOffset === 0 ? 'opacity-30' : 'opacity-0'}`}>
            <MoreHorizontal className="w-4 h-4 text-white/40" />
          </div>
        </div>

        {/* Swipe hint on first load */}
        {swipeOffset === 0 && !showConfirm && (
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
            <div className="text-xs text-white/20">← Desliza</div>
          </div>
        )}
      </div>

      {/* Confirm Delete Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-red-500/95 rounded-xl flex items-center justify-center gap-4 animate-in fade-in duration-200">
          <button
            onClick={() => {
              setSwipeOffset(0);
              setShowConfirm(false);
            }}
            className="px-4 py-2 bg-white/20 rounded-lg text-white text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-white rounded-lg text-red-500 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
