import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages, systemContext } = await request.json();

    // Construir el historial de mensajes para Claude
    // Necesitamos alternar user/assistant, empezando con user
    const claudeMessages: Array<{role: 'user' | 'assistant', content: string}> = [];

    for (const msg of messages) {
      // Solo incluir mensajes de usuario y asistente
      if (msg.role === 'user' || msg.role === 'assistant') {
        // Si es el primer mensaje y no es del usuario, lo saltamos
        if (claudeMessages.length === 0 && msg.role === 'assistant') {
          continue;
        }
        // Evitar duplicados consecutivos del mismo rol
        if (claudeMessages.length > 0 && claudeMessages[claudeMessages.length - 1].role === msg.role) {
          continue;
        }
        claudeMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Si no hay mensajes válidos, retornar error
    if (claudeMessages.length === 0) {
      return NextResponse.json({
        message: 'Por favor escribe una pregunta para que pueda ayudarte.'
      });
    }

    // Asegurar que termine con un mensaje de usuario
    if (claudeMessages[claudeMessages.length - 1].role !== 'user') {
      return NextResponse.json({
        message: 'Por favor escribe una pregunta.'
      });
    }

    console.log('Sending to Claude:', JSON.stringify(claudeMessages, null, 2));

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemContext,
      messages: claudeMessages,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('Error calling Claude API:', error?.message || error);
    return NextResponse.json(
      { error: 'Error processing request', details: error?.message },
      { status: 500 }
    );
  }
}
