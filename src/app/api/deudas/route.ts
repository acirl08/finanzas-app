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
import { deudasIniciales, calcularProyeccionDeudas, compararEscenarios } from '@/lib/data';

// Timeout wrapper
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

// GET - Obtener deudas y proyecciones
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'listar';

    // Obtener deudas de Firebase o fallback a datos locales
    let deudas: any[] = [];
    try {
      const deudasSnapshot = await withTimeout(
        getDocs(query(collection(db, 'deudas'), orderBy('prioridad', 'asc'))),
        5000
      );
      deudas = deudasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch {
      // Fallback a datos locales
    }

    if (deudas.length === 0) {
      deudas = deudasIniciales;
    }

    switch (action) {
      case 'listar':
        const deudaTotal = deudas.reduce((sum: number, d: any) => sum + (d.saldoActual || 0), 0);
        return NextResponse.json({
          success: true,
          data: {
            deudas: deudas.map(d => ({
              id: d.id,
              nombre: d.nombre,
              titular: d.titular,
              saldo: d.saldoActual,
              cat: d.cat,
              pagoMinimo: d.pagoMinimo,
              prioridad: d.prioridad,
              liquidada: d.liquidada || false
            })),
            deudaTotal,
            cantidadDeudas: deudas.filter((d: any) => !d.liquidada).length
          }
        });

      case 'proyeccion':
        const montoExtra = Number(searchParams.get('extra')) || 0;
        const proyeccion = calcularProyeccionDeudas(deudas, montoExtra);
        const deudaTotalProy = deudas.reduce((sum: number, d: any) => sum + (d.saldoActual || 0), 0);
        const pagosMinimos = deudas.reduce((sum: number, d: any) => sum + (d.pagoMinimo || 0), 0);

        return NextResponse.json({
          success: true,
          data: {
            deudaTotal: deudaTotalProy,
            pagoMensual: pagosMinimos + montoExtra,
            mesesRestantes: proyeccion.mesesParaLibertad,
            fechaLibertad: proyeccion.fechaLibertad,
            totalInteresesAPagar: proyeccion.totalInteresesPagados,
            totalAPagar: deudaTotalProy + proyeccion.totalInteresesPagados,
            proximasLiquidaciones: proyeccion.ordenLiquidacion.slice(0, 5),
            proyeccionMensual: proyeccion.proyeccionMensual.filter((_, i) => i % 3 === 0 || i === proyeccion.proyeccionMensual.length - 1)
          }
        });

      case 'comparar':
        const extraAmount = Number(searchParams.get('extra')) || 0;
        const comparacion = compararEscenarios(deudas, extraAmount);
        const pagosMinTotal = deudas.reduce((sum: number, d: any) => sum + (d.pagoMinimo || 0), 0);

        return NextResponse.json({
          success: true,
          data: {
            montoExtra: extraAmount,
            pagoMensualActual: pagosMinTotal,
            pagoMensualNuevo: pagosMinTotal + extraAmount,
            mesesSinExtra: comparacion.sinExtra.mesesParaLibertad,
            mesesConExtra: comparacion.conExtra.mesesParaLibertad,
            mesesAhorrados: comparacion.mesesAhorrados,
            interesAhorrado: comparacion.interesesAhorrados,
            fechaLibertadSinExtra: comparacion.sinExtra.fechaLibertad,
            fechaLibertadConExtra: comparacion.conExtra.fechaLibertad
          }
        });

      default:
        return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error GET deudas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Registrar pago a deuda
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deudaId, deudaNombre, monto, titular } = body;

    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      return NextResponse.json({ success: false, error: 'Monto inválido' }, { status: 400 });
    }

    // Buscar deuda
    let deuda = null;
    if (deudaId) {
      deuda = deudasIniciales.find(d => d.id === deudaId);
    } else if (deudaNombre) {
      deuda = deudasIniciales.find(d =>
        d.nombre.toLowerCase().includes(deudaNombre.toLowerCase()) &&
        (!titular || d.titular.toLowerCase() === titular.toLowerCase())
      );
    }

    if (!deuda) {
      return NextResponse.json({ success: false, error: 'Deuda no encontrada' }, { status: 404 });
    }

    // Guardar pago
    const pagoData = {
      deudaId: deuda.id,
      deudaNombre: deuda.nombre,
      monto: montoNum,
      fecha: new Date().toISOString().split('T')[0],
      createdAt: Timestamp.now()
    };

    await withTimeout(addDoc(collection(db, 'pagos'), pagoData), 5000);

    return NextResponse.json({
      success: true,
      message: `Pago de $${montoNum.toLocaleString()} a ${deuda.nombre} registrado.`,
      data: pagoData
    });
  } catch (error: any) {
    console.error('Error POST pago deuda:', error);
    return NextResponse.json({ success: false, error: 'No se pudo registrar el pago' }, { status: 500 });
  }
}

// PUT - Actualizar saldo de deuda
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { deudaId, nuevoSaldo, liquidada } = body;

    if (!deudaId) {
      return NextResponse.json({ success: false, error: 'ID de deuda requerido' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};

    if (nuevoSaldo !== undefined) {
      updateData.saldoActual = Number(nuevoSaldo);
    }

    if (liquidada !== undefined) {
      updateData.liquidada = Boolean(liquidada);
    }

    await withTimeout(updateDoc(doc(db, 'deudas', deudaId), updateData), 5000);

    return NextResponse.json({ success: true, message: 'Deuda actualizada' });
  } catch (error: any) {
    console.error('Error PUT deuda:', error);
    return NextResponse.json({ success: false, error: 'No se pudo actualizar' }, { status: 500 });
  }
}
