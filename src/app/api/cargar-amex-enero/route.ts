import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';

// ============================================
// GASTOS DE AMEX PLATINUM RICARDO (9-23 ENERO 2026)
// ============================================
const gastosAmex = [
  // 10 enero
  { fecha: '2026-01-10', monto: 464.50, categoria: 'hogar', descripcion: 'Home Depot Las Torres', titular: 'ricardo' },

  // 11 enero
  { fecha: '2026-01-11', monto: 1111.78, categoria: 'imprevistos', descripcion: 'Costco Monterrey', titular: 'ricardo' },
  { fecha: '2026-01-11', monto: 449.30, categoria: 'imprevistos', descripcion: 'Costco Monterrey', titular: 'ricardo' },

  // 12 enero
  { fecha: '2026-01-12', monto: 69.50, categoria: 'imprevistos', descripcion: 'HEB Tec', titular: 'ricardo' },

  // 15 enero
  { fecha: '2026-01-15', monto: 473.00, categoria: 'entretenimiento', descripcion: 'Cinépolis', titular: 'ricardo' },

  // 17 enero
  { fecha: '2026-01-17', monto: 491.00, categoria: 'imprevistos', descripcion: 'City Market Gomez Morin', titular: 'ricardo' },
  { fecha: '2026-01-17', monto: 104.00, categoria: 'imprevistos', descripcion: 'City Market Gomez Morin', titular: 'ricardo' },
  { fecha: '2026-01-17', monto: 334.00, categoria: 'restaurantes', descripcion: 'Carls Jr Gonzalitos', titular: 'compartido' },

  // 21 enero
  { fecha: '2026-01-21', monto: 2277.00, categoria: 'restaurantes', descripcion: 'Mia Italia', titular: 'compartido' },

  // 22 enero
  { fecha: '2026-01-22', monto: 242.00, categoria: 'personal', descripcion: 'MercadoPago Matthew', titular: 'ricardo' },
];

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== 'cargar2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resultados: { exito: string[]; errores: string[] } = {
      exito: [],
      errores: []
    };

    // Cargar gastos de AMEX
    for (const gasto of gastosAmex) {
      try {
        await addDoc(collection(db, 'gastos'), {
          ...gasto,
          esFijo: false,
          conVales: false,
          createdAt: Timestamp.now()
        });
        resultados.exito.push(`${gasto.fecha} - ${gasto.descripcion}: $${gasto.monto}`);
      } catch (error: any) {
        resultados.errores.push(`${gasto.descripcion}: ${error.message}`);
      }
    }

    // Actualizar saldo de Nu de Ricardo
    // La deuda Nu de Ricardo tiene id '6' en deudasIniciales
    try {
      const deudasRef = collection(db, 'deudas');
      const q = query(deudasRef, where('nombre', '==', 'Nu'), where('titular', '==', 'ricardo'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const deudaDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'deudas', deudaDoc.id), {
          saldoActual: 14711.86
        });
        resultados.exito.push('Saldo Nu Ricardo actualizado a $14,711.86');
      } else {
        // Si no existe en Firebase, crear registro
        await addDoc(collection(db, 'deudas'), {
          nombre: 'Nu',
          titular: 'ricardo',
          saldoInicial: 9917,
          saldoActual: 14711.86,
          cat: 63,
          pagoMinimo: 1200,
          prioridad: 6,
          liquidada: false,
          createdAt: Timestamp.now()
        });
        resultados.exito.push('Deuda Nu Ricardo creada con saldo $14,711.86');
      }
    } catch (error: any) {
      resultados.errores.push(`Actualizar Nu: ${error.message}`);
    }

    // Corregir Restaurant Ume a compartido (ya está registrado de antes)
    try {
      const gastosRef = collection(db, 'gastos');
      const qUme = query(gastosRef, where('descripcion', '==', 'Restaurant Ume'));
      const snapshotUme = await getDocs(qUme);

      for (const gastoDoc of snapshotUme.docs) {
        await updateDoc(doc(db, 'gastos', gastoDoc.id), {
          titular: 'compartido'
        });
      }
      if (!snapshotUme.empty) {
        resultados.exito.push('Restaurant Ume cambiado a compartido');
      }
    } catch (error: any) {
      resultados.errores.push(`Corregir Ume: ${error.message}`);
    }

    // Calcular totales
    const porCategoria: Record<string, number> = {};
    gastosAmex.forEach(g => {
      porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
    });

    const totalGastado = gastosAmex.reduce((sum, g) => sum + g.monto, 0);

    return NextResponse.json({
      success: true,
      resumen: {
        gastosRegistrados: gastosAmex.length,
        totalGastado,
        porCategoria,
        nuRicardoNuevoSaldo: 14711.86,
        fechaLimitePagoNu: '4 de febrero 2026'
      },
      detalles: resultados
    });

  } catch (error: any) {
    console.error('Error cargando gastos AMEX:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const porCategoria: Record<string, number> = {};
  gastosAmex.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
  });

  const totalGastado = gastosAmex.reduce((sum, g) => sum + g.monto, 0);

  return NextResponse.json({
    mensaje: 'Preview de gastos AMEX a cargar. Usa POST con ?key=cargar2026 para ejecutar.',
    gastos: gastosAmex.length,
    totalGastado,
    porCategoria: Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({ categoria: cat, total })),
    acciones: [
      'Cargar 10 gastos de AMEX Platinum (9-22 enero)',
      'Actualizar saldo Nu Ricardo a $14,711.86',
      'Cambiar Restaurant Ume a compartido'
    ],
    deudaNu: {
      saldoActual: 14711.86,
      pagoMinimo: 220.68,
      fechaLimite: '4 de febrero 2026'
    }
  });
}
