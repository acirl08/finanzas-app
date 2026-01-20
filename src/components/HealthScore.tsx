'use client';

import { useState, useEffect } from 'react';
import { Heart, TrendingUp, TrendingDown, PiggyBank, CreditCard, Wallet } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

interface HealthScoreData {
  score: number;
  nivel: string;
  factores: { nombre: string; valor: number; peso: number }[];
  deudaTotal: number;
  ingresoMensual: number;
  gastosMes: number;
  ratioDeudaIngreso: string;
}

export default function HealthScore() {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'obtener_health_score', params: {} })
        });
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (e) {
        console.error('Error fetching health score:', e);
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
          <div className="h-6 bg-white/10 rounded w-32" />
        </div>
        <div className="h-32 bg-white/10 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  // Color del score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-blue-500 to-cyan-500';
    if (score >= 40) return 'from-yellow-500 to-orange-500';
    if (score >= 20) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-rose-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    if (score >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  // Calcular el círculo del score
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (data.score / 100) * circumference;

  return (
    <div className="glass-card">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getScoreColor(data.score)} flex items-center justify-center`}>
          <Heart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Salud Financiera</h3>
          <p className="text-sm text-white/50">Tu puntuación general</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Score circular */}
        <div className="relative">
          <svg className="w-28 h-28 -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-white/10"
            />
            <circle
              cx="56"
              cy="56"
              r="45"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={data.score >= 60 ? 'text-green-500' : 'text-orange-500'} stopColor="currentColor" />
                <stop offset="100%" className={data.score >= 60 ? 'text-emerald-500' : 'text-red-500'} stopColor="currentColor" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${getScoreTextColor(data.score)}`}>
              {data.score}
            </span>
            <span className="text-xs text-white/50">{data.nivel}</span>
          </div>
        </div>

        {/* Factores */}
        <div className="flex-1 space-y-3">
          {data.factores.map((factor, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-white/70">{factor.nombre}</span>
                <span className={getScoreTextColor(factor.valor)}>{factor.valor}/100</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreColor(factor.valor)} transition-all duration-500`}
                  style={{ width: `${factor.valor}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CreditCard className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-lg font-semibold text-white">{formatMoney(data.deudaTotal)}</p>
          <p className="text-xs text-white/50">Deuda total</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Wallet className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-lg font-semibold text-white">{formatMoney(data.gastosMes)}</p>
          <p className="text-xs text-white/50">Gastos mes</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-lg font-semibold text-white">{data.ratioDeudaIngreso}%</p>
          <p className="text-xs text-white/50">Deuda/Ingreso</p>
        </div>
      </div>
    </div>
  );
}
