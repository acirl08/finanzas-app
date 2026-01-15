'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, MessageCircle, Minimize2, CheckCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Gasto {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  categoria: string;
  titular: string;
}

const SYSTEM_CONTEXT = `Eres un asistente financiero personal para Alejandra y Ricardo, una pareja en México que está trabajando para salir de deudas.

CONTEXTO FINANCIERO:
- Ingreso mensual combinado: $109,000 MXN
- Vales de despensa: $4,800 (para comida)
- Deuda total inicial: $491,442 MXN
- Disponible mensual para pagar deuda extra: $38,450 MXN
- Meta: Libres de deudas de tarjetas para noviembre 2026
- Presupuesto mensual para gastos variables: $15,000 MXN

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

GASTOS FIJOS MENSUALES:
- Renta: $12,700
- Carro: $13,000
- Crédito personal: $6,000
- Gasolina: $1,500
- Luz: $1,250
- Gas: $450
- Suscripciones: $3,551

REGLAS IMPORTANTES:
1. Responde en español, de forma breve y directa (máximo 3 párrafos)
2. Si el usuario quiere registrar un gasto, extrae: monto, descripción, categoría (comida/transporte/entretenimiento/salud/hogar/servicios/otros), y quién gastó (alejandra/ricardo/compartido)
3. Para registrar un gasto, DEBES responder con el formato EXACTO:
   [REGISTRAR_GASTO]{"monto":500,"descripcion":"Cine","categoria":"entretenimiento","titular":"compartido"}[/REGISTRAR_GASTO]
   Seguido de tu confirmación amigable.
4. Si no está claro algún dato del gasto, pregunta antes de registrar
5. Si preguntan si pueden gastar algo, evalúa si está dentro del presupuesto de $15,000 para gastos variables
6. Motívalos pero sé realista
7. Recuérdales que NO deben usar tarjetas de crédito`;

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente financiero. Puedo ayudarte a:\n• Registrar gastos (ej: "Gasté $200 en comida")\n• Evaluar si puedes comprar algo\n• Responder dudas sobre el plan\n\n¿En qué te ayudo?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [lastGastoRegistrado, setLastGastoRegistrado] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [messages, isOpen]);

  // Función para registrar gasto
  const registrarGasto = (gastoData: Omit<Gasto, 'id' | 'fecha'>) => {
    const gasto: Gasto = {
      ...gastoData,
      id: Date.now().toString(),
      fecha: new Date().toISOString().split('T')[0],
    };

    const existingGastos = JSON.parse(localStorage.getItem('finanzas-gastos') || '[]');
    existingGastos.push(gasto);
    localStorage.setItem('finanzas-gastos', JSON.stringify(existingGastos));

    setLastGastoRegistrado(gasto.descripcion);
    setTimeout(() => setLastGastoRegistrado(null), 3000);

    return gasto;
  };

  // Procesar respuesta del asistente para detectar gastos
  const processAssistantResponse = (response: string): string => {
    const gastoRegex = /\[REGISTRAR_GASTO\](.*?)\[\/REGISTRAR_GASTO\]/;
    const match = response.match(gastoRegex);

    if (match) {
      try {
        const gastoData = JSON.parse(match[1]);
        registrarGasto(gastoData);
        // Quitar el tag de la respuesta mostrada
        return response.replace(gastoRegex, '').trim();
      } catch (e) {
        console.error('Error parsing gasto:', e);
      }
    }

    return response;
  };

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
      const processedMessage = processAssistantResponse(data.message);
      setMessages((prev) => [...prev, { role: 'assistant', content: processedMessage }]);
      if (!isOpen) setHasUnread(true);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, hubo un error. Intenta de nuevo.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    'Gasté $500 en comida',
    '¿Puedo gastar $300?',
    '¿Cómo vamos?',
  ];

  return (
    <>
      {/* Notificación de gasto registrado */}
      {lastGastoRegistrado && (
        <div className="fixed bottom-24 right-4 lg:right-8 z-50 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Gasto registrado: {lastGastoRegistrado}</span>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-4 lg:right-8 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden transition-all duration-300 ${
            isMinimized ? 'h-14' : 'h-[500px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Asistente</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-white/50">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Minimize2 className="w-4 h-4 text-white/60" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[360px]">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user'
                          ? 'bg-blue-500'
                          : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-3 h-3 text-white" />
                      ) : (
                        <Bot className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div
                      className={`rounded-xl px-3 py-2 max-w-[85%] ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-white/10 rounded-xl px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              {messages.length <= 2 && (
                <div className="px-4 pb-2 flex gap-2 flex-wrap">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(action)}
                      className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-3 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe o registra un gasto..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className={`fixed bottom-6 right-4 lg:right-8 z-50 w-14 h-14 rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 ${
          isOpen
            ? 'bg-white/10 backdrop-blur-xl border border-white/20'
            : 'bg-gradient-to-r from-purple-500 to-pink-500'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6 text-white" />
            {hasUnread && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                1
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
}
