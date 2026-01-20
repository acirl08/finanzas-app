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

// ============================================
// ESTRUCTURA DE PRESUPUESTO MENSUAL
// ============================================

// VALES DE DESPENSA ($4,800) - Solo para súper/alimentos
export const PRESUPUESTO_DESPENSA = 4800;

// GASTOS ESENCIALES ($8,000) - Necesidades que no cubren los vales
export const PRESUPUESTO_ESENCIALES = 8000;

// GUSTOS ($7,000) - Dividido entre los dos + compartido
export const PRESUPUESTO_GUSTOS = 7000;

// Total variable = $15,000 (esenciales + gustos, sin contar vales)
export const PRESUPUESTO_VARIABLE = PRESUPUESTO_ESENCIALES + PRESUPUESTO_GUSTOS;

// Distribución del presupuesto variable ($15,000)
export const presupuestosPersonales = {
  alejandra: 5000,   // Presupuesto mensual Ale
  ricardo: 5000,     // Presupuesto mensual Ricardo
  compartido: 5000,  // Gastos compartidos
};

// ============================================
// CATEGORÍAS ORGANIZADAS
// ============================================

// Categorías que se pagan con VALES DE DESPENSA
export const categoriasVales = [
  'super',           // Despensa del súper
  'frutas_verduras', // Frutas y verduras
];

// Categorías ESENCIALES (necesidades, no gustos)
export const categoriasEsenciales = [
  'gasolina',        // Gasolina adicional
  'salud',           // Medicinas, doctor, dentista
  'hogar',           // Cosas para la casa (limpieza, etc.)
  'transporte',      // Uber, estacionamiento
  'imprevistos',     // Emergencias
];

// Categorías de GUSTOS (no esenciales)
export const categoriasGustos = [
  'restaurantes',    // Comida fuera
  'entretenimiento', // Cine, conciertos, eventos
  'ropa',            // Ropa y accesorios
  'cafe_snacks',     // Cafés, antojos
  'personal',        // Hobbies, belleza, etc.
  'otros_gustos',    // Otros gustos
];

// Todas las categorías juntas (para el formulario)
export const categorias = [
  // Vales
  'super',
  'frutas_verduras',
  // Esenciales
  'gasolina',
  'salud',
  'hogar',
  'transporte',
  'imprevistos',
  // Gustos
  'restaurantes',
  'entretenimiento',
  'ropa',
  'cafe_snacks',
  'personal',
  'otros_gustos',
];

// Labels bonitos para mostrar
export const categoriaLabels: Record<string, string> = {
  super: 'Súper / Despensa',
  frutas_verduras: 'Frutas y Verduras',
  gasolina: 'Gasolina',
  salud: 'Salud',
  hogar: 'Hogar',
  transporte: 'Transporte',
  imprevistos: 'Imprevistos',
  restaurantes: 'Restaurantes',
  entretenimiento: 'Entretenimiento',
  ropa: 'Ropa',
  cafe_snacks: 'Café / Snacks',
  personal: 'Personal',
  otros_gustos: 'Otros',
};

// Helper para saber el tipo de categoría
export function getTipoCategoria(categoria: string): 'vales' | 'esencial' | 'gusto' {
  if (categoriasVales.includes(categoria)) return 'vales';
  if (categoriasEsenciales.includes(categoria)) return 'esencial';
  return 'gusto';
}

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

// ============================================
// CÁLCULO REAL DE INTERESES (Método Avalancha)
// ============================================

interface ProyeccionMes {
  mes: number;
  fecha: string;
  saldoTotal: number;
  interesesMes: number;
  pagoCapital: number;
  deudasActivas: number;
  deudasLiquidadas: string[];
}

interface ResultadoProyeccion {
  mesesParaLibertad: number;
  fechaLibertad: string;
  totalInteresesPagados: number;
  totalPagado: number;
  proyeccionMensual: ProyeccionMes[];
  ordenLiquidacion: { nombre: string; fechaLiquidacion: string; interesesPagados: number }[];
}

/**
 * Calcula la proyección de pago de deudas usando interés compuesto real
 * Método: Avalancha (pagar primero las de mayor CAT)
 */
export function calcularProyeccionDeudas(
  deudas: Deuda[],
  pagoMensualExtra: number = 0
): ResultadoProyeccion {
  // Crear copia de deudas para simular
  let deudasSimuladas = deudas
    .filter(d => !d.liquidada && d.saldoActual > 0)
    .map(d => ({
      ...d,
      saldo: d.saldoActual,
      tasaMensual: d.cat / 100 / 12, // CAT anual a tasa mensual
      interesesAcumulados: 0
    }))
    .sort((a, b) => b.cat - a.cat); // Ordenar por CAT descendente (avalancha)

  const pagosMinimosTotal = deudasSimuladas.reduce((sum, d) => sum + d.pagoMinimo, 0);
  const pagoMensualTotal = pagosMinimosTotal + pagoMensualExtra;

  const proyeccion: ProyeccionMes[] = [];
  const ordenLiquidacion: { nombre: string; fechaLiquidacion: string; interesesPagados: number }[] = [];

  let mes = 0;
  let totalInteresesPagados = 0;
  let totalPagado = 0;
  const hoy = new Date();
  const maxMeses = 120; // Límite de 10 años

  while (deudasSimuladas.some(d => d.saldo > 0) && mes < maxMeses) {
    mes++;
    const fechaMes = new Date(hoy);
    fechaMes.setMonth(hoy.getMonth() + mes);

    let interesesEsteMes = 0;
    let pagoCapitalEsteMes = 0;
    const liquidadasEsteMes: string[] = [];

    // 1. Calcular intereses de cada deuda
    deudasSimuladas.forEach(d => {
      if (d.saldo > 0) {
        const interes = d.saldo * d.tasaMensual;
        d.saldo += interes;
        d.interesesAcumulados += interes;
        interesesEsteMes += interes;
      }
    });

    // 2. Pagar mínimos primero
    let pagoDisponible = pagoMensualTotal;
    deudasSimuladas.forEach(d => {
      if (d.saldo > 0) {
        const pagoEstaDeuda = Math.min(d.pagoMinimo, d.saldo);
        d.saldo -= pagoEstaDeuda;
        pagoDisponible -= pagoEstaDeuda;
        pagoCapitalEsteMes += pagoEstaDeuda;

        if (d.saldo <= 0) {
          d.saldo = 0;
          liquidadasEsteMes.push(d.nombre);
          ordenLiquidacion.push({
            nombre: d.nombre,
            fechaLiquidacion: fechaMes.toISOString().slice(0, 7),
            interesesPagados: Math.round(d.interesesAcumulados)
          });
        }
      }
    });

    // 3. Aplicar excedente a la deuda de mayor CAT (avalancha)
    while (pagoDisponible > 0) {
      const deudaPrioritaria = deudasSimuladas.find(d => d.saldo > 0);
      if (!deudaPrioritaria) break;

      const pagoExtra = Math.min(pagoDisponible, deudaPrioritaria.saldo);
      deudaPrioritaria.saldo -= pagoExtra;
      pagoDisponible -= pagoExtra;
      pagoCapitalEsteMes += pagoExtra;

      if (deudaPrioritaria.saldo <= 0) {
        deudaPrioritaria.saldo = 0;
        if (!liquidadasEsteMes.includes(deudaPrioritaria.nombre)) {
          liquidadasEsteMes.push(deudaPrioritaria.nombre);
          ordenLiquidacion.push({
            nombre: deudaPrioritaria.nombre,
            fechaLiquidacion: fechaMes.toISOString().slice(0, 7),
            interesesPagados: Math.round(deudaPrioritaria.interesesAcumulados)
          });
        }
      }
    }

    totalInteresesPagados += interesesEsteMes;
    totalPagado += pagoCapitalEsteMes;

    proyeccion.push({
      mes,
      fecha: fechaMes.toISOString().slice(0, 7),
      saldoTotal: Math.round(deudasSimuladas.reduce((sum, d) => sum + d.saldo, 0)),
      interesesMes: Math.round(interesesEsteMes),
      pagoCapital: Math.round(pagoCapitalEsteMes),
      deudasActivas: deudasSimuladas.filter(d => d.saldo > 0).length,
      deudasLiquidadas: liquidadasEsteMes
    });
  }

  const fechaLibertad = new Date(hoy);
  fechaLibertad.setMonth(hoy.getMonth() + mes);

  return {
    mesesParaLibertad: mes,
    fechaLibertad: fechaLibertad.toISOString().slice(0, 7),
    totalInteresesPagados: Math.round(totalInteresesPagados),
    totalPagado: Math.round(totalPagado),
    proyeccionMensual: proyeccion,
    ordenLiquidacion
  };
}

/**
 * Compara escenarios: sin pago extra vs con pago extra
 */
export function compararEscenarios(deudas: Deuda[], montoExtra: number) {
  const sinExtra = calcularProyeccionDeudas(deudas, 0);
  const conExtra = calcularProyeccionDeudas(deudas, montoExtra);

  return {
    sinExtra,
    conExtra,
    mesesAhorrados: sinExtra.mesesParaLibertad - conExtra.mesesParaLibertad,
    interesesAhorrados: sinExtra.totalInteresesPagados - conExtra.totalInteresesPagados,
    diferenciaTotalPagado: sinExtra.totalPagado - conExtra.totalPagado
  };
}

/**
 * Calcula el "health score" financiero (0-100)
 */
export function calcularHealthScore(
  deudaTotal: number,
  ingresoMensual: number,
  gastosMes: number,
  ahorroMes: number
): { score: number; nivel: string; factores: { nombre: string; valor: number; peso: number }[] } {
  // Factor 1: Ratio deuda/ingreso anual (40% del score)
  const ingresoAnual = Math.max(1, ingresoMensual * 12); // Evitar división por cero
  const ratioDeudaIngreso = deudaTotal / ingresoAnual;
  const scoreDeuda = Math.max(0, 100 - (ratioDeudaIngreso * 100));

  // Factor 2: Tasa de ahorro (30% del score)
  const tasaAhorro = ingresoMensual > 0 ? ahorroMes / ingresoMensual : 0;
  const scoreAhorro = Math.min(100, tasaAhorro * 500); // 20% ahorro = 100 puntos

  // Factor 3: Control de gastos vs presupuesto (30% del score)
  const presupuesto = Math.max(1, PRESUPUESTO_VARIABLE); // Evitar división por cero
  const ratioGastoPresupuesto = gastosMes / presupuesto;
  const scoreGastos = ratioGastoPresupuesto <= 1
    ? 100 - ((ratioGastoPresupuesto - 0.5) * 100) // Bonus si gasta menos del 50%
    : Math.max(0, 100 - ((ratioGastoPresupuesto - 1) * 200)); // Penaliza si se pasa

  const factores = [
    { nombre: 'Ratio Deuda/Ingreso', valor: Math.round(scoreDeuda), peso: 0.4 },
    { nombre: 'Tasa de Ahorro', valor: Math.round(scoreAhorro), peso: 0.3 },
    { nombre: 'Control de Gastos', valor: Math.round(scoreGastos), peso: 0.3 }
  ];

  const score = Math.round(
    scoreDeuda * 0.4 +
    scoreAhorro * 0.3 +
    scoreGastos * 0.3
  );

  let nivel: string;
  if (score >= 80) nivel = 'Excelente';
  else if (score >= 60) nivel = 'Bueno';
  else if (score >= 40) nivel = 'Regular';
  else if (score >= 20) nivel = 'Precaución';
  else nivel = 'Crítico';

  return { score, nivel, factores };
}
