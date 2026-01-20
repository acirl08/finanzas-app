'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Utensils, Car, Heart, Sparkles, Package, AlertTriangle, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { safeGetJSON, safeSetJSON } from '@/lib/storage';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

// Categorías simplificadas con presupuestos default sugeridos
const DEFAULT_CATEGORY_BUDGETS = {
  'super': { label: 'Súper', icon: ShoppingCart, color: 'blue', budget: 0, isVales: true }, // Vales, no cuenta
  'restaurantes': { label: 'Comida fuera', icon: Utensils, color: 'orange', budget: 3000, isVales: false },
  'transporte': { label: 'Transporte', icon: Car, color: 'emerald', budget: 2000, isVales: false },
  'salud': { label: 'Salud', icon: Heart, color: 'red', budget: 1500, isVales: false },
  'entretenimiento': { label: 'Diversión', icon: Sparkles, color: 'purple', budget: 2500, isVales: false },
  'otros': { label: 'Otros', icon: Package, color: 'gray', budget: 6000, isVales: false },
};

// Mapear categorías del sistema a las simplificadas
const CATEGORY_MAPPING: Record<string, string> = {
  'super': 'super',
  'frutas_verduras': 'super',
  'restaurantes': 'restaurantes',
  'cafe_snacks': 'restaurantes',
  'transporte': 'transporte',
  'gasolina': 'transporte',
  'salud': 'salud',
  'entretenimiento': 'entretenimiento',
  'ropa': 'entretenimiento',
  'personal': 'entretenimiento',
  'hogar': 'otros',
  'imprevistos': 'otros',
  'otros_gustos': 'otros',
};

interface CategoryBudget {
  budget: number;
}

export default function CategoryBudgets() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [budgets, setBudgets] = useState<Record<string, CategoryBudget>>({});
  const [shownAlerts, setShownAlerts] = useState<Set<string>>(new Set());

  // Cargar presupuestos guardados
  useEffect(() => {
    const saved = safeGetJSON<Record<string, CategoryBudget>>('category-budgets', {});
    const initial: Record<string, CategoryBudget> = {};
    Object.entries(DEFAULT_CATEGORY_BUDGETS).forEach(([key, val]) => {
      initial[key] = { budget: saved[key]?.budget ?? val.budget };
    });
    setBudgets(initial);
  }, []);

  // Guardar cuando cambian
  const saveBudgets = (newBudgets: Record<string, CategoryBudget>) => {
    setBudgets(newBudgets);
    safeSetJSON('category-budgets', newBudgets);
  };

  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const categoryData = useMemo(() => {
    const today = new Date();
    const mesActual = today.toISOString().slice(0, 7);

    // Filtrar gastos del mes (no fijos)
    const gastosDelMes = gastos.filter(g =>
      g.fecha.startsWith(mesActual) && !g.esFijo
    );

    // Agrupar por categoría simplificada
    const porCategoria: Record<string, { total: number; count: number; gastos: Gasto[] }> = {};

    Object.keys(DEFAULT_CATEGORY_BUDGETS).forEach(key => {
      porCategoria[key] = { total: 0, count: 0, gastos: [] };
    });

    gastosDelMes.forEach(g => {
      const catSimple = CATEGORY_MAPPING[g.categoria] || 'otros';
      if (porCategoria[catSimple]) {
        porCategoria[catSimple].total += g.monto;
        porCategoria[catSimple].count += 1;
        porCategoria[catSimple].gastos.push(g);
      }
    });

    // Calcular estado de cada categoría
    return Object.entries(DEFAULT_CATEGORY_BUDGETS).map(([key, config]) => {
      const spent = porCategoria[key]?.total || 0;
      const budget = budgets[key]?.budget ?? config.budget;
      const percentage = budget > 0 ? (spent / budget) * 100 : 0;

      let status: 'safe' | 'warning' | 'danger' | 'over' = 'safe';
      if (percentage >= 100) status = 'over';
      else if (percentage >= 80) status = 'danger';
      else if (percentage >= 50) status = 'warning';

      return {
        key,
        ...config,
        budget,
        spent,
        percentage,
        status,
        remaining: Math.max(0, budget - spent),
        count: porCategoria[key]?.count || 0,
      };
    }).filter(c => !c.isVales); // Excluir vales del tracking

  }, [gastos, budgets]);

  // Mostrar alertas cuando se pasan del 80% o 100%
  useEffect(() => {
    categoryData.forEach(cat => {
      const alertKey80 = `${cat.key}-80`;
      const alertKey100 = `${cat.key}-100`;

      if (cat.percentage >= 100 && !shownAlerts.has(alertKey100)) {
        toast.error(`Te pasaste en ${cat.label}`, {
          description: `Gastaste ${formatMoney(cat.spent)} de ${formatMoney(cat.budget)}`,
        });
        setShownAlerts(prev => new Set([...prev, alertKey100]));
      } else if (cat.percentage >= 80 && cat.percentage < 100 && !shownAlerts.has(alertKey80)) {
        toast.warning(`Cuidado con ${cat.label}`, {
          description: `Ya llevas ${cat.percentage.toFixed(0)}% del presupuesto`,
        });
        setShownAlerts(prev => new Set([...prev, alertKey80]));
      }
    });
  }, [categoryData, shownAlerts]);

  const colorMap: Record<string, { bg: string; bar: string; text: string }> = {
    blue: { bg: 'bg-blue-500/20', bar: 'bg-blue-500', text: 'text-blue-400' },
    orange: { bg: 'bg-orange-500/20', bar: 'bg-orange-500', text: 'text-orange-400' },
    emerald: { bg: 'bg-emerald-500/20', bar: 'bg-emerald-500', text: 'text-emerald-400' },
    red: { bg: 'bg-red-500/20', bar: 'bg-red-500', text: 'text-red-400' },
    purple: { bg: 'bg-purple-500/20', bar: 'bg-purple-500', text: 'text-purple-400' },
    gray: { bg: 'bg-gray-500/20', bar: 'bg-gray-500', text: 'text-gray-400' },
  };

  if (loading) {
    return <div className="glass-card animate-pulse h-64" />;
  }

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Límites por Categoría</h3>
            <p className="text-xs text-white/50">
              {categoryData.filter(c => c.status === 'over').length > 0
                ? `${categoryData.filter(c => c.status === 'over').length} categoría(s) excedida(s)`
                : 'Todo bajo control'
              }
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`p-2 rounded-lg transition-colors ${editMode ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/10 text-white/50'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3">
          {categoryData.map((cat) => {
            const Icon = cat.icon;
            const colors = colorMap[cat.color];

            return (
              <div
                key={cat.key}
                className={`p-3 rounded-xl border transition-all ${
                  cat.status === 'over'
                    ? 'bg-red-500/10 border-red-500/30'
                    : cat.status === 'danger'
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{cat.label}</p>
                      <p className="text-xs text-white/40">{cat.count} gastos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {editMode ? (
                      <div className="flex items-center gap-1">
                        <span className="text-white/40 text-xs">$</span>
                        <input
                          type="number"
                          value={budgets[cat.key]?.budget || 0}
                          onChange={(e) => {
                            const newBudgets = { ...budgets, [cat.key]: { budget: Number(e.target.value) } };
                            saveBudgets(newBudgets);
                          }}
                          className="w-20 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    ) : (
                      <>
                        <p className={`text-sm font-semibold ${cat.status === 'over' ? 'text-red-400' : 'text-white'}`}>
                          {formatMoney(cat.spent)}
                        </p>
                        <p className="text-xs text-white/40">de {formatMoney(cat.budget)}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cat.status === 'over' ? 'bg-red-500' :
                      cat.status === 'danger' ? 'bg-orange-500' :
                      cat.status === 'warning' ? 'bg-yellow-500' :
                      colors.bar
                    }`}
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>

                {/* Status message */}
                {cat.status !== 'safe' && (
                  <p className={`text-xs mt-2 ${
                    cat.status === 'over' ? 'text-red-400' :
                    cat.status === 'danger' ? 'text-orange-400' :
                    'text-yellow-400'
                  }`}>
                    {cat.status === 'over' && `Te pasaste por ${formatMoney(cat.spent - cat.budget)}`}
                    {cat.status === 'danger' && `Solo te quedan ${formatMoney(cat.remaining)}`}
                    {cat.status === 'warning' && `Ya llevas la mitad del presupuesto`}
                  </p>
                )}
              </div>
            );
          })}

          {/* Edit mode tip */}
          {editMode && (
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <p className="text-xs text-purple-300 text-center">
                Ajusta los límites según tus prioridades. Total sugerido: $15,000/mes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
