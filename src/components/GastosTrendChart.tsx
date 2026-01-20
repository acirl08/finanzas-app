'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatMoney } from '@/lib/utils';
import TouchFriendlyChart from './TouchFriendlyChart';

interface MonthData {
  mes: string;
  mesLabel: string;
  variable: number;
  vales: number;
  fijo: number;
  total: number;
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function GastosTrendChart() {
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGastos = async () => {
      try {
        const res = await fetch('/api/finanzas');
        const data = await res.json();

        if (data.success && data.data.gastosMes) {
          // Generar datos para los últimos 6 meses
          const today = new Date();
          const monthsData: MonthData[] = [];

          for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const mesKey = date.toISOString().slice(0, 7);
            const mesLabel = MESES[date.getMonth()];

            // Filtrar gastos de ese mes (solo tenemos datos del mes actual en el API)
            // Para demo, el mes actual tiene datos reales, los demás son estimados
            const esActual = i === 0;

            if (esActual) {
              const gastosDelMes = data.data.gastosMes || [];
              const variable = gastosDelMes
                .filter((g: any) => !g.esFijo && !g.conVales)
                .reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
              const vales = gastosDelMes
                .filter((g: any) => g.conVales)
                .reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
              const fijo = gastosDelMes
                .filter((g: any) => g.esFijo)
                .reduce((sum: number, g: any) => sum + (g.monto || 0), 0);

              monthsData.push({
                mes: mesKey,
                mesLabel,
                variable,
                vales,
                fijo,
                total: variable + vales + fijo,
              });
            } else {
              // Datos placeholder para meses anteriores (0 si no hay datos)
              monthsData.push({
                mes: mesKey,
                mesLabel,
                variable: 0,
                vales: 0,
                fijo: 0,
                total: 0,
              });
            }
          }

          setMonthlyData(monthsData);
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
      return (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: p.fill }}>
              {p.name}: {formatMoney(p.value)}
            </p>
          ))}
          <p className="text-white/70 text-sm mt-1 pt-1 border-t border-white/10">
            Total: {formatMoney(total)}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasData = monthlyData.some(m => m.total > 0);

  return (
    <div className="glass-card">
      {!hasData ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Tendencia de Gastos</h3>
            <span className="text-sm text-white/50">Últimos 6 meses</span>
          </div>
          <div className="h-48 flex items-center justify-center text-white/50">
            Aún no hay suficientes datos para mostrar tendencias
          </div>
        </>
      ) : (
        <TouchFriendlyChart
          title="Tendencia de Gastos"
          description="Últimos 6 meses"
          data={monthlyData}
          dataKeyLabel="total"
          valueFormatter={formatMoney}
          height={250}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="mesLabel"
                tick={{ fill: '#ffffff70', fontSize: 12 }}
                axisLine={{ stroke: '#ffffff20' }}
              />
              <YAxis
                tick={{ fill: '#ffffff70', fontSize: 12 }}
                axisLine={{ stroke: '#ffffff20' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="variable" name="Variable" stackId="a" fill="#A855F7" radius={[0, 0, 0, 0]} />
              <Bar dataKey="vales" name="Vales" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="fijo" name="Fijo" stackId="a" fill="#6B7280" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </TouchFriendlyChart>
      )}

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span className="text-xs text-white/70">Variable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-xs text-white/70">Vales</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-500" />
          <span className="text-xs text-white/70">Fijo</span>
        </div>
      </div>
    </div>
  );
}
