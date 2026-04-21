'use client';

import { useState } from 'react';
import QuickAdd from '@/components/QuickAdd';
import GastoForm from '@/components/GastoForm';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { categoriaLabels } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { useGastosDelMes, useGastosPorCategoria } from '@/hooks/useGastosFilters';
import { useMonth } from '@/contexts/MonthContext';
import { useFirestore } from '@/contexts/FirestoreContext';

const TIPS = [
  'Registrar al momento del gasto te hace más consciente de tu dinero.',
  'Antes de comprar, espera 24 horas. Si lo quieres mañana, considéralo.',
  'Un café diario de $80 son $2,400 al mes. Lo pequeño se acumula.',
  'Pregúntate: ¿esto me acerca a mi libertad financiera?',
  'Cada peso que no gastas hoy es un peso para salir de deudas.',
  'Distingue necesidad y deseo antes de cada compra.',
];

export default function RegistrarPage() {
  const { selectedMonth } = useMonth();
  const { gastos, loadingGastos } = useFirestore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const gastosData = useGastosDelMes(gastos, selectedMonth);
  const categoriaData = useGastosPorCategoria(gastosData.gastosVariables);

  const totalVariables = gastosData.totalVariables;
  const restante = gastosData.disponibleVariables;
  const presupuestoDiario = gastosData.daysRemaining > 0
    ? Math.max(0, Math.floor(restante / gastosData.daysRemaining))
    : 0;

  const topCategorias = categoriaData.slice(0, 4);
  const tip = TIPS[new Date().getDate() % TIPS.length];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-display text-ink-900">Registrar gasto</h1>
          <p className="text-ink-500 mt-1 text-[14px]">Cada peso cuenta hacia tu libertad.</p>
        </div>
        <dl className="flex gap-8 text-left">
          <div>
            <dt className="text-label">Diario</dt>
            <dd className="mt-1 text-[22px] font-semibold text-ink-900 font-numeric">
              ${presupuestoDiario.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-label">Restante</dt>
            <dd className="mt-1 text-[22px] font-semibold text-ink-900 font-numeric">
              ${restante.toLocaleString()}
            </dd>
          </div>
        </dl>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          <QuickAdd defaultTitular="alejandra" />

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-center gap-2 py-3 text-[13px] text-ink-500 hover:text-ink-900 rounded-lg hover:bg-subtle transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? 'Ocultar' : 'Más opciones'} · fecha, descripción, tarjeta
          </button>

          {showAdvanced && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <GastoForm />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          {/* Tip del día */}
          <section className="surface p-5">
            <p className="text-label">Tip del día</p>
            <p className="mt-3 text-[14px] text-ink-700 leading-relaxed">{tip}</p>
          </section>

          {/* Top categorías */}
          <section className="surface p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-label">Top categorías</p>
              <p className="text-[11px] text-ink-400 tabular-nums">
                {formatMoney(totalVariables)}
              </p>
            </div>

            {loadingGastos ? (
              <p className="text-sm text-ink-400 mt-4">Cargando…</p>
            ) : topCategorias.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {topCategorias.map((c) => {
                  const pct = totalVariables > 0 ? (c.total / totalVariables) * 100 : 0;
                  return (
                    <li key={c.categoria}>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-ink-700">
                          {categoriaLabels[c.categoria] || c.categoria}
                        </span>
                        <span className="text-ink-900 font-medium tabular-nums">
                          {formatMoney(c.total)}
                        </span>
                      </div>
                      <div className="progress-track mt-1.5">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-400 mt-4">
                Aún no hay gastos este mes. Registra el primero.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
