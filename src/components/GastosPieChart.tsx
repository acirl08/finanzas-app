'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { categoriaLabels } from '@/lib/data';

interface GastoData {
  categoria: string;
  name: string;
  monto: number;
  tipo: 'vales' | 'variable' | 'fijo';
}

const COLORS_BY_TYPE = {
  vales: ['#3B82F6', '#60A5FA', '#93C5FD'], // Azules
  variable: ['#A855F7', '#C084FC', '#D8B4FE', '#E9D5FF'], // Morados/Rosas
  fijo: ['#6B7280', '#9CA3AF', '#D1D5DB'], // Grises
};

const ALL_COLORS = [
  '#A855F7', '#EC4899', '#F43F5E', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#3B82F6',
  '#6366F1', '#8B5CF6'
];

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function GastosPieChart() {
  const [gastosPorCategoria, setGastosPorCategoria] = useState<GastoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalGastado, setTotalGastado] = useState(0);

  useEffect(() => {
    const fetchGastos = async () => {
      try {
        const res = await fetch('/api/finanzas');
        const data = await res.json();

        if (data.success && data.data.gastosMes) {
          // Agrupar por categoría
          const grouped: Record<string, { monto: number; tipo: 'vales' | 'variable' | 'fijo' }> = {};

          data.data.gastosMes.forEach((g: any) => {
            const cat = g.categoria || 'otros';
            const tipo = g.esFijo ? 'fijo' : (g.conVales ? 'vales' : 'variable');

            if (!grouped[cat]) {
              grouped[cat] = { monto: 0, tipo };
            }
            grouped[cat].monto += g.monto || 0;
          });

          const chartData = Object.entries(grouped)
            .map(([categoria, data]) => ({
              categoria,
              name: categoriaLabels[categoria] || categoria,
              monto: data.monto,
              tipo: data.tipo,
            }))
            .sort((a, b) => b.monto - a.monto);

          setGastosPorCategoria(chartData);
          setTotalGastado(chartData.reduce((sum, g) => sum + g.monto, 0));
        }
      } catch (e) {
        console.error('Error fetching gastos:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchGastos();
  }, []);

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-64 bg-[#252931] rounded-xl" />
      </div>
    );
  }

  if (gastosPorCategoria.length === 0) {
    return (
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4">Gastos por Categoría</h3>
        <div className="h-48 flex items-center justify-center text-white/50">
          No hay gastos registrados este mes
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-purple-400">{formatMoney(data.monto)}</p>
          <p className="text-white/50 text-xs">
            {((data.monto / totalGastado) * 100).toFixed(1)}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Gastos por Categoría</h3>
        <span className="text-sm text-white/50">Este mes</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gastosPorCategoria}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="monto"
              nameKey="name"
            >
              {gastosPorCategoria.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={ALL_COLORS[index % ALL_COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {gastosPorCategoria.slice(0, 6).map((item, index) => (
          <div key={item.categoria} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: ALL_COLORS[index % ALL_COLORS.length] }}
            />
            <span className="text-xs text-white/70 truncate">{item.name}</span>
            <span className="text-xs text-white/50 ml-auto">{formatMoney(item.monto)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
        <span className="text-white/70">Total gastado</span>
        <span className="text-white font-semibold">{formatMoney(totalGastado)}</span>
      </div>
    </div>
  );
}
