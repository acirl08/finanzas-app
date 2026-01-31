import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Correcciones pendientes
const correcciones = [
  { id: '5HiP5vg6Os84W5DzLssR', campo: 'titular', valor: 'compartido', descripcion: 'Kaelum Coffee' },
  { id: 'OVajQHiVebSYEyIFvUZV', campo: 'titular', valor: 'compartido', descripcion: 'Carls Jr Gonzalitos' },
];

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== 'cargar2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resultados: string[] = [];

    for (const correccion of correcciones) {
      try {
        await updateDoc(doc(db, 'gastos', correccion.id), {
          [correccion.campo]: correccion.valor
        });
        resultados.push(`✓ ${correccion.descripcion}: ${correccion.campo} = ${correccion.valor}`);
      } catch (error: any) {
        resultados.push(`✗ ${correccion.descripcion}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      correcciones: resultados
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    mensaje: 'Correcciones pendientes. Usa POST con ?key=cargar2026 para ejecutar.',
    correcciones: correcciones.map(c => `${c.descripcion}: ${c.campo} → ${c.valor}`)
  });
}
