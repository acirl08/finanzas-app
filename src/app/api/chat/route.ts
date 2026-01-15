import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { messages, systemContext } = await request.json();

    // Construir el historial de mensajes para Claude
    const claudeMessages: Array<{role: 'user' | 'assistant', content: string}> = [];

    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        if (claudeMessages.length === 0 && msg.role === 'assistant') {
          continue;
        }
        if (claudeMessages.length > 0 && claudeMessages[claudeMessages.length - 1].role === msg.role) {
          continue;
        }
        claudeMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    if (claudeMessages.length === 0 || claudeMessages[claudeMessages.length - 1].role !== 'user') {
      return NextResponse.json({
        message: 'Por favor escribe una pregunta.'
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemContext,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Claude API error', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text || 'No response';

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Error processing request', details: error?.message },
      { status: 500 }
    );
  }
}
