'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MonthContextType {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  isCurrentMonth: boolean;
  availableMonths: string[];
  setAvailableMonths: (months: string[]) => void;
  previousMonth: string;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = selectedMonth === currentMonth;

  // Calcular mes anterior
  const previousMonth = (() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return prevDate.toISOString().slice(0, 7);
  })();

  // Al cambiar de mes en el calendario real, actualizar si estamos en mes actual
  useEffect(() => {
    const checkMonth = () => {
      const now = new Date().toISOString().slice(0, 7);
      if (selectedMonth === currentMonth && now !== currentMonth) {
        setSelectedMonth(now);
      }
    };

    // Revisar cada minuto por si cambia el mes
    const interval = setInterval(checkMonth, 60000);
    return () => clearInterval(interval);
  }, [selectedMonth, currentMonth]);

  return (
    <MonthContext.Provider value={{
      selectedMonth,
      setSelectedMonth,
      isCurrentMonth,
      availableMonths,
      setAvailableMonths,
      previousMonth,
    }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (context === undefined) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
}

// Helper para formatear mes
export function formatMonth(mes: string): string {
  const [year, month] = mes.split('-').map(Number);
  const date = new Date(year, month - 1, 15); // Usar día 15 para evitar problemas de timezone
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

// Helper para obtener mes actual
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
