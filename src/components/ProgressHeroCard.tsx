'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Mountain, Flag, Sparkles, TrendingUp, Calendar } from 'lucide-react';
import { subscribeToDeudas, calcularTotalesFromDeudas } from '@/lib/firestore';
import { Deuda } from '@/types';
import { deudasIniciales, calcularProyeccionDeudas } from '@/lib/data';
import { formatMoney } from '@/lib/utils';

// Animated counter component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = Date.now();

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(value * easeOutQuart));

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{displayValue.toFixed(1)}</span>;
}

export default function ProgressHeroCard() {
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToDeudas((deudasActualizadas) => {
      setDeudas(deudasActualizadas.length > 0 ? deudasActualizadas : deudasIniciales);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totales = calcularTotalesFromDeudas(deudas);
  const porcentaje = totales.porcentajePagado;

  // Proyección real con intereses compuestos
  const proyeccion = useMemo(() => {
    if (deudas.length === 0) return calcularProyeccionDeudas(deudasIniciales, 0);
    return calcularProyeccionDeudas(deudas, 0);
  }, [deudas]);

  const mesesRestantes = proyeccion.mesesParaLibertad;

  // Fecha de libertad calculada dinámicamente
  const fechaLibertadDate = useMemo(() => {
    return new Date(proyeccion.fechaLibertad + '-01');
  }, [proyeccion.fechaLibertad]);

  const mesLibertad = fechaLibertadDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  // Days to freedom - calculado dinámicamente desde la proyección
  const hoy = new Date();
  const diasParaLibertad = Math.ceil((fechaLibertadDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  // Milestone messages based on progress
  const getMilestoneMessage = (pct: number) => {
    if (pct >= 90) return '¡Ya casi llegas a la cima!';
    if (pct >= 75) return '¡Tres cuartos del camino!';
    if (pct >= 50) return '¡Llegaste a la mitad!';
    if (pct >= 25) return '¡Un cuarto del camino!';
    if (pct >= 10) return '¡Buen inicio!';
    return '¡Comienza tu ascenso!';
  };

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-64 bg-[#252931] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/40 via-[#1C2128] to-pink-900/30 border border-purple-500/20">
      {/* Background Mountain Illustration */}
      <div className="absolute inset-0 opacity-10">
        <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
          <path
            d="M0,200 L50,150 L100,170 L150,100 L200,50 L250,80 L300,60 L350,90 L400,40 L400,200 Z"
            fill="url(#mountainGradient)"
          />
          <defs>
            <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#3B0764" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Mountain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Tu Camino a la Libertad</h2>
              <p className="text-sm text-white/50">{getMilestoneMessage(porcentaje)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30">
            <Sparkles className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400 font-medium">En progreso</span>
          </div>
        </div>

        {/* Main Progress Display */}
        <div className="text-center py-8">
          <div className="relative inline-block">
            <p className="text-7xl font-bold text-white">
              <AnimatedCounter value={porcentaje} />%
            </p>
            <p className="text-lg text-purple-300 mt-2">del camino hacia la cima</p>
          </div>
        </div>

        {/* Visual Progress Bar (Mountain Path) */}
        <div className="relative mb-8">
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-green-400 transition-all duration-1000 relative"
              style={{ width: `${Math.max(porcentaje, 2)}%` }}
            >
              {/* Climber indicator */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                <span className="text-xs">🧗</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/40">
            <span>Inicio</span>
            <span className="flex items-center gap-1">
              <Flag className="w-3 h-3 text-green-400" />
              Libertad
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-white/40 mb-1">Ya pagaste</p>
            <p className="text-lg font-bold text-green-400">{formatMoney(totales.deudaPagada)}</p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-white/40 mb-1">Días para ser libre</p>
            <p className="text-lg font-bold text-purple-400">{diasParaLibertad}</p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-white/40 mb-1">Meta</p>
            <p className="text-lg font-bold text-pink-400">{fechaLibertadDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Motivational Footer */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                ¡Cada peso que pagas te acerca a la cima!
              </p>
              <p className="text-xs text-white/50">
                Ya llevas {formatMoney(totales.deudaPagada)} pagados de {formatMoney(totales.deudaInicial)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
