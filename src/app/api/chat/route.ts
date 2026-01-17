import { NextResponse } from 'next/server';

const SYSTEM_CONTEXT = `Eres un asistente financiero personal para Alejandra y Ricardo. Responde SIEMPRE en español y de forma MUY breve (1-2 oraciones max).

CONTEXTO:
- Presupuesto por persona: $5,000/mes (Alejandra, Ricardo, Compartido)
- Vales de despensa: $4,800/mes (solo súper/frutas)
- Deuda total: ~$491,000 MXN

COMANDOS (usa EXACTAMENTE este formato):

REGISTRAR GASTO:
[GASTO:monto:categoria:descripcion:titular:tipo]
- titular: alejandra, ricardo, o compartido
- tipo: variable, vales, o fijo
- Ejemplo: [GASTO:200:restaurantes:Tacos:ricardo:variable]

CORREGIR/BORRAR:
[BORRAR:ultimo] - Borra el último gasto registrado
[BORRAR:palabra] - Borra el gasto más reciente que contenga esa palabra
[CORREGIR_ULTIMO:campo:valor] - Corrige el último gasto sin pedir ID
- Campos: monto, titular, categoria, descripcion
- Ejemplo: [CORREGIR_ULTIMO:titular:alejandra]
- Ejemplo: [CORREGIR_ULTIMO:monto:350]

CONSULTAS:
[PRESUPUESTO] - Ver cuánto queda de cada presupuesto
[DEUDAS] - Ver lista de deudas
[RESUMEN] - Resumen general

DEUDAS:
[PAGO_DEUDA:nombre:monto] - Registrar pago a deuda
[SIMULAR:monto] - Simular pago extra

REGLAS IMPORTANTES:
1. Si dicen "me equivoqué", "está mal", "era de X no de Y" → usa [CORREGIR_ULTIMO:campo:valor] o [BORRAR:ultimo]
2. NUNCA pidas IDs al usuario. Usa [CORREGIR_ULTIMO] para corregir el último gasto.
3. "súper", "HEB", "Soriana", "despensa" → tipo: vales
4. "renta", "luz", "gas" → tipo: fijo
5. Si no especifican titular → compartido
6. Sé MUY conciso. No expliques los comandos, solo úsalos.`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        if (claudeMessages.length === 0 && msg.role === 'assistant') continue;
        if (claudeMessages.length > 0 && claudeMessages[claudeMessages.length - 1].role === msg.role) continue;
        claudeMessages.push({ role: msg.role, content: msg.content });
      }
    }

    if (claudeMessages.length === 0 || claudeMessages[claudeMessages.length - 1].role !== 'user') {
      return NextResponse.json({ message: 'Por favor escribe tu mensaje.' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        system: SYSTEM_CONTEXT,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', response.status, errorData);
      return NextResponse.json({ error: 'Error de API' }, { status: response.status });
    }

    const data = await response.json();
    const textBlock = data.content?.find((block: any) => block.type === 'text');
    const assistantMessage = textBlock?.text || 'Entendido.';

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('Error:', error?.message || error);
    return NextResponse.json({ error: 'Error procesando' }, { status: 500 });
  }
}
