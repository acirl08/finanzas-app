import ChatAssistant from '@/components/ChatAssistant';
import { MessageCircle, Sparkles } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Asistente Financiero</h1>
          <p className="text-white/50">Pregunta lo que quieras sobre tus finanzas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat */}
        <div className="lg:col-span-3">
          <ChatAssistant />
        </div>

        {/* Tips Sidebar */}
        <div className="space-y-4">
          <div className="glass-card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Sugerencias</h3>
            </div>
            <div className="space-y-2">
              {[
                '¿Puedo comprar algo de $500?',
                '¿Cómo vamos con las deudas?',
                '¿Cuánto me queda este mes?',
                'Dame motivación',
                '¿Qué deuda pago primero?',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card-dark">
            <p className="text-xs text-white/40 mb-2">Powered by</p>
            <p className="text-sm text-white font-medium">Claude AI</p>
            <p className="text-xs text-white/50 mt-2">
              El asistente conoce tu situación financiera y puede darte consejos personalizados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
