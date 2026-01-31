import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, writeBatch, doc } from 'firebase/firestore';

// Categorías que SIEMPRE deberían ser gastos fijos
const CATEGORIAS_FIJAS = ['renta', 'vivienda', 'servicios'];

// Descripciones que indican gasto fijo
const DESCRIPCIONES_FIJAS = [
  'renta',
  'luz',
  'gas',
  'agua',
  'internet',
  'telmex',
  'izzi',
  'totalplay',
  'predial',
];

// GET - Ver gastos que deberían ser fijos pero no lo son
export async function GET() {
  try {
    const gastosRef = collection(db, 'gastos');
    const snapshot = await getDocs(query(gastosRef));

    const gastosProblematicos: any[] = [];
    const gastosFijosCorrectos: any[] = [];

    snapshot.docs.forEach(docSnap => {
      const gasto = { id: docSnap.id, ...docSnap.data() };
      const categoria = (gasto as any).categoria?.toLowerCase() || '';
      const descripcion = (gasto as any).descripcion?.toLowerCase() || '';

      // Verificar si debería ser fijo por categoría
      const esCategFija = CATEGORIAS_FIJAS.some(cat => categoria.includes(cat));

      // Verificar si debería ser fijo por descripción
      const esDescFija = DESCRIPCIONES_FIJAS.some(desc => descripcion.includes(desc));

      if ((esCategFija || esDescFija) && (gasto as any).esFijo !== true) {
        gastosProblematicos.push({
          id: gasto.id,
          fecha: (gasto as any).fecha,
          descripcion: (gasto as any).descripcion,
          monto: (gasto as any).monto,
          categoria: (gasto as any).categoria,
          esFijo: (gasto as any).esFijo,
          razon: esCategFija ? `Categoría ${categoria} es fija` : `Descripción contiene palabra fija`
        });
      }

      if ((gasto as any).esFijo === true) {
        gastosFijosCorrectos.push({
          id: gasto.id,
          descripcion: (gasto as any).descripcion,
          monto: (gasto as any).monto,
          categoria: (gasto as any).categoria
        });
      }
    });

    return NextResponse.json({
      success: true,
      gastosFijosCorrectos: gastosFijosCorrectos.length,
      gastosACorregir: gastosProblematicos.length,
      detalleACorregir: gastosProblematicos,
      instrucciones: 'Para corregir, haz POST con ?key=fix2026'
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Corregir gastos que deberían ser fijos
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== 'fix2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gastosRef = collection(db, 'gastos');
    const snapshot = await getDocs(query(gastosRef));

    const batch = writeBatch(db);
    let corregidos = 0;

    snapshot.docs.forEach(docSnap => {
      const gasto = docSnap.data();
      const categoria = gasto.categoria?.toLowerCase() || '';
      const descripcion = gasto.descripcion?.toLowerCase() || '';

      // Verificar si debería ser fijo
      const esCategFija = CATEGORIAS_FIJAS.some(cat => categoria.includes(cat));
      const esDescFija = DESCRIPCIONES_FIJAS.some(desc => descripcion.includes(desc));

      if ((esCategFija || esDescFija) && gasto.esFijo !== true) {
        const gastoRef = doc(db, 'gastos', docSnap.id);
        batch.update(gastoRef, { esFijo: true });
        corregidos++;
      }
    });

    if (corregidos > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      gastosCorregidos: corregidos,
      mensaje: `Se marcaron ${corregidos} gastos como fijos`
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
