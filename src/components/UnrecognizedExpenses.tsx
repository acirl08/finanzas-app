'use client';

import { useState, useEffect, useMemo } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle, Trash2, Calendar } from 'lucide-react';
import { subscribeToGastos, Gasto, updateGasto, deleteGasto } from '@/lib/firestore';
import { formatMoney } from '@/lib/utils';
import { categorias, categoriaLabels, metodoPagoLabels } from '@/lib/data';
import { useMonth, formatMonth } from '@/contexts/MonthContext';

export default function UnrecognizedExpenses() {
  const { selectedMonth } = useMonth();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategoria, setNewCategoria] = useState('');
  const [showAllMonths, setShowAllMonths] = useState(false);

  useEffect(() => {
    const unsub = subscribeToGastos(setGastos);
    return () => unsub();
  }, []);

  // Gastos no reconocidos del mes seleccionado
  const gastosNoReconocidosMes = useMemo(() => {
    return gastos.filter(g =>
      g.categoria === 'no_reconocido' &&
      g.fecha.startsWith(selectedMonth)
    );
  }, [gastos, selectedMonth]);

  // Gastos no reconocidos de TODOS los meses (para mostrar pendientes históricos)
  const gastosNoReconocidosTodos = useMemo(() => {
    return gastos.filter(g => g.categoria === 'no_reconocido');
  }, [gastos]);

  // Decidir cuáles mostrar
  const gastosNoReconocidos = showAllMonths ? gastosNoReconocidosTodos : gastosNoReconocidosMes;

  const totalNoReconocido = useMemo(() => {
    return gastosNoReconocidos.reduce((sum, g) => sum + g.monto, 0);
  }, [gastosNoReconocidos]);

  // Contar cuántos hay en otros meses
  const pendientesOtrosMeses = gastosNoReconocidosTodos.length - gastosNoReconocidosMes.length;

  const handleRecategorize = async (gastoId: string) => {
    if (!newCategoria || newCategoria === 'no_reconocido') return;

    try {
      await updateGasto(gastoId, { categoria: newCategoria });
      setEditingId(null);
      setNewCategoria('');
    } catch (error) {
      console.error('Error al recategorizar:', error);
    }
  };

  const handleDelete = async (gastoId: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;

    try {
      await deleteGasto(gastoId);
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  // Si no hay gastos no reconocidos en ningún mes, no mostrar
  if (gastosNoReconocidosTodos.length === 0) {
    return null;
  }

  return (
    <div className="glass-card border-amber-500/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Gastos No Reconocidos</h3>
            <p className="text-xs text-amber-400">
              {showAllMonths
                ? `${gastosNoReconocidos.length} pendientes en total`
                : `${gastosNoReconocidosMes.length} en ${formatMonth(selectedMonth)}`
              } • {formatMoney(totalNoReconocido)}
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

      {expanded && (
        <div className="space-y-3">
          {/* Toggle para ver todos los meses */}
          {pendientesOtrosMeses > 0 && (
            <button
              onClick={() => setShowAllMonths(!showAllMonths)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                showAllMonths
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {showAllMonths
                ? `Mostrando todos (${gastosNoReconocidosTodos.length})`
                : `Ver ${pendientesOtrosMeses} pendiente${pendientesOtrosMeses !== 1 ? 's' : ''} de otros meses`
              }
            </button>
          )}

          {/* Lista de gastos */}
          {gastosNoReconocidos.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-white/50 text-sm">Sin gastos no reconocidos en {formatMonth(selectedMonth)}</p>
              {pendientesOtrosMeses > 0 && (
                <p className="text-amber-400 text-xs mt-1">
                  Hay {pendientesOtrosMeses} pendiente{pendientesOtrosMeses !== 1 ? 's' : ''} de otros meses
                </p>
              )}
            </div>
          ) : (
            gastosNoReconocidos.map(gasto => (
              <div key={gasto.id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{gasto.descripcion}</span>
                      <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                        {metodoPagoLabels[gasto.metodoPago || ''] || gasto.metodoPago || 'N/A'}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      {new Date(gasto.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} • {gasto.titular}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{formatMoney(gasto.monto)}</p>
                  </div>
                </div>

                {/* Actions */}
                {editingId === gasto.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={newCategoria}
                      onChange={(e) => setNewCategoria(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                    >
                      <option value="" className="bg-gray-800">Seleccionar categoría...</option>
                      {categorias.filter(c => c !== 'no_reconocido').map(cat => (
                        <option key={cat} value={cat} className="bg-gray-800">
                          {categoriaLabels[cat] || cat}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRecategorize(gasto.id!)}
                      disabled={!newCategoria}
                      className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setNewCategoria(''); }}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(gasto.id!)}
                      className="flex-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-medium transition-colors"
                    >
                      Editar / Identificar
                    </button>
                    <button
                      onClick={() => handleDelete(gasto.id!)}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Info explicativa */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-300">
              <strong>Tip:</strong> Estos gastos vienen de estados de cuenta y necesitan que identifiques a qué categoría pertenecen.
              Si no reconoces el cargo, revisa tu estado de cuenta o elimínalo si es un error.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
