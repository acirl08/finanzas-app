'use client';

import { useEffect, useState } from 'react';
import { PartyPopper, Sparkles, Trophy, Flame, Star, X } from 'lucide-react';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'under_budget' | 'debt_paid' | 'streak' | 'milestone';
  data?: {
    amount?: number;
    streakDays?: number;
    debtName?: string;
    milestone?: string;
  };
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Confetti particle component
function Confetti() {
  const colors = ['#8B5CF6', '#EC4899', '#6EE7B7', '#FBBF24', '#60A5FA'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 8,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function CelebrationModal({ isOpen, onClose, type, data = {} }: CelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const celebrations = {
    under_budget: {
      icon: Sparkles,
      title: '¡INCREÍBLE!',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-500/20 to-emerald-500/10',
      message: `Gastaste ${formatMoney(data.amount || 0)} MENOS de lo planeado`,
      subMessage: `¡Eso es ${formatMoney(data.amount || 0)} MÁS para tu libertad!`,
    },
    debt_paid: {
      icon: Trophy,
      title: '¡DEUDA LIQUIDADA!',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'from-yellow-500/20 to-orange-500/10',
      message: `¡Terminaste de pagar ${data.debtName}!`,
      subMessage: 'Una deuda menos, ¡sigue así!',
    },
    streak: {
      icon: Flame,
      title: '¡RACHA EN FUEGO!',
      color: 'from-orange-500 to-red-500',
      bgColor: 'from-orange-500/20 to-red-500/10',
      message: `¡${data.streakDays} días bajo presupuesto!`,
      subMessage: 'Tu disciplina está dando frutos',
    },
    milestone: {
      icon: Star,
      title: '¡NUEVO LOGRO!',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-500/20 to-pink-500/10',
      message: data.milestone || '¡Llegaste a un nuevo nivel!',
      subMessage: 'Tu progreso es inspirador',
    },
  };

  const celebration = celebrations[type];
  const Icon = celebration.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Modal */}
      <div className={`relative w-full max-w-sm bg-gradient-to-br ${celebration.bgColor} border border-white/20 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl transition-colors z-10"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>

        <div className="p-8 text-center">
          {/* Icon */}
          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${celebration.color} mb-6 animate-bounce`}>
            <Icon className="w-12 h-12 text-white" />
          </div>

          {/* Party Poppers */}
          <div className="flex justify-center gap-4 mb-4">
            <PartyPopper className="w-8 h-8 text-yellow-400 animate-pulse" />
            <PartyPopper className="w-8 h-8 text-yellow-400 animate-pulse scale-x-[-1]" />
          </div>

          {/* Title */}
          <h2 className={`text-3xl font-bold bg-gradient-to-r ${celebration.color} bg-clip-text text-transparent mb-4`}>
            {celebration.title}
          </h2>

          {/* Message */}
          <p className="text-lg text-white mb-2">{celebration.message}</p>
          <p className="text-sm text-white/60 mb-6">{celebration.subMessage}</p>

          {/* Streak Badge (if applicable) */}
          {data.streakDays && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-white font-medium">Racha: {data.streakDays} días</span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={onClose}
            className={`w-full py-3 px-6 bg-gradient-to-r ${celebration.color} text-white rounded-xl font-semibold hover:opacity-90 transition-opacity`}
          >
            ¡Continuar! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
