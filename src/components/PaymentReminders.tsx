'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, Calendar, CreditCard, AlertTriangle, Check, X, DollarSign } from 'lucide-react';
import { deudasIniciales } from '@/lib/data';
import { registrarPagoDeuda } from '@/lib/firestore';

interface Reminder {
  id: string;
  deudaId: string;
  deudaNombre: string;
  monto: number;
  fechaVencimiento: number; // día del mes
  diasRestantes: number;
  urgente: boolean;
}

interface PagoForm {
  reminderId: string;
  deudaId: string;
  deudaNombre: string;
  monto: string;
  fecha: string;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Fechas de vencimiento aproximadas por tarjeta (día del mes)
const fechasVencimiento: Record<string, number> = {
  'Rappi': 15,
  'Nu': 20,
  'HEB Afirme': 10,
  'Amex Gold': 5,
  'Amex Platinum': 5,
  'Santander LikeU': 25,
  'Crédito Personal': 1,
  'BBVA': 18,
  'Banorte/Invex': 12,
};

export default function PaymentReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [pagoForm, setPagoForm] = useState<PagoForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Cargar dismissed del localStorage
    const savedDismissed = localStorage.getItem('dismissed-reminders');
    if (savedDismissed) {
      const parsed = JSON.parse(savedDismissed);
      // Solo mantener los del mes actual
      const mesActual = new Date().toISOString().slice(0, 7);
      const filtrados = parsed.filter((d: string) => d.startsWith(mesActual));
      setDismissed(filtrados);
    }

    // Generar recordatorios
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const mesActual = hoy.toISOString().slice(0, 7);

    const nuevosReminders: Reminder[] = deudasIniciales
      .filter(d => !d.liquidada)
      .map(deuda => {
        const fechaVenc = fechasVencimiento[deuda.nombre] || 15;
        let diasRestantes = fechaVenc - diaActual;

        // Si ya pasó este mes, calcular para el próximo
        if (diasRestantes < -5) {
          diasRestantes = (30 - diaActual) + fechaVenc;
        }

        return {
          id: `${mesActual}-${deuda.id}`,
          deudaId: deuda.id,
          deudaNombre: deuda.nombre,
          monto: deuda.pagoMinimo,
          fechaVencimiento: fechaVenc,
          diasRestantes,
          urgente: diasRestantes <= 3 && diasRestantes >= -2,
        };
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);

    setReminders(nuevosReminders);
  }, []);

  // Evitar problemas de hidratación
  if (!mounted) {
    return null;
  }

  const dismissReminder = (id: string) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem('dismissed-reminders', JSON.stringify(newDismissed));
  };

  const openPagoForm = (reminder: Reminder) => {
    setPagoForm({
      reminderId: reminder.id,
      deudaId: reminder.deudaId,
      deudaNombre: reminder.deudaNombre,
      monto: reminder.monto.toString(),
      fecha: new Date().toISOString().split('T')[0],
    });
  };

  const handleRegistrarPago = async () => {
    if (!pagoForm) return;
    setSaving(true);
    try {
      const monto = parseFloat(pagoForm.monto);
      if (monto > 0) {
        await registrarPagoDeuda(pagoForm.deudaId, monto, `Pago del ${pagoForm.fecha}`);
      }
      dismissReminder(pagoForm.reminderId);
      setPagoForm(null);
    } catch (error) {
      console.error('Error al registrar pago:', error);
    }
    setSaving(false);
  };

  const activeReminders = reminders.filter(r => !dismissed.includes(r.id));
  const urgentReminders = activeReminders.filter(r => r.urgente);
  const upcomingReminders = activeReminders.filter(r => !r.urgente && r.diasRestantes <= 10 && r.diasRestantes > 0);

  const displayReminders = showAll ? activeReminders : [...urgentReminders, ...upcomingReminders].slice(0, 4);

  if (activeReminders.length === 0) {
    return null;
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            urgentReminders.length > 0
              ? 'bg-gradient-to-br from-red-500 to-orange-500 animate-pulse'
              : 'bg-gradient-to-br from-blue-500 to-cyan-500'
          }`}>
            {urgentReminders.length > 0 ? (
              <BellRing className="w-5 h-5 text-white" />
            ) : (
              <Bell className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Recordatorios de Pago</h3>
            <p className="text-xs text-white/50">
              {urgentReminders.length > 0
                ? `${urgentReminders.length} pago(s) urgente(s)`
                : 'Próximos vencimientos'}
            </p>
          </div>
        </div>
        {activeReminders.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            {showAll ? 'Ver menos' : `Ver todos (${activeReminders.length})`}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayReminders.map((reminder) => (
          <div
            key={reminder.id}
            className={`flex items-center justify-between p-3 rounded-xl transition-all ${
              reminder.urgente
                ? 'bg-red-500/10 border border-red-500/30'
                : 'bg-white/5 border border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                reminder.urgente ? 'bg-red-500/20' : 'bg-white/10'
              }`}>
                {reminder.urgente ? (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                ) : (
                  <CreditCard className="w-4 h-4 text-white/60" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{reminder.deudaNombre}</p>
                <p className="text-xs text-white/50">
                  Vence día {reminder.fechaVencimiento} • {formatMoney(reminder.monto)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${
                reminder.diasRestantes <= 0 ? 'text-red-400' :
                reminder.diasRestantes <= 3 ? 'text-orange-400' :
                'text-white/60'
              }`}>
                {reminder.diasRestantes <= 0
                  ? `¡Vencido hace ${Math.abs(reminder.diasRestantes)} día(s)!`
                  : reminder.diasRestantes === 1
                    ? '¡Mañana!'
                    : `${reminder.diasRestantes} días`}
              </span>
              <button
                onClick={() => openPagoForm(reminder)}
                className="p-1.5 hover:bg-green-500/20 rounded-lg transition-colors"
                title="Registrar pago"
              >
                <Check className="w-4 h-4 text-green-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen de pagos del mes */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Total pagos mínimos del mes</span>
          <span className="text-white font-medium">
            {formatMoney(reminders.reduce((sum, r) => sum + r.monto, 0))}
          </span>
        </div>
      </div>

      {/* Modal para registrar pago */}
      {pagoForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setPagoForm(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-[calc(100vw-1rem)] sm:max-w-sm p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Registrar Pago</h3>
              <button onClick={() => setPagoForm(null)} className="p-1.5 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <p className="text-white/70 text-sm mb-4">
              {pagoForm.deudaNombre}
            </p>

            <div className="space-y-4">
              {/* Monto */}
              <div>
                <label className="text-sm text-white/50 block mb-1">Monto pagado</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input
                    type="number"
                    value={pagoForm.monto}
                    onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-green-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="text-sm text-white/50 block mb-1">Fecha del pago</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input
                    type="date"
                    value={pagoForm.fecha}
                    onChange={(e) => setPagoForm({ ...pagoForm, fecha: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-green-500 [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  dismissReminder(pagoForm.reminderId);
                  setPagoForm(null);
                }}
                className="flex-1 py-2.5 text-white/70 hover:bg-white/10 rounded-lg transition-colors text-sm"
              >
                Solo ocultar
              </button>
              <button
                onClick={handleRegistrarPago}
                disabled={saving}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
