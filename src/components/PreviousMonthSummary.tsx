'use client';

import { useState, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Award, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { formatMonth, getCurrentMonth } from '@/contexts/MonthContext';
import { useFirestore } from '@/contexts/FirestoreContext';

import {
  PRESUPUESTO_VARIABLE,
  PRESUPUESTO_IMPREVISTOS,
  presupuestosPersonales,
  categoriaLabels
} from '@/lib/data';
import {
  filtrarGastosDelMes,
  filtrarGastosVariables,
  filtrarGastosGustos,
  filtrarImprevistos,
  filtrarPorTitular,
  calcularTotal
} from '@/hooks/useGastosFilters';

export default function PreviousMonthSummary() {
  const { gastos, pagos, loadingGastos: loading } = useFirestore();
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    const currentMonth = getCurrentMonth();
    const [year, month] = currentMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const previousMonth = prevDate.toISOString().slice(0, 7);

    // Gastos del mes anterior
    const gastosDelMes = filtrarGastosDelMes(gastos, previousMonth);

    if (gastosDelMes.length === 0) {
      return null;
    }

    const gastosVariables = filtrarGastosVariables(gastosDelMes);
    const gastosGustos = filtrarGastosGustos(gastosDelMes);
    const gastosImprevistos = filtrarImprevistos(gastosDelMes);

    const totalVariables = calcularTotal(gastosVariables);
    const totalImprevistos = calcularTotal(gastosImprevistos);

    // Por titular (solo gustos)
    const alejandraGustos = calcularTotal(filtrarPorTitular(gastosGustos, 'alejandra'));
    const ricardoGustos = calcularTotal(filtrarPorTitular(gastosGustos, 'ricardo'));
    const compartidoGustos = calcularTotal(filtrarPorTitular(gastosGustos, 'compartido'));

    // Verificar si cumplieron presupuestos
    const alejandraOk = alejandraGustos <= presupuestosPersonales.alejandra;
    const ricardoOk = ricardoGustos <= presupuestosPersonales.ricardo;
    const compartidoOk = compartidoGustos <= presupuestosPersonales.compartido;
    const variablesOk = totalVariables <= PRESUPUESTO_VARIABLE;
    const imprevistosOk = totalImprevistos <= PRESUPUESTO_IMPREVISTOS;

    // Pagos a deudas del mes anterior
    const pagosDelMes = pagos.filter(p => p.fecha.startsWith(previousMonth));
    const totalPagosDeuda = pagosDelMes.reduce((sum, p) => sum + p.monto, 0);

    // Top categorías
    const porCategoria: Record<string, number> = {};
    gastosVariables.forEach(g => {
      porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
    });
    const topCategorias = Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, total]) => ({
        categoria: cat,
        label: categoriaLabels[cat] || cat,
        total
      }));

    // Calcular "nota" del mes
    const criteriosCumplidos = [alejandraOk, ricardoOk, compartidoOk, variablesOk, imprevistosOk].filter(Boolean).length;
    let nota: 'excelente' | 'bien' | 'regular' | 'mal';
    if (criteriosCumplidos === 5) nota = 'excelente';
    else if (criteriosCumplidos >= 3) nota = 'bien';
    else if (criteriosCumplidos >= 1) nota = 'regular';
    else nota = 'mal';

    return {
      mes: previousMonth,
      mesFormateado: formatMonth(previousMonth),
      totalVariables,
      totalImprevistos,
      alejandra: { gastado: alejandraGustos, presupuesto: presupuestosPersonales.alejandra, ok: alejandraOk },
      ricardo: { gastado: ricardoGustos, presupuesto: presupuestosPersonales.ricardo, ok: ricardoOk },
      compartido: { gastado: compartidoGustos, presupuesto: presupuestosPersonales.compartido, ok: compartidoOk },
      variablesOk,
      imprevistosOk,
      totalPagosDeuda,
      topCategorias,
      nota,
      criteriosCumplidos,
      totalGastos: gastosDelMes.length,
    };
  }, [gastos, pagos]);

  if (loading || !summary) {
    return null;
  }

  const notaConfig = {
    excelente: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: Award, label: 'Excelente' },
    bien: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: CheckCircle2, label: 'Bien' },
    regular: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: AlertTriangle, label: 'Regular' },
    mal: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: AlertTriangle, label: 'Necesita mejorar' },
  };

  const config = notaConfig[summary.nota];
  const NotaIcon = config.icon;

  return (
    <div className="glass-card">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
            <Calendar className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Resumen de {summary.mesFormateado}</h3>
            <p className="text-xs text-white/50">
              {summary.criteriosCumplidos}/5 objetivos cumplidos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-lg ${config.bg} ${config.border} border flex items-center gap-2`}>
            <NotaIcon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )}
        </div>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="mt-6 space-y-4">
          {/* Resumen general */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/50">Total gastado</p>
              <p className="text-lg font-bold text-white">{formatMoney(summary.totalVariables)}</p>
              <p className={`text-xs ${summary.variablesOk ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.variablesOk ? '✓ Dentro del presupuesto' : `Excedido por ${formatMoney(summary.totalVariables - PRESUPUESTO_VARIABLE)}`}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/50">Imprevistos</p>
              <p className="text-lg font-bold text-white">{formatMoney(summary.totalImprevistos)}</p>
              <p className={`text-xs ${summary.imprevistosOk ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.imprevistosOk ? '✓ Bajo control' : `Excedido por ${formatMoney(summary.totalImprevistos - PRESUPUESTO_IMPREVISTOS)}`}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/50">Pagado a deudas</p>
              <p className="text-lg font-bold text-emerald-400">{formatMoney(summary.totalPagosDeuda)}</p>
              <p className="text-xs text-white/40">Abonos registrados</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-white/50">Transacciones</p>
              <p className="text-lg font-bold text-white">{summary.totalGastos}</p>
              <p className="text-xs text-white/40">gastos registrados</p>
            </div>
          </div>

          {/* Por titular */}
          <div>
            <h4 className="text-sm font-medium text-white/70 mb-3">Desempeño por persona</h4>
            <div className="space-y-2">
              {[
                { nombre: 'Alejandra', data: summary.alejandra },
                { nombre: 'Ricardo', data: summary.ricardo },
                { nombre: 'Compartido', data: summary.compartido },
              ].map(({ nombre, data }) => (
                <div key={nombre} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${data.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-white">{nombre}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${data.ok ? 'text-white' : 'text-red-400'}`}>
                      {formatMoney(data.gastado)}
                    </span>
                    <span className="text-xs text-white/40 ml-2">
                      / {formatMoney(data.presupuesto)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top categorías */}
          <div>
            <h4 className="text-sm font-medium text-white/70 mb-3">Donde más gastaron</h4>
            <div className="space-y-2">
              {summary.topCategorias.map((cat, idx) => (
                <div key={cat.categoria} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/50'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm text-white">{cat.label}</span>
                  </div>
                  <span className="text-sm font-medium text-white">{formatMoney(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mensaje motivacional */}
          <div className={`p-4 rounded-xl ${config.bg} border ${config.border}`}>
            <p className="text-sm text-center text-white/90">
              {summary.nota === 'excelente' && '¡Felicidades! Cumplieron todos sus objetivos. Sigan así.'}
              {summary.nota === 'bien' && 'Buen trabajo, cumplieron la mayoría de objetivos. Pueden mejorar un poco más.'}
              {summary.nota === 'regular' && 'Hay oportunidad de mejora. Revisen las categorías donde se excedieron.'}
              {summary.nota === 'mal' && 'Este mes fue difícil. Analicen qué pasó y ajusten el presupuesto si es necesario.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
