'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Calendar, ArrowRight } from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { formatMoney } from '@/lib/utils';

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}%`;
}

// Mapeo de categorías para mostrar nombres legibles
const CATEGORY_LABELS: Record<string, string> = {
  'super': 'Súper',
  'frutas_verduras': 'Frutas/Verduras',
  'restaurantes': 'Restaurantes',
  'cafe_snacks': 'Café/Snacks',
  'transporte': 'Transporte',
  'gasolina': 'Gasolina',
  'salud': 'Salud',
  'entretenimiento': 'Entretenimiento',
  'ropa': 'Ropa',
  'personal': 'Personal',
  'hogar': 'Hogar',
  'imprevistos': 'Imprevistos',
  'otros_gustos': 'Otros',
};

export default function MonthComparison() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const comparisonData = useMemo(() => {
    const today = new Date();
    const mesActual = today.toISOString().slice(0, 7); // YYYY-MM

    // Mes anterior
    const mesAnteriorDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const mesAnterior = mesAnteriorDate.toISOString().slice(0, 7);

    // Nombres de los meses
    const nombreMesActual = today.toLocaleDateString('es-MX', { month: 'long' });
    const nombreMesAnterior = mesAnteriorDate.toLocaleDateString('es-MX', { month: 'long' });

    // Día actual del mes (para comparación proporcional)
    const diaActual = today.getDate();
    const diasEnMesAnterior = new Date(today.getFullYear(), today.getMonth(), 0).getDate();

    // Filtrar gastos por mes (solo variables, no fijos, no vales)
    const gastosActual = gastos.filter(g =>
      g.fecha.startsWith(mesActual) && !g.esFijo && !g.conVales
    );
    const gastosAnterior = gastos.filter(g =>
      g.fecha.startsWith(mesAnterior) && !g.esFijo && !g.conVales
    );

    // Gastos del mes anterior hasta el mismo día (para comparación justa)
    const gastosAnteriorHastaHoy = gastosAnterior.filter(g => {
      const dia = parseInt(g.fecha.split('-')[2]);
      return dia <= diaActual;
    });

    // Totales
    const totalActual = gastosActual.reduce((sum, g) => sum + g.monto, 0);
    const totalAnteriorCompleto = gastosAnterior.reduce((sum, g) => sum + g.monto, 0);
    const totalAnteriorHastaHoy = gastosAnteriorHastaHoy.reduce((sum, g) => sum + g.monto, 0);

    // Diferencia vs mismo período
    const diferencia = totalActual - totalAnteriorHastaHoy;
    const porcentajeCambio = totalAnteriorHastaHoy > 0
      ? ((totalActual - totalAnteriorHastaHoy) / totalAnteriorHastaHoy) * 100
      : 0;

    // Por categoría
    const porCategoriaActual: Record<string, number> = {};
    const porCategoriaAnterior: Record<string, number> = {};

    gastosActual.forEach(g => {
      porCategoriaActual[g.categoria] = (porCategoriaActual[g.categoria] || 0) + g.monto;
    });

    gastosAnteriorHastaHoy.forEach(g => {
      porCategoriaAnterior[g.categoria] = (porCategoriaAnterior[g.categoria] || 0) + g.monto;
    });

    // Unir todas las categorías
    const todasCategorias = new Set([
      ...Object.keys(porCategoriaActual),
      ...Object.keys(porCategoriaAnterior)
    ]);

    const comparativaPorCategoria = Array.from(todasCategorias).map(cat => {
      const actual = porCategoriaActual[cat] || 0;
      const anterior = porCategoriaAnterior[cat] || 0;
      const dif = actual - anterior;
      const pct = anterior > 0 ? ((actual - anterior) / anterior) * 100 : (actual > 0 ? 100 : 0);

      return {
        categoria: cat,
        label: CATEGORY_LABELS[cat] || cat,
        actual,
        anterior,
        diferencia: dif,
        porcentaje: pct,
      };
    }).sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia));

    // Insight principal
    let insight = '';
    if (porcentajeCambio < -10) {
      insight = `Vas muy bien! Llevas ${formatMoney(Math.abs(diferencia))} menos que el mes pasado.`;
    } else if (porcentajeCambio < 0) {
      insight = `Buen trabajo, vas un poco mejor que ${nombreMesAnterior}.`;
    } else if (porcentajeCambio < 10) {
      insight = `Vas similar al mes pasado, mantén el ritmo.`;
    } else if (porcentajeCambio < 25) {
      insight = `Cuidado, llevas ${formatMoney(diferencia)} más que en ${nombreMesAnterior}.`;
    } else {
      insight = `Alerta! Vas ${formatPercent(porcentajeCambio)} arriba del mes pasado.`;
    }

    // Categoría con mayor incremento
    const categoriaProblema = comparativaPorCategoria.find(c => c.diferencia > 500);
    if (categoriaProblema) {
      insight += ` Revisa ${categoriaProblema.label}.`;
    }

    return {
      nombreMesActual,
      nombreMesAnterior,
      diaActual,
      diasEnMesAnterior,
      totalActual,
      totalAnteriorCompleto,
      totalAnteriorHastaHoy,
      diferencia,
      porcentajeCambio,
      comparativaPorCategoria,
      insight,
      hayDatosAnterior: gastosAnterior.length > 0,
    };
  }, [gastos]);

  if (loading) {
    return <div className="glass-card animate-pulse h-32" />;
  }

  // Si no hay datos del mes anterior, mostrar mensaje
  if (!comparisonData.hayDatosAnterior) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Comparativa Mensual</h3>
            <p className="text-xs text-white/50">vs mes anterior</p>
          </div>
        </div>
        <div className="text-center py-6">
          <p className="text-white/50 text-sm">
            No hay datos de {comparisonData.nombreMesAnterior} para comparar.
          </p>
          <p className="text-white/30 text-xs mt-1">
            El próximo mes podrás ver la comparativa.
          </p>
        </div>
      </div>
    );
  }

  const isPositive = comparisonData.diferencia >= 0; // positivo = gastaste más = malo
  const trendColor = isPositive ? 'text-red-400' : 'text-emerald-400';
  const trendBg = isPositive ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">vs {comparisonData.nombreMesAnterior}</h3>
            <p className="text-xs text-white/50">
              Comparando hasta día {comparisonData.diaActual}
            </p>
          </div>
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
        </button>
      </div>

      {/* Main Comparison */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <p className="text-xs text-white/40 capitalize">{comparisonData.nombreMesAnterior}</p>
          <p className="text-xl font-bold text-white/60">{formatMoney(comparisonData.totalAnteriorHastaHoy)}</p>
        </div>

        <div className="flex items-center gap-2 px-4">
          <ArrowRight className="w-5 h-5 text-white/30" />
        </div>

        <div className="text-center flex-1">
          <p className="text-xs text-white/40 capitalize">{comparisonData.nombreMesActual}</p>
          <p className="text-xl font-bold text-white">{formatMoney(comparisonData.totalActual)}</p>
        </div>
      </div>

      {/* Difference Badge */}
      <div className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${trendBg}`}>
        <TrendIcon className={`w-5 h-5 ${trendColor}`} />
        <span className={`font-semibold ${trendColor}`}>
          {isPositive ? '+' : ''}{formatMoney(comparisonData.diferencia)}
        </span>
        <span className={`text-sm ${trendColor}`}>
          ({formatPercent(comparisonData.porcentajeCambio)})
        </span>
      </div>

      {/* Insight */}
      <p className="text-sm text-white/60 text-center mt-3">
        {comparisonData.insight}
      </p>

      {/* Expanded: Desglose por categoría */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <h4 className="text-sm font-medium text-white/70 mb-3">Por categoría</h4>
          {comparisonData.comparativaPorCategoria
            .filter(c => c.actual > 0 || c.anterior > 0)
            .slice(0, 6)
            .map((cat) => {
              const catPositive = cat.diferencia >= 0;
              const catColor = cat.diferencia === 0
                ? 'text-white/50'
                : catPositive ? 'text-red-400' : 'text-emerald-400';
              const CatIcon = cat.diferencia === 0 ? Minus : catPositive ? TrendingUp : TrendingDown;

              return (
                <div key={cat.categoria} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm text-white">{cat.label}</p>
                    <p className="text-xs text-white/40">
                      {formatMoney(cat.anterior)} → {formatMoney(cat.actual)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${catColor}`}>
                    <CatIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {cat.diferencia === 0 ? '=' : (catPositive ? '+' : '') + formatMoney(cat.diferencia)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
