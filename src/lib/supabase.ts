import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para la base de datos
export type DbDeuda = {
  id: string;
  user_id: string;
  nombre: string;
  titular: string;
  saldo_inicial: number;
  saldo_actual: number;
  cat: number;
  pago_minimo: number;
  prioridad: number;
  liquidada: boolean;
  fecha_liquidacion?: string;
  created_at: string;
  updated_at: string;
};

export type DbGasto = {
  id: string;
  user_id: string;
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
  titular: string;
  tarjeta?: string;
  created_at: string;
};

export type DbPagoDeuda = {
  id: string;
  user_id: string;
  deuda_id: string;
  fecha: string;
  monto: number;
  created_at: string;
};
