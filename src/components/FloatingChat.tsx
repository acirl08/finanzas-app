'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, MessageCircle, Minimize2, CheckCircle, AlertCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Sanitize user input to prevent basic XSS
function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 500) // Limit length
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente financiero.\n\n• "Gasté $200 en comida"\n• "Pagamos la renta $12,700"\n• "Quita el último gasto"\n• "¿Qué he gastado?"\n\n¿En qué te ayudo?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
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

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Procesar respuesta y ejecutar acciones
  const processResponse = async (response: string): Promise<string> => {
    let cleanResponse = response;

    // 1. Procesar GASTO
    const gastoRegex = /\[GASTO:(\d+(?:\.\d+)?):([^:]+):([^:]+):([^:]+):([^\]]+)\]/;
    const gastoMatch = response.match(gastoRegex);

    if (gastoMatch) {
      const [, monto, categoria, descripcion, titular, tipo] = gastoMatch;
      const esFijo = tipo === 'fijo';
      const conVales = tipo === 'vales';

      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'registrar_gasto',
            params: { monto: Number(monto), categoria, descripcion, titular, esFijo, conVales }
          })
        });
        const data = await res.json();
        if (data.success) {
          const icono = esFijo ? '📋 Fijo' : (conVales ? '🏷️ Vales' : '💸 Variable');
          showNotification(`${icono}: $${monto} - ${descripcion}`, 'success');
        } else {
          showNotification(data.error || 'Error al guardar', 'error');
        }
      } catch (e) {
        showNotification('Error de conexión', 'error');
      }
      cleanResponse = response.replace(gastoRegex, '').trim();
    }

    // 2. Procesar BORRAR (ultimo o por descripción)
    const borrarRegex = /\[BORRAR:([^\]]+)\]/;
    const borrarMatch = response.match(borrarRegex);
    if (borrarMatch) {
      const [, target] = borrarMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: target === 'ultimo' ? 'borrar_ultimo_gasto' : 'borrar_gasto_por_descripcion',
            params: { descripcion: target }
          })
        });
        const data = await res.json();
        showNotification(data.success ? (data.message || 'Eliminado') : (data.error || 'No encontrado'), data.success ? 'success' : 'error');
      } catch (e) {
        showNotification('Error de conexión', 'error');
      }
      cleanResponse = response.replace(borrarRegex, '').trim();
    }

    // 3. Procesar BORRAR_ID
    const borrarIdRegex = /\[BORRAR_ID:([^\]]+)\]/;
    const borrarIdMatch = response.match(borrarIdRegex);
    if (borrarIdMatch) {
      const [, gastoId] = borrarIdMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'borrar_gasto', params: { gastoId } })
        });
        const data = await res.json();
        showNotification(data.success ? 'Gasto eliminado' : (data.error || 'Error'), data.success ? 'success' : 'error');
      } catch (e) {
        showNotification('Error de conexión', 'error');
      }
      cleanResponse = response.replace(borrarIdRegex, '').trim();
    }

    // 4. Procesar VER_ULTIMOS
    const verUltimosRegex = /\[VER_ULTIMOS:(\d+)\]/;
    const verUltimosMatch = response.match(verUltimosRegex);
    if (verUltimosMatch) {
      const [, cantidad] = verUltimosMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ver_ultimos_gastos', params: { cantidad: parseInt(cantidad) } })
        });
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          const gastosTexto = data.data.map((g: any) => `• $${g.monto} - ${g.descripcion}\n  ID: ${g.id}`).join('\n');
          cleanResponse = `Últimos ${cantidad} gastos:\n${gastosTexto}`;
        } else {
          cleanResponse = 'No hay gastos registrados.';
        }
      } catch (e) {
        cleanResponse = 'Error al obtener gastos.';
      }
    }

    // 5. Procesar LISTAR gastos
    const listarRegex = /\[LISTAR:gastos\]/;
    if (response.match(listarRegex)) {
      try {
        const res = await fetch('/api/finanzas');
        const data = await res.json();
        if (data.success && data.data.gastosMes?.length > 0) {
          const gastosTexto = data.data.gastosMes.slice(0, 5).map((g: any) => `• $${g.monto} - ${g.descripcion}`).join('\n');
          cleanResponse = `Gastos del mes:\n${gastosTexto}\n\nTotal: $${data.data.totalGastadoMes?.toLocaleString() || 0}`;
        } else {
          cleanResponse = 'No hay gastos este mes.';
        }
      } catch (e) {
        cleanResponse = 'Error al obtener gastos.';
      }
    }

    // 6. Procesar RESUMEN
    const resumenRegex = /\[RESUMEN\]/;
    if (response.match(resumenRegex)) {
      try {
        const res = await fetch('/api/finanzas');
        const data = await res.json();
        if (data.success) {
          const d = data.data;
          cleanResponse = `📊 Resumen del mes:\n\n💰 Presupuesto: $${d.disponible?.toLocaleString() || 0} de $${d.presupuestoVariable?.toLocaleString()}\n🏷️ Vales: $${d.disponibleVales?.toLocaleString() || 0} de $${d.presupuestoVales?.toLocaleString()}\n📉 Deuda total: $${d.deudaTotal?.toLocaleString() || 0}\n\nGastado este mes: $${d.totalGastadoMes?.toLocaleString() || 0}`;
        } else {
          cleanResponse = 'Error obteniendo resumen.';
        }
      } catch (e) {
        cleanResponse = 'Error de conexión.';
      }
    }

    // 7. Procesar PRESUPUESTO
    const presupuestoRegex = /\[PRESUPUESTO\]/;
    if (response.match(presupuestoRegex)) {
      try {
        const res = await fetch('/api/finanzas');
        const data = await res.json();
        if (data.success) {
          const d = data.data;
          cleanResponse = `💵 Presupuesto disponible:\n\n• Variable: $${d.disponible?.toLocaleString()} de $${d.presupuestoVariable?.toLocaleString()}\n• Vales: $${d.disponibleVales?.toLocaleString()} de $${d.presupuestoVales?.toLocaleString()}\n\nGastos variables: $${d.totalGastosVariables?.toLocaleString() || 0}\nGastos con vales: $${d.totalGastosConVales?.toLocaleString() || 0}`;
        }
      } catch (e) {
        cleanResponse = 'Error de conexión.';
      }
    }

    // 8. Procesar DEUDAS
    const deudasRegex = /\[DEUDAS\]/;
    if (response.match(deudasRegex)) {
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'listar_deudas', params: {} })
        });
        const data = await res.json();
        if (data.success) {
          const deudasTexto = data.data.deudas.slice(0, 5).map((d: any, i: number) => `${i + 1}. ${d.nombre}: $${d.saldo.toLocaleString()} (${d.cat}% CAT)`).join('\n');
          cleanResponse = `📋 Deudas (${data.data.cantidadDeudas} total):\n\n${deudasTexto}\n\n💰 Total: $${data.data.deudaTotal.toLocaleString()}`;
        }
      } catch (e) {
        cleanResponse = 'Error al obtener deudas.';
      }
    }

    // 9. Procesar PROYECCION
    const proyeccionRegex = /\[PROYECCION\]/;
    if (response.match(proyeccionRegex)) {
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'proyeccion_libertad', params: {} })
        });
        const data = await res.json();
        if (data.success) {
          const d = data.data;
          const proximas = d.proximasLiquidaciones.map((p: any) => `• ${p.nombre}: ${p.fechaEstimada}`).join('\n');
          cleanResponse = `🎯 Proyección de libertad:\n\n📅 Fecha estimada: ${d.fechaLibertad}\n⏱️ Meses restantes: ${d.mesesRestantes}\n💰 Deuda total: $${d.deudaTotal.toLocaleString()}\n\nPróximas liquidaciones:\n${proximas}`;
        }
      } catch (e) {
        cleanResponse = 'Error al calcular proyección.';
      }
    }

    // 10. Procesar CATEGORIA
    const categoriaRegex = /\[CATEGORIA:([^\]]+)\]/;
    const categoriaMatch = response.match(categoriaRegex);
    if (categoriaMatch) {
      const [, categoria] = categoriaMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'gastos_por_categoria', params: { categoria } })
        });
        const data = await res.json();
        if (data.success) {
          cleanResponse = `📂 Gastos en "${categoria}":\n\nTotal: $${data.data.total.toLocaleString()}\nTransacciones: ${data.data.cantidad}`;
        }
      } catch (e) {
        cleanResponse = 'Error al buscar categoría.';
      }
    }

    // 11. Procesar TITULAR
    const titularRegex = /\[TITULAR:([^\]]+)\]/;
    const titularMatch = response.match(titularRegex);
    if (titularMatch) {
      const [, titular] = titularMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'gastos_por_titular', params: { titular } })
        });
        const data = await res.json();
        if (data.success) {
          cleanResponse = `👤 Gastos de ${titular}:\n\nTotal: $${data.data.total.toLocaleString()}\nTransacciones: ${data.data.cantidad}`;
        }
      } catch (e) {
        cleanResponse = 'Error al buscar titular.';
      }
    }

    // 12. Procesar PAGO_DEUDA
    const pagoDeudaRegex = /\[PAGO_DEUDA:([^:]+):(\d+(?:\.\d+)?)\]/;
    const pagoDeudaMatch = response.match(pagoDeudaRegex);
    if (pagoDeudaMatch) {
      const [, deudaNombre, monto] = pagoDeudaMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'registrar_pago_deuda', params: { deudaNombre, monto: parseFloat(monto) } })
        });
        const data = await res.json();
        showNotification(data.success ? data.message : (data.error || 'Error'), data.success ? 'success' : 'error');
      } catch (e) {
        showNotification('Error de conexión', 'error');
      }
      cleanResponse = response.replace(pagoDeudaRegex, '').trim();
    }

    // 13. Procesar SIMULAR
    const simularRegex = /\[SIMULAR:(\d+(?:\.\d+)?)\]/;
    const simularMatch = response.match(simularRegex);
    if (simularMatch) {
      const [, montoExtra] = simularMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'simular_pago_extra', params: { montoExtra: parseFloat(montoExtra) } })
        });
        const data = await res.json();
        if (data.success) {
          const d = data.data;
          cleanResponse = `🧮 Simulación con $${d.montoExtra.toLocaleString()} extra/mes:\n\n📅 Libertad actual: ${d.fechaLibertadSinExtra}\n📅 Nueva fecha: ${d.fechaLibertadConExtra}\n⏱️ Meses ahorrados: ${d.mesesAhorrados}\n💰 Interés ahorrado: ~$${d.interesAhorrado.toLocaleString()}`;
        }
      } catch (e) {
        cleanResponse = 'Error en simulación.';
      }
    }

    // 14. Procesar EDITAR_GASTO
    const editarRegex = /\[EDITAR_GASTO:([^:]+):([^:]+):([^\]]+)\]/;
    const editarMatch = response.match(editarRegex);
    if (editarMatch) {
      const [, gastoId, campo, valor] = editarMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'editar_gasto', params: { gastoId, campo, valor } })
        });
        const data = await res.json();
        showNotification(data.success ? data.message : (data.error || 'Error'), data.success ? 'success' : 'error');
      } catch (e) {
        showNotification('Error de conexión', 'error');
      }
      cleanResponse = response.replace(editarRegex, '').trim();
    }

    // 15. Procesar CORREGIR_ULTIMO (corrige el último gasto sin necesidad de ID)
    const corregirUltimoRegex = /\[CORREGIR_ULTIMO:([^:]+):([^\]]+)\]/;
    const corregirUltimoMatch = response.match(corregirUltimoRegex);
    if (corregirUltimoMatch) {
      const [, campo, valor] = corregirUltimoMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'corregir_ultimo_gasto', params: { campo, valor } })
        });
        const data = await res.json();
        showNotification(data.success ? data.message : (data.error || 'Error'), data.success ? 'success' : 'error');
      } catch (e) {
        showNotification('Error de conexión', 'error');
      }
      cleanResponse = response.replace(corregirUltimoRegex, '').trim();
    }

    // 16. Procesar META (crear meta de ahorro)
    const metaRegex = /\[META:([^:]+):(\d+(?:\.\d+)?)\]/;
    const metaMatch = response.match(metaRegex);
    if (metaMatch) {
      const [, nombre, montoObjetivo] = metaMatch;
      try {
        const res = await fetch('/api/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'crear_meta_ahorro', params: { nombre, montoObjetivo: parseFloat(montoObjetivo) } })
        });
        const data = await res.json();
        showNotification(data.success ? `Meta "${nombre}" creada` : (data.error || 'Error'), data.success ? 'success' : 'error');
      } catch (e) {
        showNotification('Error de conexión', 'error');
      }
      cleanResponse = response.replace(metaRegex, '').trim();
    }

    return cleanResponse || response;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeInput(input);
    if (!sanitized || isLoading) return;

    const userMessage = sanitized;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      if (!response.ok) throw new Error('Error');

      const data = await response.json();
      const processedMessage = await processResponse(data.message);
      setMessages((prev) => [...prev, { role: 'assistant', content: processedMessage }]);
      if (!isOpen) setHasUnread(true);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    '¿Cuánto me queda?',
    '¿Cómo van las deudas?',
    'Resumen del mes',
    'Ver últimos 5 gastos',
    '¿Cuánto en restaurantes?',
    'Simular pago extra de $5000',
  ];

  return (
    <>
      {/* Chat window */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-4 lg:right-8 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-surface border border-ink-100 rounded-xl shadow-lift overflow-hidden transition-all duration-200 ${
            isMinimized ? 'h-14' : 'h-[480px]'
          } flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-sage-500 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-ink-900 leading-tight">Asistente</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                  <span className="text-[11px] text-ink-400">En línea</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-md text-ink-400 hover:text-ink-900 hover:bg-subtle transition-colors"
                aria-label="Minimizar"
              >
                <Minimize2 className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md text-ink-400 hover:text-ink-900 hover:bg-subtle transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Notificación inline */}
              {notification && (
                <div
                  className={`mx-3 mt-2 px-3 py-2 rounded-md flex items-center gap-2 text-[13px] ${
                    notification.type === 'success'
                      ? 'bg-sage-50 border border-sage-100 text-sage-700'
                      : 'bg-clay-50 border border-clay-100 text-clay-600'
                  }`}
                >
                  {notification.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  )}
                  <span className="truncate">{notification.message}</span>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        message.role === 'user' ? 'bg-ink-900' : 'bg-sage-500'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-3 h-3 text-white" strokeWidth={2} />
                      ) : (
                        <Bot className="w-3 h-3 text-white" strokeWidth={2} />
                      )}
                    </div>
                    <div
                      className={`rounded-lg px-3 py-2 max-w-[85%] ${
                        message.role === 'user'
                          ? 'bg-ink-900 text-app'
                          : 'bg-subtle text-ink-900'
                      }`}
                    >
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-sage-500 mt-0.5">
                      <Bot className="w-3 h-3 text-white" strokeWidth={2} />
                    </div>
                    <div className="bg-subtle rounded-lg px-3 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick actions */}
              {messages.length <= 2 && (
                <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                  {quickActions.slice(0, 4).map((action, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(action)}
                      className="text-[11px] px-2.5 py-1 bg-subtle hover:bg-ink-100 rounded-full text-ink-500 hover:text-ink-900 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-3 border-t border-ink-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu mensaje…"
                    className="field text-[14px]"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="btn btn-primary px-3"
                    aria-label="Enviar"
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <div className="fixed bottom-6 right-4 lg:right-8 z-50">
        {!isOpen && messages.length <= 1 && (
          <div className="absolute bottom-full right-0 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-surface border border-ink-100 rounded-lg px-3.5 py-2 shadow-lift whitespace-nowrap">
              <p className="text-[13px] text-ink-900 font-medium">"Gasté $80 en café"</p>
              <p className="text-[11px] text-ink-400 mt-0.5">Escríbelo como si fuera WhatsApp</p>
            </div>
            <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-surface border-r border-b border-ink-100 transform rotate-45" />
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
          aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
          className={`relative w-12 h-12 rounded-full shadow-lift flex items-center justify-center transition-transform hover:scale-[1.03] ${
            isOpen
              ? 'bg-surface border border-ink-200 text-ink-900'
              : 'bg-sage-500 text-white hover:bg-sage-600'
          }`}
        >
          {isOpen ? (
            <X className="w-5 h-5" strokeWidth={2} />
          ) : (
            <>
              <MessageCircle className="w-5 h-5" strokeWidth={2} />
              {hasUnread && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-clay-500 rounded-full flex items-center justify-center text-[10px] text-white font-semibold border-2 border-app">
                  1
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </>
  );
}
