import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { cuentasBanco } from '@/lib/data';

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

// GET - Obtener ingresos del mes
export async function GET(request: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(`ingresos-get-${clientId}`, RATE_LIMITS.standard);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Demasiadas solicitudes.' },
      { status: 429 }
    );
  }

  try {
    const ingresosSnapshot = await withTimeout(
      getDocs(query(collection(db, 'ingresos'), orderBy('fecha', 'desc'), limit(100))),
      5000
    );

    const ingresos = ingresosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      success: true,
      data: ingresos
    });
  } catch (error: any) {
    console.error('Error GET ingresos:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST - Registrar nuevo ingreso
export async function POST(request: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(`ingresos-post-${clientId}`, RATE_LIMITS.standard);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Demasiadas solicitudes.' },
      { status: 429 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Formato inválido' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ success: false, error: 'Solicitud inválida' }, { status: 400 });
    }

    const { monto, cuenta, tipo, descripcion } = body as any;

    const montoNum = Number(monto);
    if (!isValidMonto(montoNum)) {
      return NextResponse.json({ success: false, error: 'Monto inválido' }, { status: 400 });
    }

    const cuentaSanitizada = sanitizeString(cuenta, 50).toLowerCase();
    const cuentaValida = cuentasBanco.find(c => c.id === cuentaSanitizada);
    if (!cuentaValida) {
      return NextResponse.json({ success: false, error: 'Cuenta inválida' }, { status: 400 });
    }

    const tiposValidos = ['nomina', 'transferencia', 'cashback', 'reembolso', 'otro'];
    const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'otro';

    const ingreso = {
      fecha: new Date().toISOString().split('T')[0],
      monto: montoNum,
      cuenta: cuentaSanitizada,
      tipo: tipoFinal,
      descripcion: sanitizeString(descripcion || tipo, 200),
      titular: cuentaValida.titular,
      createdAt: Timestamp.now()
    };

    await withTimeout(addDoc(collection(db, 'ingresos'), ingreso), 5000);

    return NextResponse.json({
      success: true,
      message: `Ingreso de $${montoNum.toLocaleString()} registrado en ${cuentaValida.nombre}`,
      data: ingreso
    });
  } catch (error: any) {
    console.error('Error POST ingresos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
