import GastoForm from '@/components/GastoForm';
import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

export default function RegistrarPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Registrar Gasto</h1>
        <p className="text-white/50">Lleva el control de cada peso que gastas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <GastoForm />
        </div>

        {/* Tips Sidebar */}
        <div className="space-y-4">
          {/* Tip Card */}
          <div className="glass-card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Tip del día</h3>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Registra tus gastos inmediatamente después de hacerlos.
              Esto te ayudará a ser más consciente de tu dinero y
              evitar gastos hormiga.
            </p>
          </div>

          {/* Meta Card */}
          <div className="glass-card-dark">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-white">Tu meta mensual</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/50">Gastos variables</span>
                  <span className="text-white">$8,450 / $15,000</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill progress-green" style={{ width: '56%' }} />
                </div>
              </div>
              <p className="text-xs text-white/40">
                Te quedan $6,550 para el resto del mes
              </p>
            </div>
          </div>

          {/* Warning Card */}
          <div className="glass-card border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold text-yellow-400">Recordatorio</h3>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Estamos en modo ahorro. Evita usar las tarjetas de crédito
              excepto para gastos absolutamente necesarios.
            </p>
          </div>

          {/* Categories Quick Stats */}
          <div className="glass-card">
            <h3 className="font-semibold text-white mb-4">Gastos por categoría</h3>
            <div className="space-y-3">
              {[
                { name: 'Comida', amount: 3200, color: 'bg-orange-500', percent: 40 },
                { name: 'Transporte', amount: 1800, color: 'bg-blue-500', percent: 22 },
                { name: 'Entretenimiento', amount: 800, color: 'bg-purple-500', percent: 10 },
                { name: 'Otros', amount: 2650, color: 'bg-gray-500', percent: 28 },
              ].map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full ${cat.color}`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">{cat.name}</span>
                      <span className="text-white font-medium">${(cat.amount/1000).toFixed(1)}k</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${cat.color}`}
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
