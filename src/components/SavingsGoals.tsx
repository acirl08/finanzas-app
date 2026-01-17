'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Sparkles, PiggyBank } from 'lucide-react';

interface SavingsGoal {
  id: string;
  nombre: string;
  montoObjetivo: number;
  montoActual: number;
  fechaCreacion: string;
  fechaMeta?: string;
  color: string;
}

const COLORS = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-red-500',
];

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function SavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ nombre: '', montoObjetivo: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Cargar metas del localStorage
    const saved = localStorage.getItem('savings-goals');
    if (saved) {
      setGoals(JSON.parse(saved));
    }
  }, []);

  const saveGoals = (newGoals: SavingsGoal[]) => {
    setGoals(newGoals);
    localStorage.setItem('savings-goals', JSON.stringify(newGoals));
  };

  const addGoal = () => {
    if (!newGoal.nombre || !newGoal.montoObjetivo) return;

    const goal: SavingsGoal = {
      id: Date.now().toString(),
      nombre: newGoal.nombre,
      montoObjetivo: parseInt(newGoal.montoObjetivo),
      montoActual: 0,
      fechaCreacion: new Date().toISOString().split('T')[0],
      color: COLORS[goals.length % COLORS.length],
    };

    saveGoals([...goals, goal]);
    setNewGoal({ nombre: '', montoObjetivo: '' });
    setShowForm(false);
  };

  const updateGoalAmount = (id: string, delta: number) => {
    const updated = goals.map(g => {
      if (g.id === id) {
        const newAmount = Math.max(0, Math.min(g.montoActual + delta, g.montoObjetivo));
        return { ...g, montoActual: newAmount };
      }
      return g;
    });
    saveGoals(updated);
  };

  const deleteGoal = (id: string) => {
    saveGoals(goals.filter(g => g.id !== id));
  };

  if (!mounted) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-48 bg-[#252931] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Metas de Ahorro</h3>
            <p className="text-xs text-white/50">
              {goals.length} meta(s) activa(s)
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Formulario para nueva meta */}
      {showForm && (
        <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
          <input
            type="text"
            placeholder="Nombre de la meta"
            value={newGoal.nombre}
            onChange={(e) => setNewGoal({ ...newGoal, nombre: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
              <input
                type="number"
                placeholder="Monto objetivo"
                value={newGoal.montoObjetivo}
                onChange={(e) => setNewGoal({ ...newGoal, montoObjetivo: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-8 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <button
              onClick={addGoal}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white font-medium hover:opacity-90"
            >
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Lista de metas */}
      {goals.length === 0 ? (
        <div className="text-center py-8">
          <PiggyBank className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">No tienes metas de ahorro</p>
          <p className="text-white/30 text-sm mt-1">
            Crea tu primera meta para empezar a ahorrar
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = (goal.montoActual / goal.montoObjetivo) * 100;
            const isComplete = progress >= 100;

            return (
              <div
                key={goal.id}
                className={`p-4 rounded-xl border transition-all ${
                  isComplete
                    ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">{goal.nombre}</h4>
                      {isComplete && (
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                      {formatMoney(goal.montoActual)} de {formatMoney(goal.montoObjetivo)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white/40 hover:text-red-400" />
                  </button>
                </div>

                {/* Barra de progreso */}
                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${goal.color} transition-all duration-500`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>

                {/* Controles para agregar/quitar dinero */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isComplete ? 'text-emerald-400' : 'text-white/70'
                  }`}>
                    {progress.toFixed(0)}% completado
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateGoalAmount(goal.id, -1000)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 transition-colors"
                    >
                      -$1k
                    </button>
                    <button
                      onClick={() => updateGoalAmount(goal.id, 1000)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 transition-colors"
                    >
                      +$1k
                    </button>
                    <button
                      onClick={() => updateGoalAmount(goal.id, 5000)}
                      className="px-3 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 rounded-lg text-sm text-amber-400 transition-colors"
                    >
                      +$5k
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Total ahorrado */}
      {goals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
          <span className="text-white/70">Total ahorrado</span>
          <span className="text-amber-400 font-semibold">
            {formatMoney(goals.reduce((sum, g) => sum + g.montoActual, 0))}
          </span>
        </div>
      )}
    </div>
  );
}
