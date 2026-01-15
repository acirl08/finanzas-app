'use client';

import { useState, useEffect } from 'react';
import { Receipt, Filter, Calendar, TrendingDown, Search, Download, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';

interface Gasto {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  categoria: string;
  titular: string;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);
}

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

export default function GastosPage() {
  const [filtro, setFiltro] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [gastos, setGastos] = useState<Gasto[]>([]);

  // Cargar gastos del localStorage
  useEffect(() => {
    const savedGastos = localStorage.getItem('finanzas-gastos');
    if (savedGastos) {
      setGastos(JSON.parse(savedGastos));
    }
  }, []);

  const gastosFiltrados = gastos
    .filter(g => filtro === 'todos' || g.titular === filtro)
    .filter(g => g.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalMes = gastos.reduce((sum, g) => sum + g.monto, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Historial de Gastos</h1>
          <p className="text-white/50">Gastos variables registrados</p>
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
              <p className="text-white/50 text-sm">Total registrado</p>
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
              <p className="text-2xl font-bold text-white mt-1">{gastos.length}</p>
              <p className="text-xs text-white/40 mt-1">Registradas</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">Presupuesto variable</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{formatMoney(15000 - totalMes)}</p>
              <p className="text-xs text-white/40 mt-1">Restante de $15,000</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {gastos.length > 0 ? (
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
              <span className="text-sm text-white/40">{gastosFiltrados.length} resultados</span>
            </div>

            <div className="space-y-3">
              {gastosFiltrados.map((gasto) => (
                <div
                  key={gasto.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryColor(gasto.categoria)} flex items-center justify-center text-xl`}>
                      {getCategoryIcon(gasto.categoria)}
                    </div>
                    <div>
                      <p className="font-medium text-white">{gasto.descripcion}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/40">{gasto.fecha}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          gasto.titular === 'alejandra' ? 'bg-pink-500/20 text-pink-400' :
                          gasto.titular === 'ricardo' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {gasto.titular.charAt(0).toUpperCase() + gasto.titular.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="font-bold text-lg text-white">{formatMoney(gasto.monto)}</p>
                </div>
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
          <h3 className="text-xl font-semibold text-white mb-2">No hay gastos registrados</h3>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            Registra tus gastos variables para llevar un mejor control de tu dinero.
            También puedes usar el asistente de chat para registrar gastos rápidamente.
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
