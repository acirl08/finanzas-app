import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDoc, Timestamp } from 'firebase/firestore';

/**
 * POST - Register debt payment atomically
 *
 * This endpoint performs an atomic transaction that:
 * 1. Creates a Gasto record (categoria: 'deuda')
 * 2. Updates Deuda saldo
 *
 * If any step fails, the entire operation is rolled back.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deudaId, monto, fecha, descripcion, titular } = body;

    // Validation
    if (!deudaId || !monto || !fecha) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: deudaId, monto, fecha' },
        { status: 400 }
      );
    }

    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid monto (must be positive number)' },
        { status: 400 }
      );
    }

    // Validate fecha format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fecha format (use YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Get deuda to validate it exists and get current saldo
    const deudaRef = doc(db, 'deudas', deudaId);
    const deudaSnap = await getDoc(deudaRef);

    if (!deudaSnap.exists()) {
      return NextResponse.json(
        { success: false, error: `Deuda with id ${deudaId} not found` },
        { status: 404 }
      );
    }

    const deuda = deudaSnap.data();
    const saldoActual = deuda.saldoActual || deuda.saldo || 0;
    const nuevoSaldo = Math.max(0, saldoActual - montoNum);
    const liquidada = nuevoSaldo === 0;

    // Prepare batch write (atomic transaction)
    const batch = writeBatch(db);

    // 1. Create Gasto
    const gastoRef = doc(collection(db, 'gastos'));
    const gastoData = {
      fecha,
      descripcion: descripcion || `Pago a ${deuda.nombre}`,
      monto: montoNum,
      categoria: 'deuda',
      titular: titular || 'alejandra',
      esFijo: false,
      conVales: false,
      deudaId: deudaId,
      createdAt: Timestamp.now(),
    };
    batch.set(gastoRef, gastoData);

    // 2. Update Deuda
    batch.update(deudaRef, {
      saldoActual: nuevoSaldo,
      liquidada,
    });

    // Commit batch (all or nothing)
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Pago de ${formatMoney(montoNum)} registrado exitosamente`,
      data: {
        gastoId: gastoRef.id,
        deudaId,
        monto: montoNum,
        saldoAnterior: saldoActual,
        nuevoSaldo,
        liquidada,
      },
    });
  } catch (error: any) {
    console.error('Error registering debt payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
