import { NextResponse } from 'next/server';

interface FinancialData {
  gastosPorTitular: {
    alejandra: number;
    ricardo: number;
    compartido: number;
  };
  gastosPorCategoria: Record<string, number>;
  deudaTotal: number;
  presupuestos: {
    alejandra: number;
    ricardo: number;
    compartido: number;
  };
}

export async function POST(request: Request) {
  try {
    const data: FinancialData = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    // Construir el prompt con los datos financieros
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
          system: `Eres un asesor financiero personal experto. Analizas gastos familiares y das recomendaciones prácticas y directas.

IMPORTANTE: Responde SIEMPRE en JSON válido con esta estructura exacta:
{
  "analisis": "texto del análisis (2-3 oraciones)",
  "recomendaciones": ["recomendación 1", "recomendación 2", "recomendación 3"],
  "consecuencias": "texto de consecuencias (1-2 oraciones)",
  "motivacion": "mensaje motivacional corto"
}

Sé directo, específico y usa números concretos. Habla en español.`,
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

      // Parsear la respuesta JSON
      try {
        // Intentar extraer JSON del texto (puede tener texto adicional)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, analysis });
        }
        throw new Error('No se encontró JSON válido en la respuesta');
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError, responseText);
        // Respuesta de fallback
        return NextResponse.json({
          success: true,
          analysis: {
            analisis: 'No se pudo generar un análisis detallado en este momento.',
            recomendaciones: [
              'Revisa tus gastos del mes',
              'Compara con tu presupuesto',
              'Identifica áreas de mejora'
            ],
            consecuencias: 'Sin un seguimiento adecuado, es difícil alcanzar tus metas financieras.',
            motivacion: 'Cada pequeño paso cuenta hacia tu libertad financiera.'
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
    console.error('Error in advisor API:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
  }
}

function buildPrompt(data: FinancialData): string {
  const { gastosPorTitular, gastosPorCategoria, deudaTotal, presupuestos } = data;

  // Calcular disponibles
  const disponibles = {
    alejandra: presupuestos.alejandra - gastosPorTitular.alejandra,
    ricardo: presupuestos.ricardo - gastosPorTitular.ricardo,
    compartido: presupuestos.compartido - gastosPorTitular.compartido,
  };

  // Formatear categorías
  const categoriasTexto = Object.entries(gastosPorCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cat, monto]) => `- ${cat}: $${monto.toLocaleString()}`)
    .join('\n');

  return `Analiza estos datos financieros de una familia mexicana:

PRESUPUESTOS PERSONALES (solo gustos, no esenciales):
- Alejandra: $${presupuestos.alejandra.toLocaleString()}/mes - Gastado: $${gastosPorTitular.alejandra.toLocaleString()} - Disponible: $${disponibles.alejandra.toLocaleString()}
- Ricardo: $${presupuestos.ricardo.toLocaleString()}/mes - Gastado: $${gastosPorTitular.ricardo.toLocaleString()} - Disponible: $${disponibles.ricardo.toLocaleString()}
- Compartido: $${presupuestos.compartido.toLocaleString()}/mes - Gastado: $${gastosPorTitular.compartido.toLocaleString()} - Disponible: $${disponibles.compartido.toLocaleString()}

GASTOS POR CATEGORÍA (este mes):
${categoriasTexto || '(Sin gastos registrados)'}

DEUDA TOTAL: $${deudaTotal.toLocaleString()} MXN
Meta: Liquidar toda la deuda para enero 2027

Responde con el análisis en formato JSON.`;
}
