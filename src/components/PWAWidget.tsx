'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Download, X, Check, Bell, Home } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAWidget() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detectar si es iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Detectar si ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Verificar si ya fue descartado
    const wasDismissed = localStorage.getItem('pwa-widget-dismissed');
    if (wasDismissed) {
      const dismissedDate = new Date(wasDismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
      }
    }

    // Capturar el evento de instalación (Chrome/Edge/etc)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-widget-dismissed', new Date().toISOString());
  };

  // No mostrar si no está montado, ya está instalada o fue descartada
  if (!mounted || isInstalled || dismissed) {
    return null;
  }

  return (
    <div className="glass-card relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />

      <div className="relative">
        <button
          onClick={handleDismiss}
          className="absolute top-0 right-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-white/40" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Instalar App</h3>
            <p className="text-xs text-white/50">Acceso rápido desde tu pantalla</p>
          </div>
        </div>

        {/* Beneficios */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Check className="w-4 h-4 text-green-400" />
            <span>Acceso con un tap desde el inicio</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Check className="w-4 h-4 text-green-400" />
            <span>Funciona sin conexión</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Check className="w-4 h-4 text-green-400" />
            <span>Notificaciones de pagos</span>
          </div>
        </div>

        {/* Botón de instalación */}
        {installPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Instalar Ahora
          </button>
        ) : isIOS ? (
          <>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Cómo Instalar en iPhone
            </button>

            {showInstructions && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                <p className="text-sm text-white/70 font-medium">Pasos para iOS:</p>
                <ol className="text-sm text-white/60 space-y-2 list-decimal list-inside">
                  <li>Toca el botón <strong>Compartir</strong> (el cuadrito con flecha hacia arriba)</li>
                  <li>Desplázate y selecciona <strong>"Agregar a pantalla de inicio"</strong></li>
                  <li>Confirma tocando <strong>"Agregar"</strong></li>
                </ol>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-white/50">
                    Nota: Las notificaciones solo funcionan en iOS 16.4+
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-3 bg-white/5 rounded-xl">
            <p className="text-sm text-white/50">
              Abre en Chrome o Edge para instalar
            </p>
          </div>
        )}

        {/* Nota sobre el widget nativo */}
        <p className="text-xs text-white/30 text-center mt-3">
          Una vez instalada, podrás agregar widgets a tu pantalla de inicio (iOS 17+ / Android 12+)
        </p>
      </div>
    </div>
  );
}
