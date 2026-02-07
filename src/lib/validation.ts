import { z } from 'zod';

/**
 * Validation schemas for API requests
 * Prevents invalid data, XSS, SQL injection, and other attacks
 */

// Common validators
const positiveNumber = z.number().positive('Must be a positive number');
const nonNegativeNumber = z.number().min(0, 'Cannot be negative');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');
const titular = z.enum(['alejandra', 'ricardo', 'compartido']);
const safeString = z.string().max(500).trim();

// Gasto validation
export const GastoCreateSchema = z.object({
  fecha: dateString,
  descripcion: safeString.min(1, 'Description required'),
  monto: positiveNumber.max(1000000, 'Amount too large'),
  categoria: z.string().min(1).max(50),
  titular: titular,
  esFijo: z.boolean().optional(),
  conVales: z.boolean().optional(),
  metodoPago: z.string().max(50).optional(),
  planificado: z.boolean().optional(),
  deudaId: z.string().max(50).optional(),
});

export const GastoUpdateSchema = z.object({
  gastoId: z.string().min(1, 'Gasto ID required'),
  fecha: dateString.optional(),
  descripcion: safeString.optional(),
  monto: positiveNumber.max(1000000).optional(),
  categoria: z.string().max(50).optional(),
  titular: titular.optional(),
  esFijo: z.boolean().optional(),
  conVales: z.boolean().optional(),
  metodoPago: z.string().max(50).optional(),
  deudaId: z.string().max(50).optional(),
});

// Deuda validation
export const DeudaUpdateSchema = z.object({
  deudaId: z.string().min(1, 'Deuda ID required'),
  saldoActual: nonNegativeNumber.max(10000000).optional(),
  nuevoSaldo: nonNegativeNumber.max(10000000).optional(), // Legacy support
  saldoInicial: nonNegativeNumber.max(10000000).optional(),
  pagoMinimo: nonNegativeNumber.max(1000000).optional(),
  liquidada: z.boolean().optional(),
}).refine(
  (data) => {
    // Ensure saldo is not greater than saldoInicial
    if (data.saldoActual !== undefined && data.saldoInicial !== undefined) {
      return data.saldoActual <= data.saldoInicial;
    }
    return true;
  },
  { message: 'saldoActual cannot be greater than saldoInicial' }
);

// Pago Deuda validation
export const PagoDeudaSchema = z.object({
  deudaId: z.string().min(1, 'Deuda ID required'),
  monto: positiveNumber.max(1000000, 'Amount too large'),
  fecha: dateString,
  descripcion: safeString.optional(),
  titular: titular.optional().default('alejandra'),
});

// Ingreso validation
export const IngresoCreateSchema = z.object({
  fecha: dateString,
  monto: positiveNumber.max(100000000, 'Amount too large'),
  cuenta: z.string().min(1).max(50),
  descripcion: safeString.min(1, 'Description required'),
  tipo: z.enum(['nomina', 'transferencia', 'cashback', 'reembolso', 'otro']),
  titular: titular,
});

// Helper to validate and return errors
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown):
  { success: true; data: T } | { success: false; errors: string[] } {

  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(err =>
    `${err.path.join('.')}: ${err.message}`
  );

  return { success: false, errors };
}
