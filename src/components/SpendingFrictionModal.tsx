'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Clock, X, Briefcase, Calendar, Target } from 'lucide-react';
import { INGRESO_MENSUAL, deudasIniciales, calcularProyeccionDeudas, calcularTotales } from '@/lib/data';
import { formatMoney } from '@/lib/utils';

interface SpendingFrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  monto: number;
  categoria: string;
  descripcion: string;
  presupuestoDiario?: number;
  gastadoHoy?: number;
}

// Categories that don't need friction (essentials)
const ESSENTIAL_CATEGORIES = ['renta', 'servicios', 'supermercado', 'transporte', 'salud'];

// Componente para mostrar fecha de libertad dinámica
function FechaMetaReminder() {
  const proyeccion = useMemo(() => calcularProyeccionDeudas(deudasIniciales, 0), []);
  const fechaLibertad = new Date(proyeccion.fechaLibertad + '-01');
  const fechaFormateada = fechaLibertad.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div className="px-6 pb-6">
      <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
        <p className="text-xs text-center text-purple-300">
          💭 Recuerda tu meta: ser libre de deudas en {fechaFormateada}
        </p>
      </div>
    </div>
  );
}

export default function SpendingFrictionModal({
  isOpen,
  onClose,
  onConfirm,
  monto,
  categoria,
  descripcion,
  presupuestoDiario = 500,
  gastadoHoy = 0,
}: SpendingFrictionModalProps) {
  const [countdown, setCountdown] = useState(10);
  const [canConfirm, setCanConfirm] = useState(false);

  // Check if this is an essential category (no friction needed)
  const isEssential = ESSENTIAL_CATEGORIES.includes(categoria.toLowerCase());

  // Memoized impact calculations - usando datos reales
  const impactData = useMemo(() => {
    // Calcular pago mensual real desde los totales de deudas
    const totalesDeudas = calcularTotales(deudasIniciales);
    const pagoMensualDeuda = totalesDeudas.pagosMinimos;

    const DIAS_POR_MES = 30;
    const INGRESO_DIARIO = INGRESO_MENSUAL / DIAS_POR_MES;
    const HORAS_TRABAJO_DIA = 8;
    const PAGO_POR_HORA = INGRESO_DIARIO / HORAS_TRABAJO_DIA;

    const diasRetraso = Math.ceil(monto / (pagoMensualDeuda / DIAS_POR_MES));
    const horasTrabajo = Math.ceil(monto / PAGO_POR_HORA);

    const disponibleHoy = Math.max(0, presupuestoDiario - gastadoHoy);
    const porcentajeDelDia = presupuestoDiario > 0 ? Math.round((monto / presupuestoDiario) * 100) : 0;
    const quedaDespues = disponibleHoy - monto;
    const excede = quedaDespues < 0;

    return { diasRetraso, horasTrabajo, disponibleHoy, porcentajeDelDia, quedaDespues, excede };
  }, [monto, presupuestoDiario, gastadoHoy]);

  const { diasRetraso, horasTrabajo, disponibleHoy, porcentajeDelDia, quedaDespues, excede } = impactData;

  // Handle essential categories - auto-confirm without showing modal
  useEffect(() => {
    if (isOpen && isEssential) {
      // Use setTimeout to avoid calling onConfirm during render
      const timeoutId = setTimeout(() => {
        onConfirm();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isEssential, onConfirm]);

  // Handle countdown timer for non-essential categories
  useEffect(() => {
    if (isOpen && !isEssential) {
      setCountdown(10);
      setCanConfirm(false);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanConfirm(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, isEssential]);

  // Don't render modal if closed or essential category
  if (!isOpen || isEssential) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={canConfirm ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#1C2128] border border-red-500/30 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Warning Header */}
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 p-6 border-b border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Pausa de Reflexión</h3>
                <p className="text-sm text-white/50">Piénsalo bien</p>
              </div>
            </div>
            {canConfirm && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Impact Message */}
          <div className="text-center">
            <p className="text-white/70 mb-2">Este gasto de</p>
            <p className="text-3xl font-bold text-red-400 mb-2">{formatMoney(monto)}</p>
            <p className="text-white/70">en "{descripcion || categoria}"</p>
          </div>

          {/* TODAY'S BUDGET IMPACT - Most important */}
          <div className={`p-4 rounded-xl border-2 ${excede ? 'bg-red-500/20 border-red-500/50' : 'bg-yellow-500/20 border-yellow-500/50'}`}>
            <div className="text-center mb-3">
              <p className="text-sm text-white/70">Impacto en tu presupuesto de HOY</p>
              <p className={`text-3xl font-black ${excede ? 'text-red-400' : 'text-yellow-400'}`}>
                {porcentajeDelDia}% del día
              </p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Te queda hoy:</span>
              <span className={`font-bold ${excede ? 'text-red-400' : 'text-white'}`}>
                {excede ? `Te excedes por ${formatMoney(Math.abs(quedaDespues))}` : formatMoney(quedaDespues)}
              </span>
            </div>
          </div>

          {/* Impact Translations */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              <Calendar className="w-8 h-8 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-white/50">Retrasa tu libertad</p>
                <p className="text-lg font-bold text-red-400">{diasRetraso} día{diasRetraso > 1 ? 's' : ''} más de deuda</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <Briefcase className="w-8 h-8 text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-white/50">Trabajaste</p>
                <p className="text-lg font-bold text-orange-400">{horasTrabajo} hora{horasTrabajo > 1 ? 's' : ''} para esto</p>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-lg text-white font-medium">¿Realmente lo necesitas?</p>
          </div>

          {/* Countdown / Buttons */}
          {!canConfirm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-lg text-white/80">
                  Espera <span className="font-bold text-yellow-400">{countdown}</span> segundos...
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-1000"
                  style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-green-500/20 text-green-400 rounded-xl font-medium hover:bg-green-500/30 transition-colors border border-green-500/30"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 px-4 bg-white/10 text-white/80 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Sí, registrar
              </button>
            </div>
          )}
        </div>

        {/* Footer Reminder - fecha dinámica */}
        <FechaMetaReminder />
      </div>
    </div>
  );
}
