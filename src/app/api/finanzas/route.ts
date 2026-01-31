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
import {
  deudasIniciales,
  PRESUPUESTO_VARIABLE,
  VALES_DESPENSA,
  PRESUPUESTO_IMPREVISTOS,
  PRESUPUESTO_ESENCIALES,
  PRESUPUESTO_GUSTOS,
  categoriasVales,
  categoriasEsenciales,
  categoriasGustos,
  presupuestosPersonales
} from '@/lib/data';

// Timeout wrapper
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

// GET - Obtener estado actual (optimizado)
export async function GET() {
  try {
    let deudas: any[] = [];
    let gastos: any[] = [];

    try {
      const [deudasSnapshot, gastosSnapshot] = await withTimeout(
        Promise.all([
          getDocs(query(collection(db, 'deudas'), orderBy('prioridad', 'asc'))),
          getDocs(query(collection(db, 'gastos'), orderBy('fecha', 'desc'), limit(50)))
        ]),
        5000
      );

      deudas = deudasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      gastos = gastosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch {
      // Firebase timeout - usar datos locales como fallback
    }

    if (deudas.length === 0) {
      deudas = deudasIniciales;
    }

    // Filtrar gastos del mes actual
    const mesActual = new Date().toISOString().slice(0, 7);
    const gastosMes = gastos.filter((g: any) => g.fecha?.startsWith(mesActual));

    // Separar gastos por tipo
    const gastosFijos = gastosMes.filter((g: any) => g.esFijo === true);

    // Gastos con vales (marcados explícitamente o categoría de vales)
    const gastosConVales = gastosMes.filter((g: any) =>
      g.esFijo !== true && (g.conVales === true || categoriasVales.includes(g.categoria))
    );

    // Imprevistos (categoría específica)
    const gastosImprevistos = gastosMes.filter((g: any) => g.categoria === 'imprevistos');

    // Gastos esenciales (salud, transporte, hogar, gasolina, super sin vales) - NO cuentan contra presupuesto de gustos
    // Super sin vales también es esencial (comida es necesidad)
    const gastosEsenciales = gastosMes.filter((g: any) =>
      g.esFijo !== true &&
      g.conVales !== true &&
      g.categoria !== 'imprevistos' &&
      (categoriasEsenciales.includes(g.categoria) || categoriasVales.includes(g.categoria))
    );

    // Gastos de gustos (restaurantes, entretenimiento, etc.) - estos SÍ cuentan contra el presupuesto de gustos ($7,000)
    const gastosGustos = gastosMes.filter((g: any) =>
      g.esFijo !== true &&
      g.conVales !== true &&
      g.categoria !== 'imprevistos' &&
      !categoriasEsenciales.includes(g.categoria) &&
      !categoriasVales.includes(g.categoria)
    );

    // Para compatibilidad, gastosVariables = esenciales + gustos
    const gastosVariables = [...gastosEsenciales, ...gastosGustos];

    const totalGastosFijos = gastosFijos.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastosConVales = gastosConVales.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastosImprevistos = gastosImprevistos.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastosEsenciales = gastosEsenciales.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastosGustos = gastosGustos.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastosVariables = totalGastosEsenciales + totalGastosGustos;
    const totalGastadoMes = totalGastosFijos + totalGastosConVales + totalGastosVariables;
    const deudaTotal = deudas.reduce((sum: number, d: any) => sum + (d.saldoActual || 0), 0);

    // Calcular gastos por titular (solo gustos, no esenciales)
    const gastosPorTitular = {
      alejandra: gastosGustos.filter((g: any) => g.titular === 'alejandra').reduce((sum: number, g: any) => sum + (g.monto || 0), 0),
      ricardo: gastosGustos.filter((g: any) => g.titular === 'ricardo').reduce((sum: number, g: any) => sum + (g.monto || 0), 0),
      compartido: gastosGustos.filter((g: any) => g.titular === 'compartido').reduce((sum: number, g: any) => sum + (g.monto || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        deudas,
        gastosMes,
        gastosFijos,
        gastosConVales,
        gastosEsenciales,
        gastosGustos,
        gastosVariables,
        gastosImprevistos,
        totalGastosFijos,
        totalGastosConVales,
        totalGastosEsenciales,
        totalGastosGustos,
        totalGastosVariables,
        totalGastosImprevistos,
        totalGastadoMes,
        deudaTotal,
        // Presupuestos
        presupuestoVariable: PRESUPUESTO_VARIABLE,
        presupuestoVales: VALES_DESPENSA,
        presupuestoEsenciales: PRESUPUESTO_ESENCIALES,
        presupuestoGustos: PRESUPUESTO_GUSTOS,
        presupuestoImprevistos: PRESUPUESTO_IMPREVISTOS,
        presupuestosPersonales,
        // Disponibles
        disponible: PRESUPUESTO_GUSTOS - totalGastosGustos, // Solo gustos contra presupuesto de gustos
        disponibleVales: VALES_DESPENSA - totalGastosConVales,
        disponibleEsenciales: PRESUPUESTO_ESENCIALES - totalGastosEsenciales,
        disponibleImprevistos: PRESUPUESTO_IMPREVISTOS - totalGastosImprevistos,
        // Gastos por titular (solo gustos)
        gastosPorTitular,
        disponiblePorTitular: {
          alejandra: presupuestosPersonales.alejandra - gastosPorTitular.alejandra,
          ricardo: presupuestosPersonales.ricardo - gastosPorTitular.ricardo,
          compartido: presupuestosPersonales.compartido - gastosPorTitular.compartido,
        }
      }
    });
  } catch (error: any) {
    console.error('Error GET finanzas:', error);
    return NextResponse.json({
      success: true,
      data: {
        deudas: deudasIniciales,
        gastosMes: [],
        totalGastadoMes: 0,
        deudaTotal: deudasIniciales.reduce((sum, d) => sum + d.saldoActual, 0),
        presupuestoVariable: PRESUPUESTO_VARIABLE,
        disponible: PRESUPUESTO_VARIABLE
      }
    });
  }
}

// Validation helpers
function isValidMonto(monto: unknown): monto is number {
  return typeof monto === 'number' && !isNaN(monto) && monto > 0 && monto <= 10000000;
}

function sanitizeString(input: unknown, maxLength = 200): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

// POST - Operaciones del chat (mantiene compatibilidad)
export async function POST(request: Request) {
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

    const { action, params } = body as { action: unknown; params: unknown };

    if (typeof action !== 'string' || !action) {
      return NextResponse.json({ success: false, error: 'Acción requerida' }, { status: 400 });
    }

    if (typeof params !== 'object' || params === null) {
      return NextResponse.json({ success: false, error: 'Parámetros requeridos' }, { status: 400 });
    }

    switch (action) {
      case 'registrar_gasto': {
        const { monto, categoria, descripcion, titular = 'compartido', esFijo = false, conVales = false } = params as any;

        const montoNum = Number(monto);
        if (!isValidMonto(montoNum)) {
          return NextResponse.json({ success: false, error: 'Monto inválido' }, { status: 400 });
        }

        const categoriaLower = sanitizeString(categoria || 'otros', 50).toLowerCase().replace(/ /g, '_');
        const esConVales = conVales || categoriasVales.includes(categoriaLower);
        const descripcionSanitizada = sanitizeString(descripcion || categoria, 200);

        const titularesValidos = ['alejandra', 'ricardo', 'compartido'];
        const titularFinal = titularesValidos.includes(sanitizeString(titular, 50).toLowerCase())
          ? sanitizeString(titular, 50).toLowerCase()
          : 'compartido';

        const gasto = {
          fecha: new Date().toISOString().split('T')[0],
          monto: montoNum,
          categoria: categoriaLower,
          descripcion: descripcionSanitizada,
          titular: titularFinal,
          esFijo: Boolean(esFijo),
          conVales: esConVales,
          createdAt: Timestamp.now()
        };

        try {
          await withTimeout(addDoc(collection(db, 'gastos'), gasto), 5000);
        } catch {
          return NextResponse.json({ success: false, error: 'No se pudo guardar' });
        }

        const tipoGasto = esFijo ? 'Gasto fijo' : (esConVales ? 'Gasto con vales' : 'Gasto');
        return NextResponse.json({
          success: true,
          message: `${tipoGasto} de $${montoNum.toLocaleString()} en ${categoria} registrado.`,
          data: gasto
        });
      }

      case 'borrar_ultimo_gasto': {
        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('createdAt', 'desc'), limit(1))),
            5000
          );

          if (gastosSnapshot.empty) {
            return NextResponse.json({ success: false, error: 'No hay gastos' }, { status: 404 });
          }

          const ultimoGasto = gastosSnapshot.docs[0];
          const gastoData = ultimoGasto.data();
          await withTimeout(deleteDoc(doc(db, 'gastos', ultimoGasto.id)), 5000);

          return NextResponse.json({
            success: true,
            message: `Eliminado: $${gastoData.monto} - ${gastoData.descripcion}`
          });
        } catch {
          return NextResponse.json({ success: false, error: 'No se pudo borrar' }, { status: 500 });
        }
      }

      case 'borrar_gasto': {
        const { gastoId } = params as any;
        if (!gastoId) {
          return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
        }

        try {
          await withTimeout(deleteDoc(doc(db, 'gastos', gastoId)), 5000);
          return NextResponse.json({ success: true, message: 'Gasto eliminado' });
        } catch {
          return NextResponse.json({ success: false, error: 'No se pudo borrar' }, { status: 500 });
        }
      }

      case 'corregir_ultimo_gasto': {
        const { campo, valor } = params as any;
        if (!campo || valor === undefined) {
          return NextResponse.json({ success: false, error: 'Campo y valor requeridos' }, { status: 400 });
        }

        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('createdAt', 'desc'), limit(1))),
            5000
          );

          if (gastosSnapshot.empty) {
            return NextResponse.json({ success: false, error: 'No hay gastos' }, { status: 404 });
          }

          const ultimoGasto = gastosSnapshot.docs[0];
          const campoLower = campo.toLowerCase();
          const camposPermitidos = ['monto', 'descripcion', 'categoria', 'titular', 'fecha', 'esfijo', 'convales'];

          if (!camposPermitidos.includes(campoLower)) {
            return NextResponse.json({ success: false, error: 'Campo no válido' }, { status: 400 });
          }

          let valorFinal: any = valor;
          if (campoLower === 'monto') {
            const montoNum = Number(valor);
            if (!isValidMonto(montoNum)) {
              return NextResponse.json({ success: false, error: 'Monto inválido' }, { status: 400 });
            }
            valorFinal = montoNum;
          } else if (campoLower === 'esfijo' || campoLower === 'convales') {
            valorFinal = valor === true || valor === 'true' || valor === 'si' || valor === 'sí';
          }

          const campoMap: Record<string, string> = {
            'esfijo': 'esFijo',
            'convales': 'conVales',
          };
          const campoDB = campoMap[campoLower] || campoLower;

          await updateDoc(doc(db, 'gastos', ultimoGasto.id), { [campoDB]: valorFinal });

          return NextResponse.json({
            success: true,
            message: `Corregido: ${campoDB} = ${valorFinal}`
          });
        } catch {
          return NextResponse.json({ success: false, error: 'Error al corregir' }, { status: 500 });
        }
      }

      case 'obtener_resumen': {
        const deudaTotal = deudasIniciales.reduce((sum, d) => sum + d.saldoActual, 0);
        return NextResponse.json({
          success: true,
          data: {
            deudaTotal,
            deudasActivas: deudasIniciales.filter(d => !d.liquidada).length,
            proximaDeuda: deudasIniciales[0],
            presupuestoVariable: PRESUPUESTO_VARIABLE
          }
        });
      }

      default:
        return NextResponse.json({ success: false, error: `Acción desconocida: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error POST finanzas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
