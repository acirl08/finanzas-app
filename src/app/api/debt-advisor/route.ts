import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit';

interface DebtData {
  deudaTotal: number;
  deudaInicial: number;
  porcentajePagado: number;
  disponibleParaDeudas: number;
  pagosMinimos: number;
  excedente: number;
  deudasOrdenadas: Array<{
    id: string;
    nombre: string;
    saldoActual: number;
    cat: number;
    pagoMinimo: number;
  }>;
  interesesMensuales: number;
  cantidadDeudas: number;
}

export async function POST(request: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(`debt-advisor-${clientId}`, RATE_LIMITS.expensive);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Demasiadas solicitudes. Espera un momento.' },
      { status: 429 }
    );
  }

  try {
    const data: DebtData = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    const prompt = buildPrompt(data);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1000,
          system: `Eres un experto en finanzas personales especializado en estrategias de pago de deudas. Conoces los métodos avalancha (mayor CAT primero) y bola de nieve (menor saldo primero).

IMPORTANTE: Responde SIEMPRE en JSON válido con esta estructura exacta:
{
  "analisis": "análisis de la situación actual (2-3 oraciones)",
  "estrategia": "estrategia específica recomendada con pasos claros",
  "ordenPago": ["deuda1", "deuda2", "deuda3"],
  "ahorroIntereses": "cuánto pueden ahorrar en intereses siguiendo la estrategia",
  "motivacion": "mensaje motivacional corto"
}

Sé directo, usa números concretos y habla en español mexicano.`,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Claude API error:', response.status);
        return NextResponse.json({ success: false, error: 'Error del servicio de IA' });
      }

      const result = await response.json();
      const textBlock = result.content?.find((block: any) => block.type === 'text');
      const responseText = textBlock?.text || '';

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, analysis });
        }
        throw new Error('No se encontró JSON válido');
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return NextResponse.json({
          success: true,
          analysis: {
            analisis: 'Tienes múltiples deudas activas. Es importante mantener un plan de pago consistente.',
            estrategia: 'Usa el método avalancha: paga mínimos en todas las deudas y destina el excedente a la deuda con mayor CAT.',
            ordenPago: data.deudasOrdenadas.slice(0, 3).map(d => d.nombre),
            ahorroIntereses: 'Siguiendo esta estrategia puedes ahorrar miles de pesos en intereses.',
            motivacion: 'Cada pago te acerca más a tu libertad financiera.'
          }
        });
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ success: false, error: 'Tiempo de espera agotado' });
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error in debt advisor API:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
  }
}

function buildPrompt(data: DebtData): string {
  const {
    deudaTotal,
    porcentajePagado,
    disponibleParaDeudas,
    pagosMinimos,
    excedente,
    deudasOrdenadas,
    interesesMensuales,
    cantidadDeudas
  } = data;

  const deudasTexto = deudasOrdenadas
    .map((d, idx) => `${idx + 1}. ${d.nombre}: $${d.saldoActual.toLocaleString()} (CAT ${d.cat}%, mínimo $${d.pagoMinimo.toLocaleString()})`)
    .join('\n');

  return `Analiza esta situación de deudas de una familia mexicana y recomienda la mejor estrategia:

RESUMEN:
- Deuda total: $${deudaTotal.toLocaleString()} MXN
- Progreso: ${porcentajePagado.toFixed(1)}% pagado
- Deudas activas: ${cantidadDeudas}
- Intereses mensuales aprox: $${Math.round(interesesMensuales).toLocaleString()}

CAPACIDAD DE PAGO:
- Disponible para deudas: $${disponibleParaDeudas.toLocaleString()}/mes
- Pagos mínimos totales: $${pagosMinimos.toLocaleString()}/mes
- Excedente para atacar deuda: $${Math.max(0, excedente).toLocaleString()}/mes

DEUDAS (ordenadas por CAT):
${deudasTexto}

META: Liquidar toda la deuda para enero 2027

Considera:
1. ¿Es mejor método avalancha o bola de nieve para ellos?
2. ¿Qué deuda atacar primero y por qué?
3. ¿Cuánto pueden ahorrar en intereses con la estrategia correcta?
4. ¿Alguna recomendación especial dado el CAT alto de algunas tarjetas?

Responde en formato JSON.`;
}
