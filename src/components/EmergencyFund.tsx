'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, AlertTriangle, TrendingDown, History, Settings2, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { subscribeToGastos, Gasto, addGasto } from '@/lib/firestore';
import { PRESUPUESTO_IMPREVISTOS, categoriaLabels } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { filtrarImprevistos, calcularTotal } from '@/hooks/useGastosFilters';
import { toast } from 'sonner';

interface EmergencyFundProps {
  compact?: boolean;
  className?: string;
}

export default function EmergencyFund({ compact = false, className = '' }: EmergencyFundProps) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGasto, setNewGasto] = useState({ monto: '', descripcion: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToGastos((g) => {
      setGastos(g);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const { gastosImprevistos, totalUsado, disponible, porcentaje, status } = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesActual));
    const imprevistos = filtrarImprevistos(gastosDelMes);
    const total = calcularTotal(imprevistos);
    const disp = PRESUPUESTO_IMPREVISTOS - total;
    const pct = (total / PRESUPUESTO_IMPREVISTOS) * 100;

    let stat: 'healthy' | 'warning' | 'danger' = 'healthy';
    if (pct >= 100) stat = 'danger';
    else if (pct >= 70) stat = 'warning';

    return {
      gastosImprevistos: imprevistos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
      totalUsado: total,
      disponible: disp,
      porcentaje: pct,
      status: stat,
    };
  }, [gastos]);

  const statusConfig = {
    healthy: {
      bg: 'from-emerald-500/20 to-green-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      label: 'Fondo disponible',
    },
    warning: {
      bg: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      label: 'Fondo bajo',
    },
    danger: {
      bg: 'from-red-500/20 to-pink-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      label: 'Fondo agotado',
    },
  };

  const config = statusConfig[status];

  const handleAddGasto = async () => {
    const monto = Number(newGasto.monto);
    if (!monto || monto <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setIsSubmitting(true);
    try {
      await addGasto({
        fecha: new Date().toISOString().split('T')[0],
        monto,
        categoria: 'imprevistos',
        descripcion: newGasto.descripcion || 'Gasto imprevisto',
        titular: 'compartido',
        conVales: false,
        esFijo: false,
      });

      toast.success('Gasto imprevisto registrado', {
        description: `${formatMoney(monto)} deducido del fondo`,
      });

      setNewGasto({ monto: '', descripcion: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding imprevisto:', error);
      toast.error('Error al registrar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className={`glass-card animate-pulse h-32 ${className}`} />;
  }

  // Compact version for dashboard
  if (compact) {
    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-br ${config.bg} border ${config.border} ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${config.text}`} />
            <span className="text-sm font-medium text-white">Imprevistos</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        </div>
        <p className={`text-2xl font-bold ${config.text}`}>
          {formatMoney(disponible)}
        </p>
        <div className="h-1.5 bg-black/20 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              status === 'healthy' ? 'bg-emerald-500' :
              status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(porcentaje, 100)}%` }}
          />
        </div>
        <p className="text-xs text-white/50 mt-1">
          {formatMoney(totalUsado)} de {formatMoney(PRESUPUESTO_IMPREVISTOS)} usado
        </p>
      </div>
    );
  }

  // Full version
  return (
    <div className={`glass-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.bg} flex items-center justify-center`}>
            <Shield className={`w-5 h-5 ${config.text}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Fondo de Imprevistos</h3>
            <p className="text-xs text-white/50">{config.label}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`p-2 rounded-lg transition-colors ${
            showAddForm ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-white/5 rounded-xl animate-in slide-in-from-top-2 duration-200">
          <h4 className="text-sm font-medium text-white mb-3">Registrar gasto imprevisto</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                <input
                  type="number"
                  value={newGasto.monto}
                  onChange={(e) => setNewGasto({ ...newGasto, monto: e.target.value })}
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Descripcion (opcional)</label>
              <input
                type="text"
                value={newGasto.descripcion}
                onChange={(e) => setNewGasto({ ...newGasto, descripcion: e.target.value })}
                placeholder="Ej: Reparación carro"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <button
              onClick={handleAddGasto}
              disabled={isSubmitting}
              className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Registrar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Display */}
      <div className={`p-4 rounded-xl bg-gradient-to-br ${config.bg} border ${config.border} mb-4`}>
        <div className="text-center">
          <p className="text-white/60 text-sm mb-1">Disponible este mes</p>
          <p className={`text-4xl font-black ${disponible >= 0 ? config.text : 'text-red-400'}`}>
            {formatMoney(Math.max(0, disponible))}
          </p>
          {disponible < 0 && (
            <p className="text-red-400 text-sm mt-1">
              Excedido por {formatMoney(Math.abs(disponible))}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status === 'healthy' ? 'bg-emerald-500' :
                status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/50">
            <span>Usado: {formatMoney(totalUsado)}</span>
            <span>Presupuesto: {formatMoney(PRESUPUESTO_IMPREVISTOS)}</span>
          </div>
        </div>
      </div>

      {/* History Toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-white/40" />
          <span className="text-sm text-white/60">Historial del mes</span>
          <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/50">
            {gastosImprevistos.length}
          </span>
        </div>
        {showHistory ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      {/* History List */}
      {showHistory && (
        <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {gastosImprevistos.length === 0 ? (
            <div className="text-center py-6">
              <Shield className="w-10 h-10 text-emerald-400/30 mx-auto mb-2" />
              <p className="text-white/50 text-sm">Sin gastos imprevistos este mes</p>
              <p className="text-white/30 text-xs mt-1">Esperemos que siga así</p>
            </div>
          ) : (
            gastosImprevistos.map((gasto, idx) => (
              <div
                key={gasto.id || idx}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
              >
                <div>
                  <p className="text-sm text-white">{gasto.descripcion || 'Imprevisto'}</p>
                  <p className="text-xs text-white/40">
                    {new Date(gasto.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className="text-sm font-medium text-red-400">
                  -{formatMoney(gasto.monto)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-300">
            Este fondo es para emergencias reales: reparaciones, médico, etc.
            No lo uses para gastos normales.
          </p>
        </div>
      </div>
    </div>
  );
}
