import { Deuda, GastoFijo, Suscripcion } from '@/types';

export const deudasIniciales: Deuda[] = [
  {
    id: '1',
    nombre: 'Rappi',
    titular: 'alejandra',
    saldoInicial: 14403,
    saldoActual: 14403,
    cat: 157.3,
    pagoMinimo: 1500,
    prioridad: 1,
    liquidada: false,
  },
  {
    id: '2',
    nombre: 'Nu',
    titular: 'alejandra',
    saldoInicial: 6245,
    saldoActual: 6245,
    cat: 156.8,
    pagoMinimo: 800,
    prioridad: 2,
    liquidada: false,
  },
  {
    id: '3',
    nombre: 'HEB Afirme',
    titular: 'alejandra',
    saldoInicial: 39834,
    saldoActual: 39834,
    cat: 131.9,
    pagoMinimo: 4000,
    prioridad: 3,
    liquidada: false,
  },
  {
    id: '4',
    nombre: 'Amex Gold',
    titular: 'alejandra',
    saldoInicial: 91622,
    saldoActual: 91622,
    cat: 82.4,
    pagoMinimo: 6498,
    prioridad: 4,
    liquidada: false,
  },
  {
    id: '5',
    nombre: 'Amex Platinum',
    titular: 'ricardo',
    saldoInicial: 870,
    saldoActual: 870,
    cat: 78,
    pagoMinimo: 200,
    prioridad: 5,
    liquidada: false,
  },
  {
    id: '6',
    nombre: 'Nu',
    titular: 'ricardo',
    saldoInicial: 9917,
    saldoActual: 9917,
    cat: 63,
    pagoMinimo: 1200,
    prioridad: 6,
    liquidada: false,
  },
  {
    id: '7',
    nombre: 'Santander LikeU',
    titular: 'alejandra',
    saldoInicial: 66138,
    saldoActual: 66138,
    cat: 60.5,
    pagoMinimo: 5401,
    prioridad: 7,
    liquidada: false,
  },
  {
    id: '8',
    nombre: 'Crédito Personal',
    titular: 'alejandra',
    saldoInicial: 91767,
    saldoActual: 91767,
    cat: 38,
    pagoMinimo: 6000,
    prioridad: 8,
    liquidada: false,
  },
  {
    id: '9',
    nombre: 'BBVA',
    titular: 'ricardo',
    saldoInicial: 121586,
    saldoActual: 121586,
    cat: 32.5,
    pagoMinimo: 4500,
    prioridad: 9,
    liquidada: false,
  },
  {
    id: '10',
    nombre: 'Banorte/Invex',
    titular: 'alejandra',
    saldoInicial: 49060,
    saldoActual: 49060,
    cat: 30,
    pagoMinimo: 2000,
    prioridad: 10,
    liquidada: false,
  },
];

export const gastosFijos: GastoFijo[] = [
  { id: '1', nombre: 'Renta', monto: 12700, frecuencia: 'mensual', categoria: 'vivienda' },
  { id: '2', nombre: 'Pago de carro', monto: 13000, frecuencia: 'mensual', categoria: 'transporte' },
  { id: '3', nombre: 'Crédito personal', monto: 6000, frecuencia: 'mensual', categoria: 'deuda' },
  { id: '4', nombre: 'Gasolina', monto: 1500, frecuencia: 'mensual', categoria: 'transporte' },
  { id: '5', nombre: 'Luz', monto: 2500, frecuencia: 'bimestral', categoria: 'servicios' },
  { id: '6', nombre: 'Gas', monto: 900, frecuencia: 'bimestral', categoria: 'servicios' },
];

export const suscripciones: Suscripcion[] = [
  { id: '1', nombre: 'Claude Max', monto: 2000, titular: 'alejandra', esencial: true },
  { id: '2', nombre: 'YouTube Familiar', monto: 319, titular: 'alejandra', esencial: true },
  { id: '3', nombre: 'Spotify', monto: 199, titular: 'ricardo', esencial: false },
  { id: '4', nombre: 'Netflix', monto: 299, titular: 'ricardo', esencial: false },
  { id: '5', nombre: 'Xbox Game Pass', monto: 249, titular: 'ricardo', esencial: false },
  { id: '6', nombre: 'Disney+', monto: 179, titular: 'ricardo', esencial: false },
  { id: '7', nombre: 'Amazon Prime', monto: 99, titular: 'ricardo', esencial: false },
  { id: '8', nombre: 'iCloud', monto: 59, titular: 'ricardo', esencial: false },
  { id: '9', nombre: 'Paramount+', monto: 79, titular: 'ricardo', esencial: false },
  { id: '10', nombre: 'Crunchyroll', monto: 69, titular: 'ricardo', esencial: false },
];

export const INGRESO_MENSUAL = 109000;
export const VALES_DESPENSA = 4800;

export const categorias = [
  'comida',
  'transporte',
  'entretenimiento',
  'salud',
  'ropa',
  'hogar',
  'servicios',
  'otros',
];

export function calcularTotales(deudas: Deuda[]) {
  const deudaTotal = deudas.reduce((sum, d) => sum + d.saldoActual, 0);
  const deudaInicial = deudas.reduce((sum, d) => sum + d.saldoInicial, 0);
  const pagosMinimos = deudas.filter(d => !d.liquidada).reduce((sum, d) => sum + d.pagoMinimo, 0);
  const porcentajePagado = ((deudaInicial - deudaTotal) / deudaInicial) * 100;

  return {
    deudaTotal,
    deudaInicial,
    pagosMinimos,
    porcentajePagado,
    deudaPagada: deudaInicial - deudaTotal,
  };
}

export function calcularGastosFijos() {
  const mensuales = gastosFijos
    .filter(g => g.frecuencia === 'mensual')
    .reduce((sum, g) => sum + g.monto, 0);

  const bimestrales = gastosFijos
    .filter(g => g.frecuencia === 'bimestral')
    .reduce((sum, g) => sum + g.monto / 2, 0);

  const totalSuscripciones = suscripciones.reduce((sum, s) => sum + s.monto, 0);

  return mensuales + bimestrales + totalSuscripciones;
}

export function calcularDisponible(deudas: Deuda[]) {
  const { pagosMinimos } = calcularTotales(deudas);
  const gastosFijosTotal = calcularGastosFijos();

  return INGRESO_MENSUAL - gastosFijosTotal - pagosMinimos;
}
