'use client';

import { useState } from 'react';
import { Receipt, Filter, Calendar, TrendingDown } from 'lucide-react';

// Gastos de ejemplo - estos vendrán de la base de datos
const gastosEjemplo = [
  { id: '1', fecha: '2026-01-15', descripcion: 'Uber al trabajo', monto: 85, categoria: 'transporte', titular: 'alejandra' },
  { id: '2', fecha: '2026-01-14', descripcion: 'Café Starbucks', monto: 95, categoria: 'comida', titular: 'alejandra' },
  { id: '3', fecha: '2026-01-14', descripcion: 'Gasolina', monto: 800, categoria: 'transporte', titular: 'ricardo' },
  { id: '4', fecha: '2026-01-13', descripcion: 'Netflix', monto: 299, categoria: 'entretenimiento', titular: 'ricardo' },
  { id: '5', fecha: '2026-01-12', descripcion: 'Super HEB', monto: 1500, categoria: 'comida', titular: 'compartido' },
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

export default function GastosPage() {
  const [filtro, setFiltro] = useState('todos');

  const gastosFiltrados = filtro === 'todos'
    ? gastosEjemplo
    : gastosEjemplo.filter(g => g.titular === filtro);

  const totalMes = gastosEjemplo.reduce((sum, g) => sum + g.monto, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Historial de Gastos</h1>
        <p className="text-gray-500">Todos los gastos registrados</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total este mes</p>
              <p className="text-xl font-bold text-red-600">{formatMoney(totalMes)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-full">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Transacciones</p>
              <p className="text-xl font-bold">{gastosEjemplo.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Promedio diario</p>
              <p className="text-xl font-bold">{formatMoney(totalMes / 15)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-500 mr-2">Filtrar por:</span>
          {['todos', 'alejandra', 'ricardo', 'compartido'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filtro === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de gastos */}
      <div className="card">
        <div className="space-y-3">
          {gastosFiltrados.map((gasto) => (
            <div
              key={gasto.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{getCategoryIcon(gasto.categoria)}</span>
                <div>
                  <p className="font-medium">{gasto.descripcion}</p>
                  <p className="text-sm text-gray-500">
                    {gasto.fecha} • <span className="capitalize">{gasto.titular}</span>
                  </p>
                </div>
              </div>
              <p className="font-bold text-lg">{formatMoney(gasto.monto)}</p>
            </div>
          ))}
        </div>

        {gastosFiltrados.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay gastos para mostrar
          </div>
        )}
      </div>
    </div>
  );
}
