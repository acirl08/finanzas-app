// ============================================
// FUNCIONES UTILITARIAS COMPARTIDAS
// ============================================

/**
 * Formatea un número como moneda mexicana
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea un número como moneda compacta (ej: $45.5k)
 */
export function formatMoneyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return formatMoney(amount);
}

/**
 * Formatea una fecha en español
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-MX', options || { month: 'short', year: 'numeric' });
}

/**
 * Obtiene el mes y año actual en formato YYYY-MM
 */
export function getMesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Nombres de los meses en español (cortos)
 */
export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Nombres de los meses en español (largos)
 */
export const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
