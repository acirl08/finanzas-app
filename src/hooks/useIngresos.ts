'use client';

import { useState, useEffect, useMemo } from 'react';
import { subscribeToIngresos, Ingreso } from '@/lib/firestore';
import { INGRESO_MENSUAL } from '@/lib/data';
import { useMonth } from '@/contexts/MonthContext';

/**
 * Hook para obtener los ingresos del mes seleccionado.
 * Retorna los ingresos reales registrados, o el valor fijo como fallback.
 */
export function useIngresosMes() {
  const { selectedMonth } = useMonth();
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToIngresos((data) => {
      setIngresos(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const data = useMemo(() => {
    const ingresosDelMes = ingresos.filter(i => i.fecha.startsWith(selectedMonth));
    const totalIngresos = ingresosDelMes.reduce((sum, i) => sum + i.monto, 0);

    // Usar ingresos reales si hay registrados, sino el default
    const ingresoMensual = totalIngresos > 0 ? totalIngresos : INGRESO_MENSUAL;
    const usandoDefault = totalIngresos === 0;

    return {
      ingresos: ingresosDelMes,
      totalIngresos,
      ingresoMensual,
      usandoDefault,
      loading,
    };
  }, [ingresos, loading, selectedMonth]);

  return data;
}

/**
 * Función helper para calcular ingresos del mes (para uso en APIs/server)
 */
export function calcularIngresosMes(ingresos: Ingreso[], mes?: string): number {
  const mesTarget = mes || new Date().toISOString().slice(0, 7);
  const ingresosDelMes = ingresos.filter(i => i.fecha.startsWith(mesTarget));
  const total = ingresosDelMes.reduce((sum, i) => sum + i.monto, 0);
  return total > 0 ? total : INGRESO_MENSUAL;
}
