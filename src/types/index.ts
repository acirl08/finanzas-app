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
  tarjeta?: string;
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
