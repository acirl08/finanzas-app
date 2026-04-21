'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Trash2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Gasto, deleteGasto } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE, categoriaLabels, metodoPagoLabels } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { useGastosDelMes } from '@/hooks/useGastosFilters';
import { useMonth, formatMonth } from '@/contexts/MonthContext';
import { useFirestore } from '@/contexts/FirestoreContext';

type TitularFilter = 'todos' | 'alejandra' | 'ricardo' | 'compartido';

const FILTRO_LABELS: Record<TitularFilter, string> = {
  todos: 'Todos',
  alejandra: 'Ale',
  ricardo: 'Ricardo',
  compartido: 'Ambos',
};

function formatDate(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
}

function StatCard({ label, value, meta, tone = 'default' }: {
  label: string;
  value: string;
  meta: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="surface p-5">
      <p className="text-label">{label}</p>
      <p
        className={`mt-2 text-[26px] font-semibold font-numeric leading-tight ${
          tone === 'danger' ? 'text-clay-500' : 'text-ink-900'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px] text-ink-400">{meta}</p>
    </div>
  );
}

function GastoRow({ gasto, onDelete }: { gasto: Gasto; onDelete: (id: string) => void }) {
  const titularLabel = gasto.titular === 'alejandra' ? 'Ale' : gasto.titular === 'ricardo' ? 'Ricardo' : 'Ambos';

  return (
    <li className="group flex items-center justify-between gap-3 px-3 py-3 rounded-md hover:bg-subtle transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] text-ink-900 truncate">
          {gasto.descripcion || categoriaLabels[gasto.categoria] || gasto.categoria}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-ink-400">
          <span>{formatDate(gasto.fecha)}</span>
          <span>·</span>
          <span>{categoriaLabels[gasto.categoria] || gasto.categoria}</span>
          <span>·</span>
          <span>{titularLabel}</span>
          {gasto.metodoPago && (
            <>
              <span>·</span>
              <span className="truncate">{metodoPagoLabels[gasto.metodoPago] || gasto.metodoPago}</span>
            </>
          )}
        </div>
      </div>
      <p className="text-[15px] text-ink-900 font-medium tabular-nums">
        {formatMoney(gasto.monto)}
      </p>
      <button
        onClick={() => onDelete(gasto.id!)}
        aria-label="Eliminar gasto"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md text-ink-400 hover:text-clay-500 hover:bg-clay-50 transition-all"
      >
        <Trash2 className="w-4 h-4" strokeWidth={1.75} />
      </button>
    </li>
  );
}

export default function GastosPage() {
  const { selectedMonth } = useMonth();
  const { gastos, loadingGastos: loading } = useFirestore();
  const [filtro, setFiltro] = useState<TitularFilter>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const gastosData = useGastosDelMes(gastos, selectedMonth);
  const nombreMes = formatMonth(selectedMonth);

  const gastosFiltrados = gastosData.gastosVariables
    .filter((g) => filtro === 'todos' || g.titular === filtro)
    .filter((g) => g.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalMes = gastosData.totalVariables;
  const restante = gastosData.disponibleVariables;
  const gastosVariablesDelMes = gastosData.gastosVariables;

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await deleteGasto(id);
      toast.success('Gasto eliminado');
    } catch (e) {
      console.error(e);
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-display text-ink-900">Gastos</h1>
          <p className="text-ink-500 mt-1 text-[14px] capitalize">
            Movimientos variables de {nombreMes}
          </p>
        </div>
        <Link href="/registrar" className="btn btn-primary w-fit">
          <Plus className="w-4 h-4" strokeWidth={2} />
          Registrar gasto
        </Link>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total del mes"
          value={formatMoney(totalMes)}
          meta="gastos variables"
        />
        <StatCard
          label="Movimientos"
          value={gastosVariablesDelMes.length.toString()}
          meta={gastosVariablesDelMes.length === 1 ? 'registro' : 'registros'}
        />
        <StatCard
          label="Restante"
          value={formatMoney(restante)}
          meta={`de ${formatMoney(PRESUPUESTO_VARIABLE)}`}
          tone={restante < 0 ? 'danger' : 'default'}
        />
      </section>

      {/* Empty state */}
      {!loading && gastosVariablesDelMes.length === 0 ? (
        <div className="surface p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-5 h-5 text-ink-400" strokeWidth={1.75} />
          </div>
          <p className="text-[15px] text-ink-900">Sin gastos este mes</p>
          <p className="text-[13px] text-ink-400 mt-1 max-w-sm mx-auto">
            Cuando registres tus gastos variables aparecerán aquí.
          </p>
          <Link href="/registrar" className="btn btn-primary mt-5">
            <Plus className="w-4 h-4" strokeWidth={2} />
            Registrar primer gasto
          </Link>
        </div>
      ) : (
        <>
          {/* Search + filters */}
          <div className="surface p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Buscar por descripción…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field pl-9"
              />
            </div>
            <div className="flex gap-1 bg-subtle rounded-md p-1 overflow-x-auto">
              {(Object.keys(FILTRO_LABELS) as TitularFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-3 py-1.5 rounded-sm text-[13px] font-medium whitespace-nowrap transition-colors ${
                    filtro === f
                      ? 'bg-surface text-ink-900 shadow-card'
                      : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {FILTRO_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="surface py-2 px-2">
            <div className="px-3 py-2 flex items-baseline justify-between">
              <p className="text-label">Transacciones</p>
              <p className="text-[12px] text-ink-400 tabular-nums">
                {gastosFiltrados.length} {gastosFiltrados.length === 1 ? 'resultado' : 'resultados'}
              </p>
            </div>

            {loading ? (
              <ul className="space-y-1 px-1">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i} className="h-14 rounded-md bg-subtle animate-pulse" />
                ))}
              </ul>
            ) : gastosFiltrados.length > 0 ? (
              <ul className="divide-y divide-ink-100">
                {gastosFiltrados.map((g) => (
                  <GastoRow key={g.id} gasto={g} onDelete={handleDelete} />
                ))}
              </ul>
            ) : (
              <p className="px-3 py-8 text-center text-[14px] text-ink-400">
                Ningún gasto coincide con tu búsqueda.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
