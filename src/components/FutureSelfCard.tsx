'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Heart, Trophy, TrendingDown, Calendar, Edit3, Save, Flame, Target, Gift, Palmtree, Home, Car } from 'lucide-react';
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '@/lib/storage';
import { subscribeToDeudas, calcularTotalesFromDeudas } from '@/lib/firestore';
import { deudasIniciales, calcularProyeccionDeudas } from '@/lib/data';
import { Deuda } from '@/types';

interface FutureSelfCardProps {
  className?: string;
}

// Íconos para diferentes tipos de sueños
const DREAM_ICONS: Record<string, React.ReactNode> = {
  viaje: <Palmtree className="w-5 h-5" />,
  casa: <Home className="w-5 h-5" />,
  carro: <Car className="w-5 h-5" />,
  default: <Heart className="w-5 h-5" />,
};

// Frases motivacionales rotativas
const MOTIVATIONAL_PHRASES = [
  "Cada peso que no gastas hoy es un paso hacia tu libertad",
  "Tu yo del futuro te lo va a agradecer",
  "11 meses de disciplina = toda una vida de libertad",
  "El sacrificio de hoy es la abundancia de mañana",
  "Ustedes pueden, ya llevan un gran avance",
  "La deuda se paga con decisiones, no con deseos",
  "Hoy es un buen día para no gastar de más",
];

export default function FutureSelfCard({ className = '' }: FutureSelfCardProps) {
  const [dream, setDream] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales);
  const [motivationalIndex, setMotivationalIndex] = useState(0);
  const [milestones, setMilestones] = useState<string[]>([]);

  // Load dream and milestones from localStorage
  useEffect(() => {
    const savedDream = safeGetItem('finanzas-dream');
    if (savedDream) {
      setDream(savedDream);
      setInputValue(savedDream);
    }

    const savedMilestones = safeGetJSON<string[]>('finanzas-milestones', []);
    setMilestones(savedMilestones);

    // Rotate motivational phrase daily
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setMotivationalIndex(dayOfYear % MOTIVATIONAL_PHRASES.length);
  }, []);

  // Subscribe to deudas
  useEffect(() => {
    const unsubscribe = subscribeToDeudas((d) => {
      if (d && d.length > 0) {
        setDeudas(d);
      }
    });
    return () => unsubscribe();
  }, []);

  // Cálculos dinámicos
  const calculations = useMemo(() => {
    const totales = calcularTotalesFromDeudas(deudas);
    const deudaInicial = deudasIniciales.reduce((sum, d) => sum + d.saldoInicial, 0);
    const deudaPagada = deudaInicial - totales.deudaTotal;
    const porcentajePagado = deudaInicial > 0 ? (deudaPagada / deudaInicial) * 100 : 0;

    // Fecha meta: dinámica desde proyección
    const proyeccion = calcularProyeccionDeudas(deudas, 0);
    const [year, month] = proyeccion.fechaLibertad.split('-').map(Number);
    const fechaMeta = new Date(year, month, 0); // Último día del mes de libertad
    const hoy = new Date();
    const mesesRestantes = Math.max(0,
      (fechaMeta.getFullYear() - hoy.getFullYear()) * 12 +
      (fechaMeta.getMonth() - hoy.getMonth())
    );
    const diasRestantes = Math.max(0, Math.ceil((fechaMeta.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)));
    const fechaMetaFormateada = fechaMeta.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

    // Deudas liquidadas
    const deudasLiquidadas = deudas.filter(d => d.liquidada).length;
    const deudasTotales = deudas.length;

    // Pago mensual liberado (deudas ya liquidadas)
    const pagoMensualLiberado = deudas
      .filter(d => d.liquidada)
      .reduce((sum, d) => sum + d.pagoMinimo, 0);

    // Siguiente deuda a liquidar
    const siguienteDeuda = deudas
      .filter(d => !d.liquidada)
      .sort((a, b) => a.prioridad - b.prioridad)[0];

    // Ahorro total proyectado en intereses
    const ahorroInteresesProyectado = deudas.reduce((sum, d) => {
      // Estimación simple: si pagaran mínimos por 5 años vs plan actual
      const interesAnual = d.saldoInicial * (d.cat / 100) * 0.3; // Aproximación
      return sum + interesAnual;
    }, 0);

    return {
      deudaTotal: totales.deudaTotal,
      deudaPagada,
      porcentajePagado,
      mesesRestantes,
      diasRestantes,
      deudasLiquidadas,
      deudasTotales,
      pagoMensualLiberado,
      siguienteDeuda,
      pagoMensualDeudas: totales.pagosMinimos,
      ahorroInteresesProyectado,
      fechaMetaFormateada,
    };
  }, [deudas]);

  const handleSave = () => {
    safeSetItem('finanzas-dream', inputValue);
    setDream(inputValue);
    setIsEditing(false);
  };

  // Detectar tipo de sueño para ícono
  const getDreamIcon = (dreamText: string) => {
    const lower = dreamText.toLowerCase();
    if (lower.includes('viaj') || lower.includes('europ') || lower.includes('playa')) return DREAM_ICONS.viaje;
    if (lower.includes('casa') || lower.includes('depa') || lower.includes('hogar')) return DREAM_ICONS.casa;
    if (lower.includes('carro') || lower.includes('auto') || lower.includes('coche')) return DREAM_ICONS.carro;
    return DREAM_ICONS.default;
  };

  // Mensaje dinámico basado en progreso
  const getProgressMessage = () => {
    if (calculations.porcentajePagado >= 50) {
      return "¡Más de la mitad! La meta está cerca.";
    } else if (calculations.porcentajePagado >= 25) {
      return "¡Gran avance! Un cuarto del camino recorrido.";
    } else if (calculations.porcentajePagado >= 10) {
      return "¡Buen inicio! Ya comenzó el cambio.";
    }
    return "El viaje de mil millas comienza con un paso.";
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      {/* Header with gradient background */}
      <div className="relative -mx-6 -mt-6 mb-6 p-6 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h40v40H0z%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M20%2020L0%200M20%2020l20-20M20%2020L0%2040M20%2020l20%2020%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.03)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white capitalize">{calculations.fechaMetaFormateada}</h3>
              <p className="text-sm text-white/60">
                {calculations.mesesRestantes > 0
                  ? `Faltan ${calculations.mesesRestantes} meses`
                  : '¡La meta está aquí!'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-400">
              {calculations.porcentajePagado.toFixed(1)}%
            </p>
            <p className="text-xs text-white/50">completado</p>
          </div>
        </div>
      </div>

      {/* Progress Ring + Stats */}
      <div className="mb-6 p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20">
        <div className="flex items-center justify-between mb-4">
          {/* Progress visual */}
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${calculations.porcentajePagado * 2.51} 251`}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-2xl">🎉</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 ml-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Deuda pagada</span>
              <span className="text-sm font-semibold text-emerald-400">
                {formatMoney(calculations.deudaPagada)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Por pagar</span>
              <span className="text-sm font-semibold text-white">
                {formatMoney(calculations.deudaTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Deudas liquidadas</span>
              <span className="text-sm font-semibold text-purple-400">
                {calculations.deudasLiquidadas}/{calculations.deudasTotales}
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-white/70">{getProgressMessage()}</p>
      </div>

      {/* Next Milestone */}
      {calculations.siguienteDeuda && (
        <div className="mb-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-amber-300/70">Próxima meta</p>
              <p className="text-sm font-semibold text-white">
                Liquidar {calculations.siguienteDeuda.nombre}
              </p>
              <p className="text-xs text-white/50">
                Saldo: {formatMoney(calculations.siguienteDeuda.saldoActual)}
              </p>
            </div>
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
        </div>
      )}

      {/* What you'll gain */}
      <div className="mb-4">
        <p className="text-xs text-white/50 mb-3">Al terminar tendrán:</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
            <p className="text-lg font-bold text-emerald-400">
              +{formatMoney(calculations.pagoMensualDeudas)}
            </p>
            <p className="text-xs text-white/50">libres cada mes</p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-center">
            <p className="text-lg font-bold text-purple-400">
              {formatMoney(calculations.ahorroInteresesProyectado)}
            </p>
            <p className="text-xs text-white/50">ahorrados en intereses</p>
          </div>
        </div>
      </div>

      {/* Personal Dream Section */}
      <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-pink-400">
              {dream ? getDreamIcon(dream) : <Heart className="w-5 h-5" />}
            </div>
            <span className="text-sm font-medium text-white">Tu sueño personal</span>
          </div>
          {!isEditing && dream && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4 text-white/40" />
            </button>
          )}
        </div>

        {isEditing || !dream ? (
          <div className="space-y-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="¿Qué harás cuando sean libres de deudas?"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
              maxLength={100}
            />
            <p className="text-xs text-white/30">
              Ej: "Viajar a Europa", "El enganche de nuestra casa", "Un fondo de emergencia"
            </p>
            {inputValue && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-sm hover:bg-purple-500/30 transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar mi sueño
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-white italic text-center">"{dream}"</p>
          </div>
        )}
      </div>

      {/* Motivational Footer */}
      <div className="mt-4 pt-4 border-t border-white/10 text-center">
        <p className="text-sm text-white/60 italic">
          "{MOTIVATIONAL_PHRASES[motivationalIndex]}"
        </p>
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-white/30">
          <Calendar className="w-3 h-3" />
          <span>{calculations.diasRestantes} días para la libertad</span>
        </div>
      </div>
    </div>
  );
}
