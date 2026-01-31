import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  deudasIniciales,
  PRESUPUESTO_VARIABLE,
  INGRESO_MENSUAL,
  calcularGastosFijos,
  calcularProyeccionDeudas,
  calcularHealthScore
} from '@/lib/data';

// Timeout wrapper
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

// GET - Obtener reportes y análisis
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'mensual';

    // Obtener gastos
    const gastosSnapshot = await withTimeout(
      getDocs(query(collection(db, 'gastos'), orderBy('fecha', 'desc'), limit(300))),
      5000
    );
    const todosGastos = gastosSnapshot.docs.map(doc => doc.data());

    const hoy = new Date();
    const mesActual = hoy.toISOString().slice(0, 7);
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().slice(0, 7);

    switch (tipo) {
      case 'mensual': {
        // Gastos del mes actual (solo variables)
        const gastosActual = todosGastos.filter((g: any) =>
          g.fecha?.startsWith(mesActual) && !g.esFijo && g.categoria !== 'imprevistos'
        );
        const gastosAnterior = todosGastos.filter((g: any) =>
          g.fecha?.startsWith(mesAnterior) && !g.esFijo && g.categoria !== 'imprevistos'
        );

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
        if (totalAnterior > 0) {
          const cambio = ((totalActual - totalAnterior) / totalAnterior) * 100;
          if (cambio > 20) {
            insights.push(`⚠️ Gastaste ${cambio.toFixed(0)}% más que el mes pasado`);
          } else if (cambio < -10) {
            insights.push(`🎉 Redujiste gastos ${Math.abs(cambio).toFixed(0)}% vs mes pasado`);
          }
        }

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
      }

      case 'health': {
        const gastosDelMes = todosGastos.filter((g: any) =>
          g.fecha?.startsWith(mesActual) && !g.esFijo && g.categoria !== 'imprevistos'
        );
        const totalGastosMes = gastosDelMes.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
        const deudaTotal = deudasIniciales.reduce((sum, d) => sum + d.saldoActual, 0);

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
      }

      case 'forecast': {
        // Calcular promedio de últimos 3 meses
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
        const gastosFijosTotal = calcularGastosFijos();

        // Proyección 6 meses
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
      }

      default:
        return NextResponse.json({ success: false, error: 'Tipo de reporte no válido' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error GET reportes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
