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
    const { monto, categoria, descripcion, titular = 'compartido', esFijo = false, conVales = false, fecha } = body;

    const montoNum = Number(monto);
    if (!isValidMonto(montoNum)) {
      return NextResponse.json({ success: false, error: 'Monto inválido (debe ser mayor a 0)' }, { status: 400 });
    }

    const categoriaLower = sanitizeString(categoria || 'otros', 50).toLowerCase().replace(/ /g, '_');
    const esConVales = conVales || categoriasVales.includes(categoriaLower);
    const descripcionSanitizada = sanitizeString(descripcion || categoria, 200);

    const titularesValidos = ['alejandra', 'ricardo', 'compartido'];
    const titularFinal = titularesValidos.includes(sanitizeString(titular, 50).toLowerCase())
      ? sanitizeString(titular, 50).toLowerCase()
      : 'compartido';

    const gasto = {
      fecha: fecha || new Date().toISOString().split('T')[0],
      monto: montoNum,
      categoria: categoriaLower,
      descripcion: descripcionSanitizada,
      titular: titularFinal,
      esFijo: Boolean(esFijo),
      conVales: esConVales,
      createdAt: Timestamp.now()
    };

    const docRef = await withTimeout(addDoc(collection(db, 'gastos'), gasto), 5000);

    const tipoGasto = esFijo ? 'Gasto fijo' : (esConVales ? 'Gasto con vales' : 'Gasto');
    return NextResponse.json({
      success: true,
      message: `${tipoGasto} de $${montoNum.toLocaleString()} en ${categoria} registrado.`,
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
    const { gastoId, ...updates } = body;

    if (!gastoId) {
      return NextResponse.json({ success: false, error: 'ID de gasto requerido' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};

    if (updates.monto !== undefined) {
      const montoNum = Number(updates.monto);
      if (!isValidMonto(montoNum)) {
        return NextResponse.json({ success: false, error: 'Monto inválido' }, { status: 400 });
      }
      updateData.monto = montoNum;
    }

    if (updates.descripcion !== undefined) {
      updateData.descripcion = sanitizeString(updates.descripcion, 200);
    }

    if (updates.categoria !== undefined) {
      updateData.categoria = sanitizeString(updates.categoria, 50).toLowerCase();
    }

    if (updates.titular !== undefined) {
      const titularVal = sanitizeString(updates.titular, 50).toLowerCase();
      const titularesValidos = ['alejandra', 'ricardo', 'compartido'];
      if (!titularesValidos.includes(titularVal)) {
        return NextResponse.json({ success: false, error: 'Titular inválido' }, { status: 400 });
      }
      updateData.titular = titularVal;
    }

    if (updates.fecha !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updates.fecha)) {
        return NextResponse.json({ success: false, error: 'Formato de fecha inválido' }, { status: 400 });
      }
      updateData.fecha = updates.fecha;
    }

    if (updates.esFijo !== undefined) {
      updateData.esFijo = Boolean(updates.esFijo);
    }

    if (updates.conVales !== undefined) {
      updateData.conVales = Boolean(updates.conVales);
    }

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
