import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

// GET - Obtener todos los pagos
export async function GET() {
  try {
    const pagosSnapshot = await getDocs(
      query(collection(db, 'pagos'), orderBy('fecha', 'desc'))
    );

    const pagos = pagosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, data: pagos });
  } catch (error: any) {
    console.error('Error GET pagos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Crear un nuevo pago
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deudaId, deudaNombre, monto, fecha, nota } = body;

    if (!deudaId || !monto || !fecha) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: deudaId, monto, fecha' },
        { status: 400 }
      );
    }

    const pago = {
      deudaId: String(deudaId),
      deudaNombre: deudaNombre || '',
      monto: Number(monto),
      fecha: String(fecha),
      nota: nota || '',
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'pagos'), pago);

    return NextResponse.json({
      success: true,
      message: `Pago de $${monto.toLocaleString()} a ${deudaNombre || 'deuda'} registrado`,
      data: { id: docRef.id, ...pago }
    });
  } catch (error: any) {
    console.error('Error POST pago:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
