import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';

// ============================================
// GASTOS DE RICARDO (14-31 ENERO 2026)
// ============================================
const gastosRicardo = [
  // 17 enero
  { fecha: '2026-01-17', monto: 842.26, categoria: 'personal', descripcion: 'Amazon Mexico', titular: 'ricardo' },
  { fecha: '2026-01-17', monto: 849.00, categoria: 'personal', descripcion: 'Amazon Mexico', titular: 'ricardo' },
  { fecha: '2026-01-17', monto: 431.49, categoria: 'personal', descripcion: 'Stripe Amazon', titular: 'ricardo' },
  { fecha: '2026-01-17', monto: 251.54, categoria: 'personal', descripcion: 'Stripe Amazon', titular: 'ricardo' },

  // 20 enero
  { fecha: '2026-01-20', monto: 17.69, categoria: 'personal', descripcion: 'Themultiverse School', titular: 'ricardo' },

  // 23 enero
  { fecha: '2026-01-23', monto: 85.00, categoria: 'cafe_snacks', descripcion: 'Cafe Cacao', titular: 'ricardo' },

  // 24 enero
  { fecha: '2026-01-24', monto: 445.90, categoria: 'super', descripcion: 'HEB Tec', titular: 'ricardo' },
  { fecha: '2026-01-24', monto: 693.00, categoria: 'super', descripcion: 'City Market', titular: 'ricardo' },
  { fecha: '2026-01-24', monto: 79.00, categoria: 'super', descripcion: 'City Market', titular: 'ricardo' },
  { fecha: '2026-01-24', monto: 1089.00, categoria: 'restaurantes', descripcion: 'Restaurant Blackmamba', titular: 'ricardo' },
  { fecha: '2026-01-24', monto: 529.00, categoria: 'hogar', descripcion: 'Petco MX (mascota)', titular: 'ricardo' },

  // 25 enero
  { fecha: '2026-01-25', monto: 3700.14, categoria: 'super', descripcion: 'Costco Monterrey', titular: 'ricardo' },
  { fecha: '2026-01-25', monto: 534.56, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },

  // 26 enero
  { fecha: '2026-01-26', monto: 70.00, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },

  // 28 enero
  { fecha: '2026-01-28', monto: 219.94, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },

  // 29 enero
  { fecha: '2026-01-29', monto: 1267.21, categoria: 'personal', descripcion: 'Maedupart (Mercado Libre)', titular: 'ricardo' },

  // 30 enero
  { fecha: '2026-01-30', monto: 1895.00, categoria: 'salud', descripcion: 'Farmacias del Ahorro', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 638.13, categoria: 'entretenimiento', descripcion: 'PlayStation Store', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 162.00, categoria: 'personal', descripcion: 'Mercado Pago Matthew', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 201.31, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 50.00, categoria: 'restaurantes', descripcion: 'Rest Food (Payclip)', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 200.45, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 2719.75, categoria: 'restaurantes', descripcion: 'Restaurant Ume', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 101.38, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 115.59, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },

  // 31 enero
  { fecha: '2026-01-31', monto: 175.00, categoria: 'cafe_snacks', descripcion: 'Kaelum Coffee', titular: 'ricardo' },
];

export async function POST(request: Request) {
  try {
    // Verificar clave de seguridad simple
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== 'cargar2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resultados: { exito: string[]; errores: string[] } = {
      exito: [],
      errores: []
    };

    // Cargar gastos
    for (const gasto of gastosRicardo) {
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

    // Registrar pago a BBVA
    try {
      await addDoc(collection(db, 'pagos'), {
        deudaId: '9',
        deudaNombre: 'BBVA',
        monto: 30346.73,
        fecha: '2026-01-30',
        nota: 'Pago primera quincena enero - pago mínimo + extra',
        titular: 'ricardo',
        createdAt: Timestamp.now()
      });
      resultados.exito.push('Pago BBVA registrado: $30,346.73');
    } catch (error: any) {
      resultados.errores.push(`Pago BBVA: ${error.message}`);
    }

    // Calcular totales por categoría
    const porCategoria: Record<string, number> = {};
    gastosRicardo.forEach(g => {
      porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
    });

    const totalGastado = gastosRicardo.reduce((sum, g) => sum + g.monto, 0);

    return NextResponse.json({
      success: true,
      resumen: {
        gastosRegistrados: resultados.exito.length - 1, // -1 por el pago
        totalGastado: totalGastado,
        porCategoria,
        pagoDeuda: 30346.73,
        faltaPagar: 2840
      },
      detalles: resultados
    });

  } catch (error: any) {
    console.error('Error cargando gastos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Mostrar preview de lo que se va a cargar
  const porCategoria: Record<string, number> = {};
  gastosRicardo.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
  });

  const totalGastado = gastosRicardo.reduce((sum, g) => sum + g.monto, 0);

  return NextResponse.json({
    mensaje: 'Preview de gastos a cargar. Usa POST con ?key=cargar2026 para ejecutar.',
    gastos: gastosRicardo.length,
    totalGastado,
    porCategoria: Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({ categoria: cat, total })),
    pagoDeuda: {
      deuda: 'BBVA',
      monto: 30346.73,
      faltaPagar: 2840,
      fechaLimite: '3 de febrero 2026'
    }
  });
}
