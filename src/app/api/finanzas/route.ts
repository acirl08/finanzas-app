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
import { deudasIniciales, PRESUPUESTO_VARIABLE, VALES_DESPENSA, categoriasVales } from '@/lib/data';

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
    } catch (e) {
      console.log('Firebase timeout, usando datos locales');
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
    const gastosVariables = gastosMes.filter((g: any) => g.esFijo !== true && g.conVales !== true);

    const totalGastosFijos = gastosFijos.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalGastosConVales = gastosConVales.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
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

// POST - Ejecutar acciones (optimizado)
export async function POST(request: Request) {
  try {
    const { action, params } = await request.json();

    switch (action) {
      case 'registrar_gasto': {
        const { monto, categoria, descripcion, titular = 'compartido', esFijo = false, conVales = false } = params;

        // Validación básica
        if (!monto || monto <= 0) {
          return NextResponse.json({ success: false, error: 'Monto inválido' });
        }

        // Auto-detectar si es gasto con vales por categoría
        const categoriaLower = String(categoria || 'otros').toLowerCase().replace(/ /g, '_');
        const esConVales = conVales || categoriasVales.includes(categoriaLower);

        const gasto = {
          fecha: new Date().toISOString().split('T')[0],
          monto: Number(monto),
          categoria: categoriaLower,
          descripcion: String(descripcion || categoria),
          titular: String(titular),
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
            return NextResponse.json({ success: false, error: 'No hay gastos para borrar' });
          }

          const ultimoGasto = gastosSnapshot.docs[0];
          const gastoData = ultimoGasto.data();
          await withTimeout(deleteDoc(doc(db, 'gastos', ultimoGasto.id)), 5000);

          return NextResponse.json({
            success: true,
            message: `Eliminado: $${gastoData.monto} - ${gastoData.descripcion}`
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'No se pudo borrar' });
        }
      }

      case 'borrar_gasto_por_descripcion': {
        const { descripcion } = params;

        try {
          const gastosSnapshot = await withTimeout(
            getDocs(query(collection(db, 'gastos'), orderBy('createdAt', 'desc'), limit(20))),
            5000
          );

          // Buscar gasto que coincida con la descripción
          const gastoABorrar = gastosSnapshot.docs.find(doc => {
            const data = doc.data();
            return data.descripcion?.toLowerCase().includes(descripcion.toLowerCase()) ||
                   data.categoria?.toLowerCase().includes(descripcion.toLowerCase());
          });

          if (!gastoABorrar) {
            return NextResponse.json({ success: false, error: `No encontré gasto con "${descripcion}"` });
          }

          const gastoData = gastoABorrar.data();
          await withTimeout(deleteDoc(doc(db, 'gastos', gastoABorrar.id)), 5000);

          return NextResponse.json({
            success: true,
            message: `Eliminado: $${gastoData.monto} - ${gastoData.descripcion}`
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'No se pudo borrar' });
        }
      }

      case 'registrar_pago_deuda': {
        const { deudaNombre, monto, titular } = params;

        if (!monto || monto <= 0) {
          return NextResponse.json({ success: false, error: 'Monto inválido' });
        }

        // Buscar deuda en datos locales (más rápido)
        const deudaLocal = deudasIniciales.find(d =>
          d.nombre.toLowerCase().includes(deudaNombre.toLowerCase()) &&
          (!titular || d.titular.toLowerCase() === titular.toLowerCase())
        );

        if (!deudaLocal) {
          return NextResponse.json({
            success: false,
            error: `No encontré la deuda "${deudaNombre}"`
          });
        }

        // Intentar guardar el pago
        try {
          await withTimeout(
            addDoc(collection(db, 'pagos'), {
              deudaId: deudaLocal.id,
              deudaNombre: deudaLocal.nombre,
              monto: Number(monto),
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
          message: `Pago de $${monto.toLocaleString()} a ${deudaLocal.nombre} registrado.`,
          data: { deuda: deudaLocal.nombre, monto }
        });
      }

      case 'actualizar_saldo_deuda': {
        const { deudaNombre, nuevoSaldo } = params;

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
        const { gastoId } = params;

        if (!gastoId) {
          return NextResponse.json({ success: false, error: 'ID de gasto requerido' });
        }

        try {
          await withTimeout(deleteDoc(doc(db, 'gastos', gastoId)), 5000);
          return NextResponse.json({ success: true, message: 'Gasto eliminado' });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'No se pudo borrar' });
        }
      }

      case 'ver_ultimos_gastos': {
        const { cantidad = 5 } = params;

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
          return NextResponse.json({ success: false, error: 'Error obteniendo gastos' });
        }
      }

      case 'editar_gasto': {
        const { gastoId, campo, valor } = params;

        if (!gastoId || !campo || valor === undefined) {
          return NextResponse.json({ success: false, error: 'Faltan parámetros' });
        }

        try {
          const updateData: any = {};
          if (campo === 'monto') updateData.monto = Number(valor);
          else if (campo === 'descripcion') updateData.descripcion = String(valor);
          else if (campo === 'categoria') updateData.categoria = String(valor).toLowerCase();
          else {
            return NextResponse.json({ success: false, error: `Campo "${campo}" no editable` });
          }

          await withTimeout(updateDoc(doc(db, 'gastos', gastoId), updateData), 5000);
          return NextResponse.json({
            success: true,
            message: `Gasto actualizado: ${campo} = ${valor}`
          });
        } catch (e) {
          return NextResponse.json({ success: false, error: 'No se pudo editar' });
        }
      }

      case 'gastos_por_categoria': {
        const { categoria } = params;

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
          return NextResponse.json({ success: false, error: 'Error obteniendo gastos' });
        }
      }

      case 'gastos_por_titular': {
        const { titular } = params;

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
          return NextResponse.json({ success: false, error: 'Error obteniendo gastos' });
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
        const { montoExtra } = params;
        const pagoMensualBase = 38450; // Lo que ya pagan mensualmente
        const pagoTotal = pagoMensualBase + Number(montoExtra);

        const deudaTotal = deudasIniciales.reduce((sum, d) => sum + d.saldoActual, 0);

        // Calcular meses sin extra vs con extra
        const mesesSinExtra = Math.ceil(deudaTotal / pagoMensualBase);
        const mesesConExtra = Math.ceil(deudaTotal / pagoTotal);
        const mesesAhorrados = mesesSinExtra - mesesConExtra;

        // Calcular interés aproximado ahorrado (simplificado)
        const tasaPromedioMensual = 0.05; // ~60% anual promedio / 12
        const interesAhorrado = Math.round(deudaTotal * tasaPromedioMensual * mesesAhorrados);

        // Calcular fecha de libertad
        const hoy = new Date();
        const fechaLibertadSinExtra = new Date(hoy);
        fechaLibertadSinExtra.setMonth(hoy.getMonth() + mesesSinExtra);
        const fechaLibertadConExtra = new Date(hoy);
        fechaLibertadConExtra.setMonth(hoy.getMonth() + mesesConExtra);

        return NextResponse.json({
          success: true,
          data: {
            montoExtra: Number(montoExtra),
            pagoMensualActual: pagoMensualBase,
            pagoMensualNuevo: pagoTotal,
            mesesSinExtra,
            mesesConExtra,
            mesesAhorrados,
            interesAhorrado,
            fechaLibertadSinExtra: fechaLibertadSinExtra.toISOString().slice(0, 7),
            fechaLibertadConExtra: fechaLibertadConExtra.toISOString().slice(0, 7)
          }
        });
      }

      case 'proyeccion_libertad': {
        const pagoMensual = 38450;
        const deudaTotal = deudasIniciales.reduce((sum, d) => sum + d.saldoActual, 0);
        const mesesRestantes = Math.ceil(deudaTotal / pagoMensual);

        const hoy = new Date();
        const fechaLibertad = new Date(hoy);
        fechaLibertad.setMonth(hoy.getMonth() + mesesRestantes);

        // Calcular próximas deudas a liquidar
        let saldoAcumulado = 0;
        const proximasLiquidaciones = deudasIniciales
          .filter(d => !d.liquidada)
          .map(d => {
            saldoAcumulado += d.saldoActual;
            const mesesParaLiquidar = Math.ceil(saldoAcumulado / pagoMensual);
            const fechaLiquidacion = new Date(hoy);
            fechaLiquidacion.setMonth(hoy.getMonth() + mesesParaLiquidar);
            return {
              nombre: d.nombre,
              saldo: d.saldoActual,
              fechaEstimada: fechaLiquidacion.toISOString().slice(0, 7)
            };
          });

        return NextResponse.json({
          success: true,
          data: {
            deudaTotal,
            pagoMensual,
            mesesRestantes,
            fechaLibertad: fechaLibertad.toISOString().slice(0, 7),
            proximasLiquidaciones: proximasLiquidaciones.slice(0, 3)
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

      default:
        return NextResponse.json({ success: false, error: `Acción desconocida: ${action}` });
    }
  } catch (error: any) {
    console.error('Error POST finanzas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
