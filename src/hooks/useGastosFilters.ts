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

// Filtrar gastos variables (no fijos, no vales, no imprevistos, no no_reconocido, no deuda)
export function filtrarGastosVariables(gastos: Gasto[]): Gasto[] {
  return gastos.filter(g => !g.esFijo && !g.conVales && g.categoria !== 'imprevistos' && g.categoria !== 'no_reconocido' && g.categoria !== 'deuda');
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
// Excluye 'no_reconocido' hasta que se identifiquen
export function filtrarGastosGustos(gastos: Gasto[]): Gasto[] {
  return gastos.filter(g =>
    !g.esFijo &&
    !g.conVales &&
    g.categoria !== 'imprevistos' &&
    g.categoria !== 'no_reconocido' &&
    g.categoria !== 'deuda' &&
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
    const mesActualSistema = getMesActual();
    const esMesActual = mesTarget === mesActualSistema;

    // Calcular días basándose en el MES SELECCIONADO, no en el mes actual del sistema
    const [year, month] = mesTarget.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate(); // Días del mes seleccionado

    // Si es el mes actual, usar el día de hoy. Si es un mes pasado, usar el último día del mes
    const today = new Date();
    const dayOfMonth = esMesActual ? today.getDate() : daysInMonth;
    const daysRemaining = esMesActual ? Math.max(1, daysInMonth - dayOfMonth + 1) : 1;

    // hoy: si es mes actual usa hoy, si es mes pasado usa último día del mes
    const hoy = esMesActual
      ? today.toISOString().split('T')[0]
      : `${mesTarget}-${String(daysInMonth).padStart(2, '0')}`;

    // Gastos del mes
    const gastosDelMes = filtrarGastosDelMes(gastos, mesTarget);

    // Categorías de gastos
    const gastosVariables = filtrarGastosVariables(gastosDelMes); // DEPRECATED: usar gastosGustos
    const gastosGustos = filtrarGastosGustos(gastosDelMes); // Solo gustos para presupuesto personal
    const gastosEsenciales = filtrarGastosEsenciales(gastosDelMes); // Esenciales compartidos
    const gastosConVales = filtrarGastosConVales(gastosDelMes);
    const gastosFijos = filtrarGastosFijos(gastosDelMes);
    const gastosImprevistos = filtrarImprevistos(gastosDelMes);

    // Totales
    const totalGustos = calcularTotal(gastosGustos); // Solo gustos contra $7K presupuesto
    const totalEsenciales = calcularTotal(gastosEsenciales); // Esenciales compartidos
    const totalVariables = totalGustos + totalEsenciales; // Total variable = gustos + esenciales
    const totalVales = calcularTotal(gastosConVales);
    const totalFijos = calcularTotal(gastosFijos);
    const totalImprevistos = calcularTotal(gastosImprevistos);
    const totalMes = totalVariables + totalVales + totalFijos + totalImprevistos;

    // Disponible (SOLO GUSTOS cuentan contra presupuesto personal)
    const disponibleGustos = PRESUPUESTO_GUSTOS - totalGustos;
    const disponibleVariables = disponibleGustos; // Alias para compatibilidad
    const disponibleVales = VALES_DESPENSA - totalVales;
    const disponibleImprevistos = PRESUPUESTO_IMPREVISTOS - totalImprevistos;

    // Presupuesto diario
    const presupuestoDiario = Math.max(0, Math.floor(disponibleVariables / daysRemaining));

    // Gastos de hoy (SOLO GUSTOS)
    const gastosHoy = gastosGustos.filter(g => g.fecha === hoy);
    const totalHoy = calcularTotal(gastosHoy);
    const disponibleHoy = Math.max(0, presupuestoDiario - totalHoy);

    // Porcentaje usado
    const porcentajeGustos = (totalGustos / PRESUPUESTO_GUSTOS) * 100;
    const porcentajeVariables = porcentajeGustos; // Alias
    const porcentajeVales = (totalVales / VALES_DESPENSA) * 100;
    const porcentajeImprevistos = (totalImprevistos / PRESUPUESTO_IMPREVISTOS) * 100;

    return {
      // Listas de gastos
      gastosDelMes,
      gastosVariables, // DEPRECATED: usar gastosGustos
      gastosGustos, // ✅ NEW: Solo gustos para presupuesto personal
      gastosEsenciales, // ✅ NEW: Esenciales compartidos
      gastosConVales,
      gastosFijos,
      gastosImprevistos,
      gastosHoy,

      // Totales
      totalMes,
      totalVariables, // Total gustos + esenciales
      totalGustos, // ✅ NEW: Solo gustos
      totalEsenciales, // ✅ NEW: Solo esenciales
      totalVales,
      totalFijos,
      totalImprevistos,
      totalHoy,

      // Disponible
      disponibleVariables, // Alias de disponibleGustos
      disponibleGustos, // ✅ NEW: Disponible de presupuesto gustos
      disponibleVales,
      disponibleImprevistos,
      disponibleHoy,
      presupuestoDiario,

      // Porcentajes
      porcentajeVariables, // Alias
      porcentajeGustos, // ✅ NEW: Porcentaje de gustos usado
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
        g => g.fecha === fechaStr && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos' && g.categoria !== 'no_reconocido' && g.categoria !== 'deuda'
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
