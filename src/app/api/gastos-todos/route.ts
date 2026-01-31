import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';

// GET - Obtener todos los gastos (para análisis)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes'); // Filtrar por mes opcional

    const gastosRef = collection(db, 'gastos');
    const q = query(gastosRef, orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);

    let gastos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrar por mes si se especifica
    if (mes) {
      gastos = gastos.filter((g: any) => g.fecha?.startsWith(mes));
    }

    // Agrupar por mes para resumen
    const porMes: Record<string, { count: number; total: number }> = {};
    gastos.forEach((g: any) => {
      const m = g.fecha?.slice(0, 7) || 'sin-fecha';
      if (!porMes[m]) porMes[m] = { count: 0, total: 0 };
      porMes[m].count++;
      porMes[m].total += g.monto || 0;
    });

    return NextResponse.json({
      success: true,
      totalGastos: gastos.length,
      porMes: Object.entries(porMes)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([mes, data]) => ({ mes, ...data })),
      gastos: mes ? gastos : gastos.slice(0, 100) // Limitar si no hay filtro
    });

  } catch (error: any) {
    console.error('Error obteniendo gastos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Marcar gastos como no planificados
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const action = searchParams.get('action');

    if (key !== 'gastos2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Marcar gastos específicos como no planificados
    if (action === 'marcar-no-planificados') {
      const body = await request.json();
      const ids: string[] = body.ids || [];

      if (ids.length === 0) {
        return NextResponse.json({ error: 'No se proporcionaron IDs' }, { status: 400 });
      }

      const batch = writeBatch(db);
      ids.forEach(id => {
        const gastoRef = doc(db, 'gastos', id);
        batch.update(gastoRef, { planificado: false });
      });

      await batch.commit();

      return NextResponse.json({
        success: true,
        gastosActualizados: ids.length
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    console.error('Error actualizando gastos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
