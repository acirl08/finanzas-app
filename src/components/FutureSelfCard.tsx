'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Heart, Plane, Home, Check, Edit3, Save } from 'lucide-react';

interface FutureSelfCardProps {
  className?: string;
}

export default function FutureSelfCard({ className = '' }: FutureSelfCardProps) {
  const [dream, setDream] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Load dream from localStorage
  useEffect(() => {
    const savedDream = localStorage.getItem('finanzas-dream');
    if (savedDream) {
      setDream(savedDream);
      setInputValue(savedDream);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('finanzas-dream', inputValue);
    setDream(inputValue);
    setIsEditing(false);
  };

  const beneficios = [
    { icon: '💰', text: 'Dejar de pagar $38,450/mes en deudas' },
    { icon: '🏠', text: 'Ahorrar para su casa propia' },
    { icon: '✈️', text: 'Viajar sin culpa ni preocupaciones' },
    { icon: '😴', text: 'Dormir tranquilos, sin estrés financiero' },
  ];

  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      {/* Header with gradient background */}
      <div className="relative -mx-6 -mt-6 mb-6 p-6 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h40v40H0z%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M20%2020L0%200M20%2020l20-20M20%2020L0%2040M20%2020l20%2020%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.03)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />

        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Diciembre 2026</h3>
            <p className="text-sm text-white/60">Tu futuro libre de deudas</p>
          </div>
        </div>
      </div>

      {/* Illustration placeholder */}
      <div className="mb-6 p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 text-center">
        <div className="text-6xl mb-3">🎉</div>
        <p className="text-lg font-semibold text-white mb-1">Ale & Ricardo</p>
        <p className="text-sm text-white/60">Celebrando su libertad financiera</p>
      </div>

      {/* Benefits list */}
      <div className="mb-6">
        <p className="text-sm text-white/50 mb-4">En 11 meses podrán:</p>
        <div className="space-y-3">
          {beneficios.map((beneficio, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <span className="text-xl">{beneficio.icon}</span>
              <span className="text-sm text-white/80">{beneficio.text}</span>
              <Check className="w-4 h-4 text-green-400 ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Personal Dream Section */}
      <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
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
              placeholder="¿Por qué quieres salir de deudas?"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
              maxLength={100}
            />
            <p className="text-xs text-white/30">
              Ejemplos: "Viajar a Europa con mi familia", "Comprar nuestra casa", "Tener paz financiera"
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
            <p className="text-white italic">"{dream}"</p>
          </div>
        )}
      </div>

      {/* Motivational Footer */}
      <div className="mt-6 pt-4 border-t border-white/10 text-center">
        <p className="text-xs text-white/40">
          Cada decisión financiera hoy te acerca a este futuro ✨
        </p>
      </div>
    </div>
  );
}
