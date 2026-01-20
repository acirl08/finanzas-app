'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Calendar, Wallet, CreditCard } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

interface ForecastData {
  promedioGastoMensual: number;
  ingresoMensual: number;
  forecast: {
    mes: string;
    mesLabel: string;
    gastoProyectado: number;
    ingresoProyectado: number;
    ahorroProyectado: number;
  }[];
  proyeccionDeuda: {
    mes: string;
    saldoDeuda: number;
    interesesMes: number;
  }[];
}

export default function CashflowForecast() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'cashflow' | 'deuda'>('cashflow');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'obtener_forecast', params: {} })
        });
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (e) {
        console.error('Error fetching forecast:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="h-6 bg-white/10 rounded w-40" />
        </div>
        <div className="h-64 bg-white/10 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (view === 'cashflow') {
        return (
          <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-white font-medium mb-2">{label}</p>
            <p className="text-green-400 text-sm">
              Ingreso: {formatMoney(payload[0]?.payload?.ingresoProyectado || 0)}
            </p>
            <p className="text-purple-400 text-sm">
              Gasto: {formatMoney(payload[0]?.payload?.gastoProyectado || 0)}
            </p>
            <p className="text-blue-400 text-sm font-medium">
              Ahorro: {formatMoney(payload[0]?.payload?.ahorroProyectado || 0)}
            </p>
          </div>
        );
      } else {
        return (
          <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-white font-medium mb-2">{label}</p>
            <p className="text-red-400 text-sm">
              Saldo: {formatMoney(payload[0]?.value || 0)}
            </p>
            <p className="text-orange-400 text-sm">
              Intereses mes: {formatMoney(payload[0]?.payload?.interesesMes || 0)}
            </p>
          </div>
        );
      }
    }
    return null;
  };

  // Preparar datos para el gráfico de deuda
  const deudaChartData = data.proyeccionDeuda.map(p => ({
    ...p,
    mesLabel: new Date(p.mes + '-01').toLocaleDateString('es-MX', { month: 'short' })
  }));

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Proyección 6 Meses</h3>
            <p className="text-sm text-white/50">Basado en tu historial</p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setView('cashflow')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'cashflow'
                ? 'bg-purple-500 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Cashflow
          </button>
          <button
            onClick={() => setView('deuda')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'deuda'
                ? 'bg-purple-500 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Deuda
          </button>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'cashflow' ? (
            <AreaChart data={data.forecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ahorroGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="mesLabel"
                tick={{ fill: '#ffffff70', fontSize: 12 }}
                axisLine={{ stroke: '#ffffff20' }}
              />
              <YAxis
                tick={{ fill: '#ffffff70', fontSize: 12 }}
                axisLine={{ stroke: '#ffffff20' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#ffffff30" />
              <Area
                type="monotone"
                dataKey="ahorroProyectado"
                stroke="#8B5CF6"
                fill="url(#ahorroGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <AreaChart data={deudaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="deudaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="mesLabel"
                tick={{ fill: '#ffffff70', fontSize: 12 }}
                axisLine={{ stroke: '#ffffff20' }}
              />
              <YAxis
                tick={{ fill: '#ffffff70', fontSize: 12 }}
                axisLine={{ stroke: '#ffffff20' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="saldoDeuda"
                stroke="#EF4444"
                fill="url(#deudaGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Wallet className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-lg font-semibold text-white">{formatMoney(data.ingresoMensual)}</p>
          <p className="text-xs text-white/50">Ingreso mensual</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-lg font-semibold text-white">{formatMoney(data.promedioGastoMensual)}</p>
          <p className="text-xs text-white/50">Gasto promedio</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-lg font-semibold text-white">
            {formatMoney(data.ingresoMensual - data.promedioGastoMensual - 35000)}
          </p>
          <p className="text-xs text-white/50">Ahorro potencial</p>
        </div>
      </div>
    </div>
  );
}
