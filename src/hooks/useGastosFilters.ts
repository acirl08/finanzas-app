'use client';

import { useMemo } from 'react';
import { Gasto } from '@/lib/firestore';
import {
  PRESUPUESTO_VARIABLE,
  PRESUPUESTO_IMPREVISTOS,
  PRESUPUESTO_GUSTOS,
  VALES_DESPENSA,
  presupuestosPersonales,
  categoriasEsenciales,
  categoriasVales
} from '@/lib/data';

/**
 * Hook centralizado para filtrar y calcular gastos.
 * Elimina la duplicación de lógica en 11+ componentes.
 */

// Obtener el mes actual en formato YYYY-MM
export function getMesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

// Obtener fecha de hoy en formato YYYY-MM-DD
export function getHoy(): string {
  return new Date().toISOString().split('T')[0];
}

// Filtrar gastos del mes actual
export function filtrarGastosDelMes(gastos: Gasto[], mes?: string): Gasto[] {
  const mesTarget = mes || getMesActual();
  return gastos.filter(g => g.fecha.startsWith(mesTarget));
}

// Filtrar gastos variables (no fijos, no vales, no imprevistos)
export function filtrarGastosVariables(gastos: Gasto[]): Gasto[] {
  return gastos.filter(g => !g.esFijo && !g.conVales && g.categoria !== 'imprevistos');
}

// Filtrar gastos esenciales (salud, transporte, hogar, gasolina, super sin vales)
export function filtrarGastosEsenciales(gastos: Gasto[]): Gasto[] {
  return gastos.filter(g =>
    !g.esFijo &&
    !g.conVales &&
    g.categoria !== 'imprevistos' &&
    (categoriasEsenciales.includes(g.categoria) || categoriasVales.includes(g.categoria))
  );
}

// Filtrar gastos de gustos (restaurantes, entretenimiento, personal, etc.)
// Estos son los que cuentan contra el presupuesto personal de cada quien
export function filtrarGastosGustos(gastos: Gasto[]): Gasto[] {
  return gastos.filter(g =>
    !g.esFijo &&
    !g.conVales &&
    g.categoria !== 'imprevistos' &&
    !categoriasEsenciales.includes(g.categoria) &&
    !categoriasVales.includes(g.categoria)
  );
}

// Filtrar gastos con vales
export function filtrarGastosConVales(gastos: Gasto[]): Gasto[] {
  return gastos.filter(g => g.conVales === true && !g.esFijo);
}

// Filtrar gastos fijos
export function filtrarGastosFijos(gastos: Gasto[]): Gasto[] {
  return gastos.filter(g => g.esFijo === true);
}

// Filtrar imprevistos
export function filtrarImprevistos(gastos: Gasto[]): Gasto[] {
  return gastos.filter(g => g.categoria === 'imprevistos');
}

// Filtrar por titular
export function filtrarPorTitular(gastos: Gasto[], titular: 'alejandra' | 'ricardo' | 'compartido'): Gasto[] {
  if (titular === 'compartido') {
    return gastos.filter(g => g.titular === 'compartido' || !g.titular);
  }
  return gastos.filter(g => g.titular === titular);
}

// Calcular total de gastos
export function calcularTotal(gastos: Gasto[]): number {
  return gastos.reduce((sum, g) => sum + g.monto, 0);
}

/**
 * Hook principal que retorna todos los cálculos de gastos del mes
 */
export function useGastosDelMes(gastos: Gasto[], mes?: string) {
  return useMemo(() => {
    const mesTarget = mes || getMesActual();
    const hoy = getHoy();
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);

    // Gastos del mes
    const gastosDelMes = filtrarGastosDelMes(gastos, mesTarget);

    // Categorías de gastos
    const gastosVariables = filtrarGastosVariables(gastosDelMes);
    const gastosConVales = filtrarGastosConVales(gastosDelMes);
    const gastosFijos = filtrarGastosFijos(gastosDelMes);
    const gastosImprevistos = filtrarImprevistos(gastosDelMes);

    // Totales
    const totalVariables = calcularTotal(gastosVariables);
    const totalVales = calcularTotal(gastosConVales);
    const totalFijos = calcularTotal(gastosFijos);
    const totalImprevistos = calcularTotal(gastosImprevistos);
    const totalMes = totalVariables + totalVales + totalFijos + totalImprevistos;

    // Disponible
    const disponibleVariables = PRESUPUESTO_VARIABLE - totalVariables;
    const disponibleVales = VALES_DESPENSA - totalVales;
    const disponibleImprevistos = PRESUPUESTO_IMPREVISTOS - totalImprevistos;

    // Presupuesto diario
    const presupuestoDiario = Math.max(0, Math.floor(disponibleVariables / daysRemaining));

    // Gastos de hoy
    const gastosHoy = gastosVariables.filter(g => g.fecha === hoy);
    const totalHoy = calcularTotal(gastosHoy);
    const disponibleHoy = Math.max(0, presupuestoDiario - totalHoy);

    // Porcentaje usado
    const porcentajeVariables = (totalVariables / PRESUPUESTO_VARIABLE) * 100;
    const porcentajeVales = (totalVales / VALES_DESPENSA) * 100;
    const porcentajeImprevistos = (totalImprevistos / PRESUPUESTO_IMPREVISTOS) * 100;

    return {
      // Listas de gastos
      gastosDelMes,
      gastosVariables,
      gastosConVales,
      gastosFijos,
      gastosImprevistos,
      gastosHoy,

      // Totales
      totalMes,
      totalVariables,
      totalVales,
      totalFijos,
      totalImprevistos,
      totalHoy,

      // Disponible
      disponibleVariables,
      disponibleVales,
      disponibleImprevistos,
      disponibleHoy,
      presupuestoDiario,

      // Porcentajes
      porcentajeVariables,
      porcentajeVales,
      porcentajeImprevistos,

      // Metadata
      mesActual: mesTarget,
      hoy,
      daysInMonth,
      dayOfMonth,
      daysRemaining,
    };
  }, [gastos, mes]);
}

/**
 * Hook para calcular gastos por titular
 * IMPORTANTE: Solo cuenta GUSTOS (restaurantes, entretenimiento, personal, etc.)
 * NO cuenta esenciales (salud, transporte, hogar, super sin vales)
 */
export function useGastosPorTitular(gastos: Gasto[], mes?: string) {
  return useMemo(() => {
    const mesTarget = mes || getMesActual();
    const gastosDelMes = filtrarGastosDelMes(gastos, mesTarget);
    // Usar gastosGustos, NO gastosVariables - solo gustos cuentan contra presupuesto personal
    const gastosGustos = filtrarGastosGustos(gastosDelMes);

    const calcularPorTitular = (titular: 'alejandra' | 'ricardo' | 'compartido') => {
      const gastosTitular = filtrarPorTitular(gastosGustos, titular);
      const total = calcularTotal(gastosTitular);
      const presupuesto = presupuestosPersonales[titular];
      const disponible = presupuesto - total;
      const porcentaje = (total / presupuesto) * 100;

      return {
        gastos: gastosTitular,
        total,
        presupuesto,
        disponible,
        porcentaje,
        excedido: total > presupuesto,
      };
    };

    return {
      alejandra: calcularPorTitular('alejandra'),
      ricardo: calcularPorTitular('ricardo'),
      compartido: calcularPorTitular('compartido'),
    };
  }, [gastos, mes]);
}

/**
 * Hook para calcular la racha (días bajo presupuesto)
 */
export function useRacha(gastos: Gasto[]) {
  return useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const presupuestoDiarioIdeal = PRESUPUESTO_VARIABLE / daysInMonth;

    let count = 0;
    for (let i = 0; i < dayOfMonth; i++) {
      const fecha = new Date(today.getFullYear(), today.getMonth(), dayOfMonth - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      const gastosDia = gastos.filter(
        g => g.fecha === fechaStr && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos'
      );
      const totalDia = calcularTotal(gastosDia);
      if (totalDia <= presupuestoDiarioIdeal) count++;
      else break;
    }

    return {
      dias: count,
      presupuestoDiarioIdeal,
    };
  }, [gastos]);
}

/**
 * Hook para agrupar gastos por categoría
 */
export function useGastosPorCategoria(gastos: Gasto[]) {
  return useMemo(() => {
    const agrupados: Record<string, { total: number; count: number; gastos: Gasto[] }> = {};

    gastos.forEach(g => {
      if (!agrupados[g.categoria]) {
        agrupados[g.categoria] = { total: 0, count: 0, gastos: [] };
      }
      agrupados[g.categoria].total += g.monto;
      agrupados[g.categoria].count += 1;
      agrupados[g.categoria].gastos.push(g);
    });

    return Object.entries(agrupados)
      .map(([categoria, data]) => ({ categoria, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [gastos]);
}

/**
 * Determinar status visual basado en porcentaje
 */
export function getStatusFromPorcentaje(porcentaje: number): 'green' | 'yellow' | 'red' {
  if (porcentaje <= 70) return 'green';
  if (porcentaje <= 100) return 'yellow';
  return 'red';
}

export const statusColors = {
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    label: 'En buen camino',
  },
  yellow: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
    label: 'Ten cuidado',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-500',
    label: 'Te pasaste',
  },
};
