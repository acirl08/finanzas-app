'use client';

import { useState } from 'react';
import { Receipt, Filter, Calendar, TrendingDown, Search, Download, ChevronRight } from 'lucide-react';

// Gastos de ejemplo - estos vendrán de la base de datos
const gastosEjemplo = [
  { id: '1', fecha: '2026-01-15', descripcion: 'Uber al trabajo', monto: 85, categoria: 'transporte', titular: 'alejandra' },
  { id: '2', fecha: '2026-01-14', descripcion: 'Café Starbucks', monto: 95, categoria: 'comida', titular: 'alejandra' },
  { id: '3', fecha: '2026-01-14', descripcion: 'Gasolina', monto: 800, categoria: 'transporte', titular: 'ricardo' },
  { id: '4', fecha: '2026-01-13', descripcion: 'Netflix', monto: 299, categoria: 'entretenimiento', titular: 'ricardo' },
  { id: '5', fecha: '2026-01-12', descripcion: 'Super HEB', monto: 1500, categoria: 'comida', titular: 'compartido' },
  { id: '6', fecha: '2026-01-11', descripcion: 'Amazon Prime', monto: 99, categoria: 'entretenimiento', titular: 'alejandra' },
  { id: '7', fecha: '2026-01-10', descripcion: 'Farmacia', monto: 350, categoria: 'salud', titular: 'compartido' },
  { id: '8', fecha: '2026-01-09', descripcion: 'Restaurante', monto: 680, categoria: 'comida', titular: 'compartido' },
];

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

  const gastosFiltrados = gastosEjemplo
    .filter(g => filtro === 'todos' || g.titular === filtro)
    .filter(g => g.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalMes = gastosEjemplo.reduce((sum, g) => sum + g.monto, 0);
  const promedioTransaccion = totalMes / gastosEjemplo.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Historial de Gastos</h1>
          <p className="text-white/50">Todos los gastos registrados este mes</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 w-fit">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">Total este mes</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{formatMoney(totalMes)}</p>
              <p className="text-xs text-white/40 mt-1">-12% vs mes anterior</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">Transacciones</p>
              <p className="text-2xl font-bold text-white mt-1">{gastosEjemplo.length}</p>
              <p className="text-xs text-white/40 mt-1">Este mes</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">Promedio por gasto</p>
              <p className="text-2xl font-bold text-white mt-1">{formatMoney(promedioTransaccion)}</p>
              <p className="text-xs text-white/40 mt-1">Por transacción</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

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
          <h3 className="font-semibold text-white">Transacciones Recientes</h3>
          <span className="text-sm text-white/40">{gastosFiltrados.length} resultados</span>
        </div>

        <div className="space-y-3">
          {gastosFiltrados.map((gasto) => (
            <div
              key={gasto.id}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
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
              <div className="flex items-center gap-3">
                <p className="font-bold text-lg text-white">{formatMoney(gasto.monto)}</p>
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {gastosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/50">No hay gastos que coincidan con tu búsqueda</p>
          </div>
        )}
      </div>
    </div>
  );
}
