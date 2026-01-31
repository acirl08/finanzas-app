'use client';

import { useState, useEffect, useMemo } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle, Trash2 } from 'lucide-react';
import { subscribeToGastos, Gasto, updateGasto, deleteGasto } from '@/lib/firestore';
import { formatMoney } from '@/lib/utils';
import { categorias, categoriaLabels, metodoPagoLabels } from '@/lib/data';

export default function UnrecognizedExpenses() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategoria, setNewCategoria] = useState('');

  useEffect(() => {
    const unsub = subscribeToGastos(setGastos);
    return () => unsub();
  }, []);

  const gastosNoReconocidos = useMemo(() => {
    return gastos.filter(g => g.categoria === 'no_reconocido');
  }, [gastos]);

  const totalNoReconocido = useMemo(() => {
    return gastosNoReconocidos.reduce((sum, g) => sum + g.monto, 0);
  }, [gastosNoReconocidos]);

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

  if (gastosNoReconocidos.length === 0) {
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
              {gastosNoReconocidos.length} gasto{gastosNoReconocidos.length !== 1 ? 's' : ''} por identificar • {formatMoney(totalNoReconocido)}
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
        <div className="space-y-2">
          {gastosNoReconocidos.map(gasto => (
            <div key={gasto.id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{gasto.descripcion}</span>
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                      {metodoPagoLabels[gasto.metodoPago || ''] || gasto.metodoPago || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    {gasto.fecha} • {gasto.titular}
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
                    Identificar categoría
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
          ))}
        </div>
      )}
    </div>
  );
}
