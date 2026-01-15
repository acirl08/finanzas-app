'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_CONTEXT = `Eres un asistente financiero personal para Alejandra y Ricardo, una pareja en México que está trabajando para salir de deudas.

CONTEXTO FINANCIERO:
- Ingreso mensual combinado: $109,000 MXN
- Vales de despensa: $4,800 (para comida)
- Deuda total inicial: $491,442 MXN
- Disponible mensual para pagar deuda extra: $38,450 MXN
- Meta: Libres de deudas de tarjetas para noviembre 2026

DEUDAS (ordenadas por prioridad - método avalancha):
1. Rappi - $14,403 - CAT 157.3%
2. Nu (Alejandra) - $6,245 - CAT 156.8%
3. HEB Afirme - $39,834 - CAT 131.9%
4. Amex Gold - $91,622 - CAT 82.4%
5. Amex Platinum (Ricardo) - $870 - CAT 78%
6. Nu (Ricardo) - $9,917 - CAT 63%
7. Santander LikeU - $66,138 - CAT 60.5%
8. Crédito Personal - $91,767 - CAT 38%
9. BBVA (Ricardo) - $121,586 - CAT 32.5%
10. Banorte/Invex - $49,060 - CAT 30%

GASTOS FIJOS:
- Renta: $12,700
- Carro: $13,000 (4 años restantes)
- Crédito personal: $6,000 fijos
- Gasolina: $1,500
- Luz: $1,250/mes ($2,500 bimestral)
- Gas: $450/mes ($900 bimestral)
- Suscripciones: $3,551 (Claude Max, YouTube, Spotify, Netflix, etc.)

REGLAS:
1. Responde en español
2. Sé directo y práctico
3. Si preguntan sobre un gasto, evalúa si es necesario o si pueden evitarlo
4. Motívalos pero sé realista
5. Si registran un gasto en tarjeta de crédito, recuérdales que el plan es NO usar las tarjetas
6. Si preguntan si pueden comprar algo, calcula el impacto en su plan`;

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente financiero. Puedo ayudarte con:\n\n• Revisar si un gasto está dentro del presupuesto\n• Darte consejos sobre cómo ahorrar\n• Responder dudas sobre el plan de pago de deudas\n• Motivarte cuando lo necesites\n\n¿En qué te puedo ayudar hoy?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          systemContext: SYSTEM_CONTEXT,
        }),
      });

      if (!response.ok) throw new Error('Error en la respuesta');

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-white">Asistente Financiero</h2>
          <p className="text-xs text-white/40">Powered by Claude</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-white/40">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-blue-500'
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-tr-sm'
                  : 'bg-white/10 text-white rounded-tl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm text-white/50">Pensando...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="pt-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
