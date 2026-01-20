'use client';

import { useState, useEffect } from 'react';
import { Receipt, Filter, Calendar, TrendingDown, Search, Plus, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import SwipeableGastoItem from '@/components/SwipeableGastoItem';

function getCategoryIcon(categoria: string) {
  const icons: Record<string, string> = {
    comida: '🍔',
    transporte: '🚗',
    entretenimiento: '🎬',
    salud: '💊',
    ropa: '👕',
    hogar: '🏠',
    servicios: '📱',
    otros: '📦',
  };
  return icons[categoria] || '📦';
}

function getCategoryColor(categoria: string) {
  const colors: Record<string, string> = {
    comida: 'from-orange-500 to-amber-500',
    transporte: 'from-blue-500 to-cyan-500',
    entretenimiento: 'from-purple-500 to-pink-500',
    salud: 'from-green-500 to-emerald-500',
    ropa: 'from-rose-500 to-red-500',
    hogar: 'from-yellow-500 to-orange-500',
    servicios: 'from-indigo-500 to-purple-500',
    otros: 'from-gray-500 to-slate-500',
  };
  return colors[categoria] || 'from-gray-500 to-slate-500';
}

function formatDate(fecha: string) {
  const date = new Date(fecha + 'T00:00:00');
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default function GastosPage() {
  const [filtro, setFiltro] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar gastos de Firebase
  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filtrar gastos del mes actual
  const today = new Date();
  const mesActual = today.toISOString().slice(0, 7);
  const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesActual));

  // Solo gastos VARIABLES (no fijos, no vales) afectan el presupuesto de $15,000
  const gastosVariablesDelMes = gastosDelMes.filter(g => !g.esFijo && !g.conVales);

  const gastosFiltrados = gastosVariablesDelMes
    .filter(g => filtro === 'todos' || g.titular === filtro)
    .filter(g => g.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalMes = gastosVariablesDelMes.reduce((sum, g) => sum + g.monto, 0);
  const restante = PRESUPUESTO_VARIABLE - totalMes;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Historial de Gastos</h1>
            <p className="text-white/50">Preparando tu historial...</p>
          </div>
          <div className="h-10 w-36 bg-white/10 rounded-xl animate-pulse" />
        </div>

        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-white/10 rounded w-24" />
                  <div className="h-8 bg-white/10 rounded w-32" />
                  <div className="h-3 bg-white/10 rounded w-20" />
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Search/Filters */}
        <div className="glass-card animate-pulse">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="h-10 bg-white/10 rounded-xl flex-1" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-24 bg-white/10 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Skeleton Transactions */}
        <div className="glass-card animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-white/10 rounded w-28" />
            <div className="h-4 bg-white/10 rounded w-20" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10" />
                  <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded w-32" />
                    <div className="h-3 bg-white/10 rounded w-48" />
                  </div>
                </div>
                <div className="h-6 bg-white/10 rounded w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Historial de Gastos</h1>
          <p className="text-white/50">Gastos variables de {today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
        </div>
        <Link
          href="/registrar"
          className="btn-primary flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          Registrar Gasto
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">Total del mes</p>
              <p className="text-2xl font-bold text-white mt-1">{formatMoney(totalMes)}</p>
              <p className="text-xs text-white/40 mt-1">Gastos variables</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">Transacciones</p>
              <p className="text-2xl font-bold text-white mt-1">{gastosVariablesDelMes.length}</p>
              <p className="text-xs text-white/40 mt-1">Gastos variables</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">Presupuesto restante</p>
              <p className={`text-2xl font-bold mt-1 ${restante >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatMoney(restante)}
              </p>
              <p className="text-xs text-white/40 mt-1">De {formatMoney(PRESUPUESTO_VARIABLE)}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${restante >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <Calendar className={`w-6 h-6 ${restante >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
          </div>
        </div>
      </div>

      {gastosVariablesDelMes.length > 0 ? (
        <>
          {/* Search and Filters */}
          <div className="glass-card">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar gastos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-white/40" />
                {['todos', 'alejandra', 'ricardo', 'compartido'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      filtro === f
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gastos List */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Transacciones</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/40">{gastosFiltrados.length} resultados</span>
                <span className="hidden sm:flex items-center gap-1 text-xs text-white/30 bg-white/5 px-2 py-1 rounded-lg">
                  <Smartphone className="w-3 h-3" />
                  Desliza para eliminar
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {gastosFiltrados.map((gasto) => (
                <SwipeableGastoItem
                  key={gasto.id}
                  gasto={gasto}
                />
              ))}
            </div>

            {gastosFiltrados.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/50">No hay gastos que coincidan con tu búsqueda</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="glass-card text-center py-16">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
            <Receipt className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Sin gastos este mes</h3>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            No has registrado gastos variables en {today.toLocaleDateString('es-MX', { month: 'long' })}.
            Registra tus gastos para llevar un mejor control de tu dinero.
          </p>
          <Link
            href="/registrar"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Registrar primer gasto
          </Link>
        </div>
      )}
    </div>
  );
}
