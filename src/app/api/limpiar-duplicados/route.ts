import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

// Endpoint para identificar y eliminar gastos duplicados
// Un gasto se considera duplicado si tiene la misma fecha, monto, descripción y categoría

export async function GET() {
  try {
    const gastosRef = collection(db, 'gastos');
    const q = query(gastosRef, orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);

    const gastos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Encontrar duplicados
    const seen = new Map<string, { id: string; count: number }>();
    const duplicados: { id: string; key: string; data: any }[] = [];

    gastos.forEach((gasto: any) => {
      // Crear una clave única basada en fecha + monto + descripcion + categoria
      const key = `${gasto.fecha}|${gasto.monto}|${gasto.descripcion}|${gasto.categoria}`;

      if (seen.has(key)) {
        // Este es un duplicado
        duplicados.push({ id: gasto.id, key, data: gasto });
        seen.get(key)!.count++;
      } else {
        seen.set(key, { id: gasto.id, count: 1 });
      }
    });

    // Agrupar duplicados por key para mejor visualización
    const duplicadosAgrupados: Record<string, { original: string; duplicados: string[]; data: any }> = {};

    duplicados.forEach(dup => {
      if (!duplicadosAgrupados[dup.key]) {
        duplicadosAgrupados[dup.key] = {
          original: seen.get(dup.key)!.id,
          duplicados: [],
          data: dup.data
        };
      }
      duplicadosAgrupados[dup.key].duplicados.push(dup.id);
    });

    return NextResponse.json({
      success: true,
      totalGastos: gastos.length,
      duplicadosEncontrados: duplicados.length,
      duplicadosAgrupados,
      instrucciones: 'Usa POST con ?key=limpiar2026 para eliminar los duplicados'
    });

  } catch (error: any) {
    console.error('Error buscando duplicados:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const eliminarId = searchParams.get('eliminarId');

    if (key !== 'limpiar2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Si se proporciona un ID específico, eliminar solo ese gasto
    if (eliminarId) {
      await deleteDoc(doc(db, 'gastos', eliminarId));
      return NextResponse.json({
        success: true,
        mensaje: `Gasto ${eliminarId} eliminado`
      });
    }

    const gastosRef = collection(db, 'gastos');
    const q = query(gastosRef, orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);

    const gastos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Encontrar duplicados
    const seen = new Map<string, string>(); // key -> first id
    const idsAEliminar: string[] = [];

    gastos.forEach((gasto: any) => {
      const key = `${gasto.fecha}|${gasto.monto}|${gasto.descripcion}|${gasto.categoria}`;

      if (seen.has(key)) {
        // Este es un duplicado - eliminar
        idsAEliminar.push(gasto.id);
      } else {
        seen.set(key, gasto.id);
      }
    });

    // Eliminar duplicados
    const resultados: { eliminado: string; error?: string }[] = [];

    for (const id of idsAEliminar) {
      try {
        await deleteDoc(doc(db, 'gastos', id));
        resultados.push({ eliminado: id });
      } catch (error: any) {
        resultados.push({ eliminado: id, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      totalGastosAntes: gastos.length,
      duplicadosEliminados: idsAEliminar.length,
      totalGastosDespues: gastos.length - idsAEliminar.length,
      resultados
    });

  } catch (error: any) {
    console.error('Error limpiando duplicados:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
