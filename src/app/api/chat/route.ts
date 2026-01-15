import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages, systemContext } = await request.json();

    // Filtrar solo mensajes de usuario y asistente (no el mensaje inicial del sistema)
    const claudeMessages = messages
      .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Asegurar que el primer mensaje sea del usuario
    if (claudeMessages.length === 0 || claudeMessages[0].role !== 'user') {
      return NextResponse.json({
        message: '¡Hola! ¿En qué te puedo ayudar con tus finanzas?'
      });
    }

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
