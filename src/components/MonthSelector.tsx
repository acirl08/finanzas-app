'use client';

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useMonth, formatMonth, getCurrentMonth } from '@/contexts/MonthContext';
import { Gasto } from '@/lib/firestore';

interface MonthSelectorProps {
  gastos?: Gasto[];
  compact?: boolean;
}

export default function MonthSelector({ gastos, compact = false }: MonthSelectorProps) {
  const { selectedMonth, setSelectedMonth, isCurrentMonth, availableMonths, setAvailableMonths } = useMonth();

  useEffect(() => {
    if (gastos && gastos.length > 0) {
      const months = Array.from(
        new Set(gastos.map(g => g.fecha.slice(0, 7)))
      ).sort().reverse();

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

  const iconSize = compact ? 'w-4 h-4' : 'w-5 h-5';
  const btnPad = compact ? 'p-1.5' : 'p-2';

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handlePrevMonth}
        disabled={!canGoPrev}
        className={`${btnPad} rounded-md text-ink-500 hover:bg-subtle hover:text-ink-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="Mes anterior"
      >
        <ChevronLeft className={iconSize} />
      </button>

      <button
        onClick={handleCurrentMonth}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
          isCurrentMonth
            ? 'text-ink-900 hover:bg-subtle'
            : 'pill pill-honey'
        }`}
      >
        <Calendar className="w-3.5 h-3.5" />
        <span className="capitalize">{formatMonth(selectedMonth)}</span>
      </button>

      <button
        onClick={handleNextMonth}
        disabled={!canGoNext}
        className={`${btnPad} rounded-md text-ink-500 hover:bg-subtle hover:text-ink-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="Mes siguiente"
      >
        <ChevronRight className={iconSize} />
      </button>
    </div>
  );
}
