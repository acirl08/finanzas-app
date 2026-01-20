'use client';

import { useState } from 'react';
import { Calculator, TrendingDown, Calendar, DollarSign, Sparkles } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

interface SimulationResult {
  montoExtra: number;
  pagoMensualActual: number;
  pagoMensualNuevo: number;
  mesesSinExtra: number;
  mesesConExtra: number;
  mesesAhorrados: number;
  interesAhorrado: number;
  fechaLibertadSinExtra: string;
  fechaLibertadConExtra: string;
}

export default function DebtSimulator() {
  const [montoExtra, setMontoExtra] = useState<string>('5000');
  const [resultado, setResultado] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const simular = async () => {
    if (!montoExtra || parseInt(montoExtra) <= 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/finanzas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simular_pago_extra',
          params: { montoExtra: parseInt(montoExtra) }
        })
      });

      const data = await res.json();
      if (data.success) {
        setResultado(data.data);
      }
    } catch (e) {
      console.error('Error en simulación:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    const [year, month] = fecha.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="glass-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Simulador de Pagos Extra</h3>
          <p className="text-sm text-white/50">¿Qué pasa si pagas más cada mes?</p>
        </div>
      </div>

      {/* Input */}
      <div className="mb-6">
        <label className="block text-sm text-white/70 mb-2">Monto extra mensual</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
            <input
              type="number"
              value={montoExtra}
              onChange={(e) => setMontoExtra(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-8 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
              placeholder="5000"
            />
          </div>
          <button
            onClick={simular}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Calculando...' : 'Simular'}
          </button>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 mt-3">
          {['2000', '5000', '10000', '15000'].map((amount) => (
            <button
              key={amount}
              onClick={() => setMontoExtra(amount)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                montoExtra === amount
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              ${parseInt(amount).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {resultado && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sin extra */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-white/50 mb-1">Sin pago extra</p>
              <p className="text-lg font-semibold text-white/70">{formatFecha(resultado.fechaLibertadSinExtra)}</p>
              <p className="text-xs text-white/40 mt-1">{resultado.mesesSinExtra} meses</p>
            </div>

            {/* Con extra */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-xl p-4 border border-emerald-500/30">
              <p className="text-xs text-emerald-400 mb-1">Con ${parseInt(montoExtra).toLocaleString()} extra</p>
              <p className="text-lg font-semibold text-white">{formatFecha(resultado.fechaLibertadConExtra)}</p>
              <p className="text-xs text-emerald-400/70 mt-1">{resultado.mesesConExtra} meses</p>
            </div>
          </div>

          {/* Savings */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-white/70">Ahorrarías</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{resultado.mesesAhorrados}</span>
                  <span className="text-white/50">meses</span>
                  <span className="text-purple-400 font-medium">
                    ~{formatMoney(resultado.interesAhorrado)} en intereses
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment comparison */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-white/50">
              Pago actual: <span className="text-white">{formatMoney(resultado.pagoMensualActual)}/mes</span>
            </div>
            <div className="text-emerald-400">
              Nuevo pago: <span className="font-medium">{formatMoney(resultado.pagoMensualNuevo)}/mes</span>
            </div>
          </div>
        </div>
      )}

      {/* Tip */}
      {!resultado && (
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-sm text-white/50">
            Ingresa un monto extra para ver cómo impacta tu fecha de libertad financiera
          </p>
        </div>
      )}
    </div>
  );
}
