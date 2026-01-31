import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

// Mapeo de descripciones a categorías correctas
const RECATEGORIZACIONES: { pattern: RegExp; newCategory: string }[] = [
  // Uber siempre es transporte
  { pattern: /^uber$/i, newCategory: 'transporte' },
  // Costco y City Market son super
  { pattern: /costco/i, newCategory: 'super' },
  { pattern: /city market/i, newCategory: 'super' },
  // HEB sin especificar también es super
  { pattern: /^heb\s/i, newCategory: 'super' },
  // Farmacias son salud
  { pattern: /farmacia/i, newCategory: 'salud' },
];

export async function GET() {
  try {
    const gastosRef = collection(db, 'gastos');
    const q = query(gastosRef, where('categoria', '==', 'imprevistos'));
    const snapshot = await getDocs(q);

    const gastos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Analizar qué cambiaría
    const cambiosSugeridos: { id: string; descripcion: string; actual: string; sugerido: string; monto: number }[] = [];
    const sinCambio: { id: string; descripcion: string; monto: number }[] = [];

    gastos.forEach((gasto: any) => {
      const desc = gasto.descripcion || '';
      let newCat: string | null = null;

      for (const rule of RECATEGORIZACIONES) {
        if (rule.pattern.test(desc)) {
          newCat = rule.newCategory;
          break;
        }
      }

      if (newCat) {
        cambiosSugeridos.push({
          id: gasto.id,
          descripcion: desc,
          actual: 'imprevistos',
          sugerido: newCat,
          monto: gasto.monto
        });
      } else {
        sinCambio.push({
          id: gasto.id,
          descripcion: desc,
          monto: gasto.monto
        });
      }
    });

    return NextResponse.json({
      success: true,
      totalImprevistos: gastos.length,
      cambiosSugeridos,
      sinCambio,
      instrucciones: 'Usa POST con ?key=recategorizar2026 para aplicar los cambios'
    });

  } catch (error: any) {
    console.error('Error analizando gastos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== 'recategorizar2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gastosRef = collection(db, 'gastos');
    const q = query(gastosRef, where('categoria', '==', 'imprevistos'));
    const snapshot = await getDocs(q);

    const resultados: { id: string; descripcion: string; de: string; a: string }[] = [];

    for (const gastoDoc of snapshot.docs) {
      const gasto = gastoDoc.data();
      const desc = gasto.descripcion || '';
      let newCat: string | null = null;

      for (const rule of RECATEGORIZACIONES) {
        if (rule.pattern.test(desc)) {
          newCat = rule.newCategory;
          break;
        }
      }

      if (newCat) {
        await updateDoc(doc(db, 'gastos', gastoDoc.id), {
          categoria: newCat
        });
        resultados.push({
          id: gastoDoc.id,
          descripcion: desc,
          de: 'imprevistos',
          a: newCat
        });
      }
    }

    return NextResponse.json({
      success: true,
      cambiosAplicados: resultados.length,
      detalles: resultados
    });

  } catch (error: any) {
    console.error('Error recategorizando:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
