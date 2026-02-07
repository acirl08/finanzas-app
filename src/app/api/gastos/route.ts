import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { categoriasVales } from '@/lib/data';
import { GastoCreateSchema, GastoUpdateSchema, validateRequest } from '@/lib/validation';

// Timeout wrapper
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

// Validation helpers
function isValidMonto(monto: unknown): monto is number {
  return typeof monto === 'number' && !isNaN(monto) && monto > 0 && monto <= 10000000;
}

function sanitizeString(input: unknown, maxLength = 200): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

// GET - Obtener gastos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cantidad = Math.min(Number(searchParams.get('limit')) || 50, 200);
    const mes = searchParams.get('mes') || new Date().toISOString().slice(0, 7);

    const gastosSnapshot = await withTimeout(
      getDocs(query(collection(db, 'gastos'), orderBy('fecha', 'desc'), limit(cantidad))),
      5000
    );

    const gastos = gastosSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((g: any) => !mes || g.fecha?.startsWith(mes));

    return NextResponse.json({ success: true, data: gastos });
  } catch (error: any) {
    console.error('Error GET gastos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Crear gasto
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(GastoCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    const data = validation.data;
    const categoriaLower = data.categoria.toLowerCase().replace(/ /g, '_');
    const esConVales = data.conVales || categoriasVales.includes(categoriaLower);

    const gasto = {
      fecha: data.fecha,
      monto: data.monto,
      categoria: categoriaLower,
      descripcion: data.descripcion,
      titular: data.titular,
      esFijo: data.esFijo || false,
      conVales: esConVales,
      metodoPago: data.metodoPago,
      deudaId: data.deudaId,
      createdAt: Timestamp.now()
    };

    const docRef = await withTimeout(addDoc(collection(db, 'gastos'), gasto), 5000);

    const tipoGasto = gasto.esFijo ? 'Gasto fijo' : (esConVales ? 'Gasto con vales' : 'Gasto');
    return NextResponse.json({
      success: true,
      message: `${tipoGasto} de $${data.monto.toLocaleString()} en ${data.categoria} registrado.`,
      data: { id: docRef.id, ...gasto }
    });
  } catch (error: any) {
    console.error('Error POST gasto:', error);
    return NextResponse.json({ success: false, error: 'No se pudo guardar el gasto' }, { status: 500 });
  }
}

// PUT - Actualizar gasto
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(GastoUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    const { gastoId, ...updates } = validation.data;
    const updateData: Record<string, any> = {};

    if (updates.monto) updateData.monto = updates.monto;
    if (updates.descripcion) updateData.descripcion = updates.descripcion;
    if (updates.categoria) updateData.categoria = updates.categoria.toLowerCase();
    if (updates.titular) updateData.titular = updates.titular;
    if (updates.fecha) updateData.fecha = updates.fecha;
    if (updates.esFijo !== undefined) updateData.esFijo = updates.esFijo;
    if (updates.conVales !== undefined) updateData.conVales = updates.conVales;
    if (updates.metodoPago) updateData.metodoPago = updates.metodoPago;
    if (updates.deudaId) updateData.deudaId = updates.deudaId;

    await withTimeout(updateDoc(doc(db, 'gastos', gastoId), updateData), 5000);

    return NextResponse.json({ success: true, message: 'Gasto actualizado' });
  } catch (error: any) {
    console.error('Error PUT gasto:', error);
    return NextResponse.json({ success: false, error: 'No se pudo actualizar' }, { status: 500 });
  }
}

// DELETE - Eliminar gasto
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gastoId = searchParams.get('id');

    if (!gastoId) {
      return NextResponse.json({ success: false, error: 'ID de gasto requerido' }, { status: 400 });
    }

    await withTimeout(deleteDoc(doc(db, 'gastos', gastoId)), 5000);
    return NextResponse.json({ success: true, message: 'Gasto eliminado' });
  } catch (error: any) {
    console.error('Error DELETE gasto:', error);
    return NextResponse.json({ success: false, error: 'No se pudo eliminar' }, { status: 500 });
  }
}
