'use client';

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useMonth, formatMonth, getCurrentMonth } from '@/contexts/MonthContext';
import { subscribeToGastos, Gasto } from '@/lib/firestore';

interface MonthSelectorProps {
  gastos?: Gasto[];
  compact?: boolean;
}

export default function MonthSelector({ gastos, compact = false }: MonthSelectorProps) {
  const { selectedMonth, setSelectedMonth, isCurrentMonth, availableMonths, setAvailableMonths } = useMonth();

  // Actualizar meses disponibles cuando cambien los gastos
  useEffect(() => {
    if (gastos && gastos.length > 0) {
      const months = Array.from(
        new Set(gastos.map(g => g.fecha.slice(0, 7)))
      ).sort().reverse();

      // Asegurar que el mes actual siempre esté disponible
      const currentMonth = getCurrentMonth();
      if (!months.includes(currentMonth)) {
        months.unshift(currentMonth);
      }

      setAvailableMonths(months);
    }
  }, [gastos, setAvailableMonths]);

  const handlePrevMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(getCurrentMonth());
  };

  const canGoPrev = availableMonths.indexOf(selectedMonth) < availableMonths.length - 1;
  const canGoNext = availableMonths.indexOf(selectedMonth) > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 text-white/70" />
        </button>

        <button
          onClick={handleCurrentMonth}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            isCurrentMonth
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="capitalize">{formatMonth(selectedMonth)}</span>
        </button>

        <button
          onClick={handleNextMonth}
          disabled={!canGoNext}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4 text-white/70" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrevMonth}
        disabled={!canGoPrev}
        className="p-2 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Mes anterior"
      >
        <ChevronLeft className="w-5 h-5 text-white/70" />
      </button>

      <div className="flex flex-col items-center min-w-[140px]">
        <button
          onClick={handleCurrentMonth}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            isCurrentMonth
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="capitalize">{formatMonth(selectedMonth)}</span>
        </button>
        {!isCurrentMonth && (
          <button
            onClick={handleCurrentMonth}
            className="text-xs text-purple-400 hover:text-purple-300 mt-1 transition-colors"
          >
            Ir a mes actual
          </button>
        )}
      </div>

      <button
        onClick={handleNextMonth}
        disabled={!canGoNext}
        className="p-2 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Mes siguiente"
      >
        <ChevronRight className="w-5 h-5 text-white/70" />
      </button>
    </div>
  );
}
