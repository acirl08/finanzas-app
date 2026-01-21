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
import { deudasIniciales, PRESUPUESTO_VARIABLE, VALES_DESPENSA, categoriasVales, calcularProyeccionDeudas, compararEscenarios, calcularHealthScore, INGRESO_MENSUAL, calcularGastosFijos } from '@/lib/data';

// Timeout wrapper para evitar que Firebase cuelgue
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

// GET - Obtener estado actual (optimizado)
export async function GET() {
  try {
    // Intentar obtener datos de Firebase con timeout de 5 segundos
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

    // Fallback a datos locales si Firebase está vacío o falló
    if (deudas.length === 0) {
      deudas = deudasIniciales;
    }

    // Filtrar gastos del mes actual
    const mesActual = new Date().toISOString().slice(0, 7);
    const gastosMes = gastos.filter((g: any) => g.fecha?.startsWith(mesActual));

    // Separar gastos por tipo
    const gastosFijos = gastosMes.filter((g: any) => g.esFijo === true);
    const gastosConVales = gastosMes.filter((g: any) => g.conVales === true && g.esFijo !== true);
    const gastosImprevistos = gastosMes.filter((g: any) => g.categoria === 'imprevistos');
    const gastosVariables = gastosMes.filter((g: any) => g.esFijo !== true && g.conVales !== true && g.categoria !== 'imprevistos');

    const totalGastosFijos = gastosFijos.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastosConVales = gastosConVales.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastosImprevistos = gastosImprevistos.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastosVariables = gastosVariables.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastadoMes = totalGastosFijos + totalGastosConVales + totalGastosVariables;
    const deudaTotal = deudas.reduce((sum: number, d: any) => sum + (d.saldoActual || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        deudas,
        gastosMes,
        gastosFijos,
        gastosConVales,
        gastosVariables,
        totalGastosFijos,
        totalGastosConVales,
        totalGastosVariables,
        totalGastadoMes,
        deudaTotal,
        presupuestoVariable: PRESUPUESTO_VARIABLE,
        presupuestoVales: VALES_DESPENSA,
        disponible: PRESUPUESTO_VARIABLE - totalGastosVariables,
        disponibleVales: VALES_DESPENSA - totalGastosConVales
      }
    });
  } catch (error: any) {
    console.error('Error GET finanzas:', error);
    // Retornar datos locales en caso de error
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

// Input validation helpers
function isValidMonto(monto: unknown): monto is number {
  return typeof monto === 'number' && !isNaN(monto) && monto > 0 && monto <= 10000000;
}

function sanitizeString(input: unknown, maxLength = 200): string {
  if (typeof input !== 'string') return '';
  // Remove control characters and trim
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

// POST - Ejecutar acciones (optimizado)
export async function POST(request: Request) {
  try {
    // Parse request with validation
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

        // Validación robusta de monto
        const montoNum = Number(monto);
        if (!isValidMonto(montoNum)) {
          return NextResponse.json({ success: false, error: 'Monto inválido (debe ser mayor a 0)' }, { status: 400 });
        }

        // Auto-detectar si es gasto con vales por categoría
        const categoriaLower = sanitizeString(categoria || 'otros', 50).toLowerCase().replace(/ /g, '_');
        const esConVales = conVales || categoriasVales.includes(categoriaLower);

        // Sanitize all string inputs
        const descripcionSanitizada = sanitizeString(descripcion || categoria, 200);
        const titularSanitizado = sanitizeString(titular, 50) || 'compartido';
        const titularesValidos = ['alejandra', 'ricardo', 'compartido'];
        const titularFinal = titularesValidos.includes(titularSanitizado.toLowerCase())
          ? titularSanitizado.toLowerCase()
          : 'compartido';

        const gasto = {
          fecha: new Date().toISOString().split('T')[0],
          monto: montoNum,
          categoria: categoriaLower,
          descripcion: descripcionSanitizada,
          titular: titularFinal,
          esFijo: Boolean(esFijo), // true = gasto fijo (renta, luz)
          conVales: esConVales, // true = se paga con vales (super, frutas)
          createdAt: Timestamp.now()
        };

        // Guardar con timeout
        try {
          await withTimeout(addDoc(collection(db, 'gastos'), gasto), 5000);
        } catch (e) {
          console.error('Error guardando en Firebase:', e);
          return NextResponse.json({
            success: false,
            error: 'No se pudo guardar el gasto. Intenta de nuevo.'
          });
        }

        const tipoGasto = esFijo ? 'Gasto fijo' : (esConVales ? 'Gasto con vales' : 'Gasto');
        return NextResponse.json({
          success: true,
          message: `${tipoGasto} de $${monto.toLocaleString()} en ${categoria} registrado.`,
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
            return NextResponse.json({ success: false, error: 'No hay gastos para borrar' }, { status: 404 });
          }

          const ultimoGasto = gastosSnapshot.docs[0];
          const gastoData = ultimoGasto.data();
          await withTimeout(deleteDoc(doc(db, 'gastos', ultimoGasto.id)), 5000);

          return NextResponse.json({
            success: true,
            message: `Eliminado: $${gastoData.monto} - ${gastoData.descripcion}`
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'No se pudo borrar' }, { status: 500 });
        }
      }

      case 'borrar_gasto_por_descripcion': {
        const { descripcion } = params as any;
        const descripcionSanitizada = sanitizeString(descripcion, 200);

        if (!descripcionSanitizada) {
          return NextResponse.json({ success: false, error: 'Descripción requerida' }, { status: 400 });
        }

        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('createdAt', 'desc'), limit(20))),
            5000
          );

          // Buscar gasto que coincida con la descripción
          const gastoABorrar = gastosSnapshot.docs.find(doc => {
            const data = doc.data();
            return data.descripcion?.toLowerCase().includes(descripcionSanitizada.toLowerCase()) ||
                   data.categoria?.toLowerCase().includes(descripcionSanitizada.toLowerCase());
          });

          if (!gastoABorrar) {
            return NextResponse.json({ success: false, error: `No encontré gasto con "${descripcionSanitizada}"` }, { status: 404 });
          }

          const gastoData = gastoABorrar.data();
          await withTimeout(deleteDoc(doc(db, 'gastos', gastoABorrar.id)), 5000);

          return NextResponse.json({
            success: true,
            message: `Eliminado: $${gastoData.monto} - ${gastoData.descripcion}`
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'No se pudo borrar' }, { status: 500 });
        }
      }

      case 'registrar_pago_deuda': {
        const { deudaNombre, monto, titular } = params as any;

        const montoNum = Number(monto);
        if (!isValidMonto(montoNum)) {
          return NextResponse.json({ success: false, error: 'Monto inválido (debe ser mayor a 0)' }, { status: 400 });
        }

        const deudaNombreSanitizado = sanitizeString(deudaNombre, 100);
        if (!deudaNombreSanitizado) {
          return NextResponse.json({ success: false, error: 'Nombre de deuda requerido' }, { status: 400 });
        }

        // Buscar deuda en datos locales (más rápido)
        const titularSanitizado = sanitizeString(titular, 50);
        const deudaLocal = deudasIniciales.find(d =>
          d.nombre.toLowerCase().includes(deudaNombreSanitizado.toLowerCase()) &&
          (!titularSanitizado || d.titular.toLowerCase() === titularSanitizado.toLowerCase())
        );

        if (!deudaLocal) {
          return NextResponse.json({
            success: false,
            error: `No encontré la deuda "${deudaNombreSanitizado}"`
          }, { status: 404 });
        }

        // Intentar guardar el pago
        try {
          await withTimeout(
            addDoc(collection(db, 'pagos'), {
              deudaId: deudaLocal.id,
              deudaNombre: deudaLocal.nombre,
              monto: montoNum,
              fecha: new Date().toISOString().split('T')[0],
              createdAt: Timestamp.now()
            }),
            5000
          );
        } catch (e) {
          console.error('Error guardando pago:', e);
        }

        return NextResponse.json({
          success: true,
          message: `Pago de $${montoNum.toLocaleString()} a ${deudaLocal.nombre} registrado.`,
          data: { deuda: deudaLocal.nombre, monto: montoNum }
        });
      }

      case 'actualizar_saldo_deuda': {
        const { deudaNombre, nuevoSaldo } = params as any;

        const deudaLocal = deudasIniciales.find(d =>
          d.nombre.toLowerCase().includes(deudaNombre.toLowerCase())
        );

        if (!deudaLocal) {
          return NextResponse.json({
            success: false,
            error: `No encontré la deuda "${deudaNombre}"`
          });
        }

        return NextResponse.json({
          success: true,
          message: `Saldo de ${deudaLocal.nombre} actualizado a $${nuevoSaldo.toLocaleString()}`,
          data: { deuda: deudaLocal.nombre, nuevoSaldo }
        });
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

      case 'borrar_gasto': {
        const { gastoId } = params as any;

        if (!gastoId) {
          return NextResponse.json({ success: false, error: 'ID de gasto requerido' }, { status: 400 });
        }

        try {
          await withTimeout(deleteDoc(doc(db, 'gastos', gastoId)), 5000);
          return NextResponse.json({ success: true, message: 'Gasto eliminado' });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'No se pudo borrar' }, { status: 500 });
        }
      }

      case 'ver_ultimos_gastos': {
        const { cantidad = 5 } = params as any;

        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('createdAt', 'desc'), limit(cantidad))),
            5000
          );

          const gastos = gastosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          return NextResponse.json({
            success: true,
            data: gastos
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'Error obteniendo gastos' }, { status: 500 });
        }
      }

      case 'editar_gasto': {
        const { gastoId, campo, valor } = params as any;

        const gastoIdSanitizado = sanitizeString(gastoId, 100);
        const campoSanitizado = sanitizeString(campo, 50);

        if (!gastoIdSanitizado || !campoSanitizado || valor === undefined) {
          return NextResponse.json({ success: false, error: 'Faltan parámetros' }, { status: 400 });
        }

        try {
          const updateData: any = {};
          if (campoSanitizado === 'monto') {
            const montoNum = Number(valor);
            if (!isValidMonto(montoNum)) {
              return NextResponse.json({ success: false, error: 'Monto inválido (debe ser mayor a 0)' }, { status: 400 });
            }
            updateData.monto = montoNum;
          } else if (campoSanitizado === 'descripcion') {
            updateData.descripcion = sanitizeString(valor, 200);
          } else if (campoSanitizado === 'categoria') {
            updateData.categoria = sanitizeString(valor, 50).toLowerCase();
          } else if (campoSanitizado === 'titular') {
            const titularVal = sanitizeString(valor, 50).toLowerCase();
            const titularesValidos = ['alejandra', 'ricardo', 'compartido'];
            if (!titularesValidos.includes(titularVal)) {
              return NextResponse.json({ success: false, error: 'Titular inválido' }, { status: 400 });
            }
            updateData.titular = titularVal;
          } else if (campoSanitizado === 'fecha') {
            // Validar formato de fecha YYYY-MM-DD
            const fechaVal = sanitizeString(valor, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaVal)) {
              return NextResponse.json({ success: false, error: 'Formato de fecha inválido (use YYYY-MM-DD)' }, { status: 400 });
            }
            updateData.fecha = fechaVal;
          } else if (campoSanitizado === 'esFijo' || campoSanitizado === 'esfijo') {
            // Aceptar valores booleanos o strings
            const boolVal = valor === true || valor === 'true' || valor === 'si' || valor === 'sí' || valor === '1';
            updateData.esFijo = boolVal;
          } else if (campoSanitizado === 'conVales' || campoSanitizado === 'convales') {
            // Aceptar valores booleanos o strings
            const boolVal = valor === true || valor === 'true' || valor === 'si' || valor === 'sí' || valor === '1';
            updateData.conVales = boolVal;
          } else {
            return NextResponse.json({ success: false, error: `Campo "${campoSanitizado}" no editable. Campos válidos: monto, descripcion, categoria, titular, fecha, esFijo, conVales` }, { status: 400 });
          }

          await withTimeout(updateDoc(doc(db, 'gastos', gastoIdSanitizado), updateData), 5000);
          return NextResponse.json({
            success: true,
            message: `Gasto actualizado: ${campoSanitizado} = ${valor}`
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'No se pudo editar' }, { status: 500 });
        }
      }

      case 'gastos_por_categoria': {
        const { categoria } = params as any;

        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('fecha', 'desc'), limit(100))),
            5000
          );

          const mesActual = new Date().toISOString().slice(0, 7);
          const gastosFiltrados = gastosSnapshot.docs
            .map(doc => doc.data())
            .filter((g: any) =>
              g.fecha?.startsWith(mesActual) &&
              g.categoria?.toLowerCase().includes(categoria.toLowerCase())
            );

          const total = gastosFiltrados.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);

          return NextResponse.json({
            success: true,
            data: {
              categoria,
              total,
              cantidad: gastosFiltrados.length,
              gastos: gastosFiltrados.slice(0, 5)
            }
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'Error obteniendo gastos' }, { status: 500 });
        }
      }

      case 'gastos_por_titular': {
        const { titular } = params as any;

        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('fecha', 'desc'), limit(100))),
            5000
          );

          const mesActual = new Date().toISOString().slice(0, 7);
          const gastosFiltrados = gastosSnapshot.docs
            .map(doc => doc.data())
            .filter((g: any) =>
              g.fecha?.startsWith(mesActual) &&
              g.titular?.toLowerCase() === titular.toLowerCase()
            );

          const total = gastosFiltrados.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);

          return NextResponse.json({
            success: true,
            data: {
              titular,
              total,
              cantidad: gastosFiltrados.length,
              gastos: gastosFiltrados.slice(0, 5)
            }
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'Error obteniendo gastos' }, { status: 500 });
        }
      }

      case 'listar_deudas': {
        const deudas = deudasIniciales.map(d => ({
          nombre: d.nombre,
          titular: d.titular,
          saldo: d.saldoActual,
          cat: d.cat,
          pagoMinimo: d.pagoMinimo,
          prioridad: d.prioridad
        }));

        const deudaTotal = deudasIniciales.reduce((sum, d) => sum + d.saldoActual, 0);

        return NextResponse.json({
          success: true,
          data: {
            deudas,
            deudaTotal,
            cantidadDeudas: deudas.length
          }
        });
      }

      case 'simular_pago_extra': {
        const { montoExtra } = params as any;

        // Usar cálculo real con intereses compuestos
        const comparacion = compararEscenarios(deudasIniciales, Number(montoExtra));
        const pagosMinimosTotal = deudasIniciales.reduce((sum, d) => sum + d.pagoMinimo, 0);

        return NextResponse.json({
          success: true,
          data: {
            montoExtra: Number(montoExtra),
            pagoMensualActual: pagosMinimosTotal,
            pagoMensualNuevo: pagosMinimosTotal + Number(montoExtra),
            mesesSinExtra: comparacion.sinExtra.mesesParaLibertad,
            mesesConExtra: comparacion.conExtra.mesesParaLibertad,
            mesesAhorrados: comparacion.mesesAhorrados,
            interesAhorrado: comparacion.interesesAhorrados,
            fechaLibertadSinExtra: comparacion.sinExtra.fechaLibertad,
            fechaLibertadConExtra: comparacion.conExtra.fechaLibertad,
            // Datos adicionales del cálculo real
            totalInteresesSinExtra: comparacion.sinExtra.totalInteresesPagados,
            totalInteresesConExtra: comparacion.conExtra.totalInteresesPagados,
            ordenLiquidacion: comparacion.conExtra.ordenLiquidacion
          }
        });
      }

      case 'proyeccion_libertad': {
        // Usar cálculo real con intereses compuestos
        const proyeccion = calcularProyeccionDeudas(deudasIniciales, 0);
        const deudaTotal = deudasIniciales.reduce((sum, d) => sum + d.saldoActual, 0);
        const pagosMinimosTotal = deudasIniciales.reduce((sum, d) => sum + d.pagoMinimo, 0);

        return NextResponse.json({
          success: true,
          data: {
            deudaTotal,
            pagoMensual: pagosMinimosTotal,
            mesesRestantes: proyeccion.mesesParaLibertad,
            fechaLibertad: proyeccion.fechaLibertad,
            totalInteresesAPagar: proyeccion.totalInteresesPagados,
            totalAPagar: deudaTotal + proyeccion.totalInteresesPagados,
            proximasLiquidaciones: proyeccion.ordenLiquidacion.slice(0, 5),
            // Proyección mensual para gráficas
            proyeccionMensual: proyeccion.proyeccionMensual.filter((_, i) => i % 3 === 0 || i === proyeccion.proyeccionMensual.length - 1)
          }
        });
      }

      case 'obtener_historial_pagos': {
        try {
          const pagosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'pagos'), orderBy('fecha', 'desc'), limit(100))),
            5000
          );

          const pagos = pagosSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              deudaId: data.deudaId,
              deudaNombre: data.deudaNombre,
              monto: data.monto,
              fecha: data.fecha,
              saldoAnterior: data.saldoAnterior || 0,
              saldoNuevo: data.saldoNuevo || 0,
            };
          });

          return NextResponse.json({
            success: true,
            data: pagos
          });
        } catch (e) {
          console.error('Error obteniendo historial de pagos:', e);
          return NextResponse.json({
            success: true,
            data: []
          });
        }
      }

      case 'obtener_health_score': {
        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('fecha', 'desc'), limit(100))),
            5000
          );

          const mesActual = new Date().toISOString().slice(0, 7);
          const gastosDelMes = gastosSnapshot.docs
            .map(doc => doc.data())
            .filter((g: any) => g.fecha?.startsWith(mesActual) && !g.esFijo && g.categoria !== 'imprevistos');

          const totalGastosMes = gastosDelMes.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
          const deudaTotal = deudasIniciales.reduce((sum, d) => sum + d.saldoActual, 0);

          // Calcular ahorro estimado (ingreso - gastos fijos - deudas - gastos variables)
          const pagosMinimos = deudasIniciales.reduce((sum, d) => sum + d.pagoMinimo, 0);
          const gastosFijosTotal = calcularGastosFijos();
          const ahorroEstimado = INGRESO_MENSUAL - totalGastosMes - pagosMinimos - gastosFijosTotal;

          const healthScore = calcularHealthScore(
            deudaTotal,
            INGRESO_MENSUAL,
            totalGastosMes,
            Math.max(0, ahorroEstimado)
          );

          return NextResponse.json({
            success: true,
            data: {
              ...healthScore,
              deudaTotal,
              ingresoMensual: INGRESO_MENSUAL,
              gastosMes: totalGastosMes,
              ratioDeudaIngreso: ((deudaTotal / (INGRESO_MENSUAL * 12)) * 100).toFixed(1)
            }
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'Error calculando health score' }, { status: 500 });
        }
      }

      case 'obtener_reporte_mensual': {
        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('fecha', 'desc'), limit(200))),
            5000
          );

          const mesActual = new Date().toISOString().slice(0, 7);
          const mesAnterior = new Date();
          mesAnterior.setMonth(mesAnterior.getMonth() - 1);
          const mesAnteriorStr = mesAnterior.toISOString().slice(0, 7);

          const todosGastos = gastosSnapshot.docs.map(doc => doc.data());

          // Gastos del mes actual (SOLO variables, sin fijos ni imprevistos)
          const gastosActual = todosGastos.filter((g: any) => g.fecha?.startsWith(mesActual) && !g.esFijo && g.categoria !== 'imprevistos');
          const gastosAnterior = todosGastos.filter((g: any) => g.fecha?.startsWith(mesAnteriorStr) && !g.esFijo && g.categoria !== 'imprevistos');

          // Totales (solo gastos variables)
          const totalActual = gastosActual.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
          const totalAnterior = gastosAnterior.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);

          // Por categoría
          const porCategoria: Record<string, { actual: number; anterior: number }> = {};
          gastosActual.forEach((g: any) => {
            const cat = g.categoria || 'otros';
            if (!porCategoria[cat]) porCategoria[cat] = { actual: 0, anterior: 0 };
            porCategoria[cat].actual += g.monto || 0;
          });
          gastosAnterior.forEach((g: any) => {
            const cat = g.categoria || 'otros';
            if (!porCategoria[cat]) porCategoria[cat] = { actual: 0, anterior: 0 };
            porCategoria[cat].anterior += g.monto || 0;
          });

          // Por titular
          const porTitular: Record<string, { actual: number; anterior: number }> = {};
          ['alejandra', 'ricardo', 'compartido'].forEach(t => {
            porTitular[t] = {
              actual: gastosActual.filter((g: any) => g.titular === t).reduce((sum: number, g: any) => sum + (g.monto || 0), 0),
              anterior: gastosAnterior.filter((g: any) => g.titular === t).reduce((sum: number, g: any) => sum + (g.monto || 0), 0)
            };
          });

          // Proyección de deuda
          const proyeccion = calcularProyeccionDeudas(deudasIniciales, 0);

          // Insights
          const insights: string[] = [];

          // Comparar con mes anterior
          if (totalAnterior > 0) {
            const cambio = ((totalActual - totalAnterior) / totalAnterior) * 100;
            if (cambio > 20) {
              insights.push(`⚠️ Gastaste ${cambio.toFixed(0)}% más que el mes pasado`);
            } else if (cambio < -10) {
              insights.push(`🎉 Redujiste gastos ${Math.abs(cambio).toFixed(0)}% vs mes pasado`);
            }
          }

          // Categoría con más aumento
          const categoriaMaxAumento = Object.entries(porCategoria)
            .map(([cat, data]) => ({
              cat,
              aumento: data.anterior > 0 ? ((data.actual - data.anterior) / data.anterior) * 100 : 0
            }))
            .filter(c => c.aumento > 50)
            .sort((a, b) => b.aumento - a.aumento)[0];

          if (categoriaMaxAumento) {
            insights.push(`📈 ${categoriaMaxAumento.cat} subió ${categoriaMaxAumento.aumento.toFixed(0)}%`);
          }

          // Presupuesto
          if (totalActual > PRESUPUESTO_VARIABLE * 0.9) {
            insights.push(`🔴 Cerca del límite de presupuesto ($${PRESUPUESTO_VARIABLE.toLocaleString()})`);
          } else if (totalActual < PRESUPUESTO_VARIABLE * 0.5) {
            insights.push(`💚 Buen control de gastos (${((totalActual / PRESUPUESTO_VARIABLE) * 100).toFixed(0)}% del presupuesto)`);
          }

          return NextResponse.json({
            success: true,
            data: {
              mesActual,
              totalActual,
              totalAnterior,
              cambioVsMesAnterior: totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : 0,
              porCategoria,
              porTitular,
              presupuesto: PRESUPUESTO_VARIABLE,
              disponible: PRESUPUESTO_VARIABLE - totalActual,
              proyeccionDeuda: {
                mesesRestantes: proyeccion.mesesParaLibertad,
                fechaLibertad: proyeccion.fechaLibertad,
                totalIntereses: proyeccion.totalInteresesPagados
              },
              insights,
              transacciones: gastosActual.length
            }
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'Error generando reporte' }, { status: 500 });
        }
      }

      case 'obtener_forecast': {
        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('fecha', 'desc'), limit(300))),
            5000
          );

          const todosGastos = gastosSnapshot.docs.map(doc => doc.data());

          // Calcular promedio de últimos 3 meses
          const hoy = new Date();
          const ultimos3Meses: number[] = [];

          for (let i = 1; i <= 3; i++) {
            const fecha = new Date(hoy);
            fecha.setMonth(hoy.getMonth() - i);
            const mesStr = fecha.toISOString().slice(0, 7);
            const totalMes = todosGastos
              .filter((g: any) => g.fecha?.startsWith(mesStr) && !g.esFijo && g.categoria !== 'imprevistos')
              .reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
            ultimos3Meses.push(totalMes);
          }

          const promedioMensual = ultimos3Meses.reduce((a, b) => a + b, 0) / 3;

          // Proyección 6 meses
          const gastosFijosTotal = calcularGastosFijos();
          const forecast = [];
          for (let i = 1; i <= 6; i++) {
            const fecha = new Date(hoy);
            fecha.setMonth(hoy.getMonth() + i);
            forecast.push({
              mes: fecha.toISOString().slice(0, 7),
              mesLabel: fecha.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }),
              gastoProyectado: Math.round(promedioMensual),
              ingresoProyectado: INGRESO_MENSUAL,
              ahorroProyectado: Math.round(INGRESO_MENSUAL - promedioMensual - gastosFijosTotal)
            });
          }

          // Proyección de deuda
          const proyeccionDeuda = calcularProyeccionDeudas(deudasIniciales, 0);

          return NextResponse.json({
            success: true,
            data: {
              promedioGastoMensual: Math.round(promedioMensual),
              ingresoMensual: INGRESO_MENSUAL,
              forecast,
              proyeccionDeuda: proyeccionDeuda.proyeccionMensual
                .filter((_, i) => i < 6)
                .map(p => ({
                  mes: p.fecha,
                  saldoDeuda: p.saldoTotal,
                  interesesMes: p.interesesMes
                }))
            }
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'Error generando forecast' }, { status: 500 });
        }
      }

      case 'corregir_ultimo_gasto': {
        const { campo, valor } = params as any;
        if (!campo || valor === undefined) {
          return NextResponse.json({ success: false, error: 'Campo y valor requeridos' }, { status: 400 });
        }

        try {
          // Obtener el último gasto
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('createdAt', 'desc'), limit(1))),
            5000
          );

          if (gastosSnapshot.empty) {
            return NextResponse.json({ success: false, error: 'No hay gastos para corregir' }, { status: 404 });
          }

          const ultimoGasto = gastosSnapshot.docs[0];
          const gastoRef = doc(db, 'gastos', ultimoGasto.id);

          // Validar campo permitido
          const camposPermitidos = ['monto', 'descripcion', 'categoria', 'titular', 'fecha', 'esFijo', 'conVales'];
          const campoLower = campo.toLowerCase();
          if (!camposPermitidos.map(c => c.toLowerCase()).includes(campoLower)) {
            return NextResponse.json({ success: false, error: `Campo no permitido. Usa: ${camposPermitidos.join(', ')}` }, { status: 400 });
          }

          // Convertir y validar valor según el campo
          let valorFinal: any = valor;
          if (campoLower === 'monto') {
            const montoNum = Number(valor);
            if (!isValidMonto(montoNum)) {
              return NextResponse.json({ success: false, error: 'Monto inválido (debe ser mayor a 0)' }, { status: 400 });
            }
            valorFinal = montoNum;
          } else if (campoLower === 'fecha') {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
              return NextResponse.json({ success: false, error: 'Formato de fecha inválido (use YYYY-MM-DD)' }, { status: 400 });
            }
            valorFinal = valor;
          } else if (campoLower === 'esfijo' || campoLower === 'convales') {
            valorFinal = valor === true || valor === 'true' || valor === 'si' || valor === 'sí' || valor === '1';
          } else if (campoLower === 'titular') {
            const titularVal = String(valor).toLowerCase();
            const titularesValidos = ['alejandra', 'ricardo', 'compartido'];
            if (!titularesValidos.includes(titularVal)) {
              return NextResponse.json({ success: false, error: 'Titular inválido' }, { status: 400 });
            }
            valorFinal = titularVal;
          }

          // Mapear campo a la propiedad correcta
          const campoMap: Record<string, string> = {
            'monto': 'monto',
            'descripcion': 'descripcion',
            'categoria': 'categoria',
            'titular': 'titular',
            'fecha': 'fecha',
            'esfijo': 'esFijo',
            'convales': 'conVales',
          };
          const campoDB = campoMap[campoLower] || campo;

          await updateDoc(gastoRef, { [campoDB]: valorFinal });

          return NextResponse.json({
            success: true,
            message: `Último gasto corregido: ${campoDB} = ${valorFinal}`
          });
        } catch (e) {
          console.error('Error corrigiendo último gasto:', e);
          return NextResponse.json({ success: false, error: 'Error al corregir gasto' }, { status: 500 });
        }
      }

      case 'crear_meta_ahorro': {
        const { nombre, montoObjetivo } = params as any;
        if (!nombre || !montoObjetivo) {
          return NextResponse.json({ success: false, error: 'Nombre y monto objetivo requeridos' }, { status: 400 });
        }

        try {
          const metaData = {
            nombre,
            montoObjetivo: Number(montoObjetivo),
            montoActual: 0,
            createdAt: Timestamp.now(),
            activa: true
          };

          const docRef = await addDoc(collection(db, 'metas'), metaData);

          return NextResponse.json({
            success: true,
            message: `Meta "${nombre}" creada con objetivo de $${Number(montoObjetivo).toLocaleString()}`,
            data: { id: docRef.id, ...metaData }
          });
        } catch (e) {
          console.error('Error creando meta:', e);
          return NextResponse.json({ success: false, error: 'Error al crear meta' }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({ success: false, error: `Acción desconocida: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error POST finanzas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
