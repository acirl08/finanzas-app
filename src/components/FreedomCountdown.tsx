'use client';

import { useState, useEffect } from 'react';
import { Rocket, PartyPopper, Clock, Calendar, Target } from 'lucide-react';

export default function FreedomCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date(2026, 11, 31, 23, 59, 59); // Dec 31, 2026

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeUnits = [
    { value: timeLeft.days, label: 'días', color: 'from-purple-500 to-pink-500' },
    { value: timeLeft.hours, label: 'horas', color: 'from-blue-500 to-cyan-500' },
    { value: timeLeft.minutes, label: 'min', color: 'from-green-500 to-emerald-500' },
    { value: timeLeft.seconds, label: 'seg', color: 'from-orange-500 to-yellow-500' },
  ];

  return (
    <div className="glass-card bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 border border-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Cuenta Regresiva</h3>
            <p className="text-xs text-white/50">Hacia la libertad financiera</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-purple-400">
          <Target className="w-4 h-4" />
          <span className="text-sm font-medium">Dic 2026</span>
        </div>
      </div>

      {/* Countdown Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {timeUnits.map((unit, index) => (
          <div key={index} className="text-center">
            <div className={`bg-gradient-to-br ${unit.color} p-0.5 rounded-xl`}>
              <div className="bg-[#0f0f1a] rounded-xl py-3 px-2">
                <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                  {unit.value.toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            <p className="text-xs text-white/50 mt-2">{unit.label}</p>
          </div>
        ))}
      </div>

      {/* Message */}
      <div className="text-center p-4 bg-white/5 rounded-xl">
        <div className="flex items-center justify-center gap-2 mb-2">
          <PartyPopper className="w-5 h-5 text-yellow-400" />
          <span className="text-sm font-medium text-white">
            {timeLeft.days <= 30 ? '¡Ya casi!' : timeLeft.days <= 90 ? '¡La meta está cerca!' : '¡Sigue así!'}
          </span>
          <PartyPopper className="w-5 h-5 text-yellow-400 scale-x-[-1]" />
        </div>
        <p className="text-xs text-white/50">
          En {timeLeft.days} días serás completamente libre de deudas
        </p>
      </div>

      {/* Motivational Quote */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-center text-white/40 italic">
          "Cada segundo que pasa te acerca más a tu libertad financiera"
        </p>
      </div>
    </div>
  );
}
