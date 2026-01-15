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
      content: '¡Hola! 👋 Soy tu asistente financiero. Puedo ayudarte con:\n\n• Revisar si un gasto está dentro del presupuesto\n• Darte consejos sobre cómo ahorrar\n• Responder dudas sobre el plan de pago de deudas\n• Motivarte cuando lo necesites\n\n¿En qué te puedo ayudar hoy?',
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
    <div className="card flex flex-col h-[600px]">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 bg-purple-100 rounded-full">
          <Bot className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="font-bold">Asistente Financiero</h2>
          <p className="text-xs text-gray-500">Powered by Claude</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`p-2 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' ? 'bg-blue-100' : 'bg-purple-100'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-blue-600" />
              ) : (
                <Bot className="w-4 h-4 text-purple-600" />
              )}
            </div>
            <div
              className={`rounded-2xl px-4 py-2 max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center bg-purple-100">
              <Bot className="w-4 h-4 text-purple-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="pt-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            className="input flex-1"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn-primary px-4"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Ejemplos: "¿Puedo comprar algo de $500?" • "¿Cómo vamos con las deudas?" • "Dame motivación"
        </p>
      </form>
    </div>
  );
}
