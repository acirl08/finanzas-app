export interface Deuda {
  id: string;
  nombre: string;
  titular: 'alejandra' | 'ricardo';
  saldoInicial: number;
  saldoActual: number;
  cat: number;
  pagoMinimo: number;
  prioridad: number;
  liquidada: boolean;
  fechaLiquidacion?: string;
}

export interface Gasto {
  id: string;
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
  titular: 'alejandra' | 'ricardo' | 'compartido';
  esFijo?: boolean;
  conVales?: boolean;
  metodoPago?: string;
  planificado?: boolean;
  tarjeta?: string;
  deudaId?: string; // Only for categoria === 'deuda'
}

export interface GastoFijo {
  id: string;
  nombre: string;
  monto: number;
  frecuencia: 'mensual' | 'bimestral';
  categoria: string;
}

export interface Suscripcion {
  id: string;
  nombre: string;
  monto: number;
  titular: 'alejandra' | 'ricardo';
  esencial: boolean;
}

export interface ResumenMensual {
  mes: string;
  ingresos: number;
  gastosFijos: number;
  gastosVariables: number;
  pagosDeuda: number;
  disponible: number;
  deudaRestante: number;
  porcentajePagado: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Ingreso {
  id: string;
  fecha: string;
  monto: number;
  cuenta: string;
  descripcion: string;
  tipo: 'nomina' | 'transferencia' | 'cashback' | 'reembolso' | 'otro';
  titular: 'alejandra' | 'ricardo' | 'compartido';
}

export interface CuentaBanco {
  id: string;
  nombre: string;
  tipo: 'debito' | 'credito';
  titular: 'alejandra' | 'ricardo';
  saldoActual: number;
  ultimaActualizacion: string;
}
