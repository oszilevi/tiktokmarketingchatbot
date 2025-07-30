import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { detail: "Message cannot be empty" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a helpful TikTok content creation assistant. You help users create engaging TikTok content, provide tips, and give creative suggestions. 

Your responses should be:
- Engaging and conversational
- Focused on TikTok content creation
- Helpful with practical tips
- Creative and inspiring

User: demo_user`;

    try {
      const stream = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
        stream: true
      });

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                const data = `data: ${JSON.stringify({ chunk: content })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
            
            const doneData = `data: {"done": true}\n\n`;
            controller.enqueue(encoder.encode(doneData));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            const errorData = `data: ${JSON.stringify({ error: 'Failed to get response' })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        }
      });

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });

    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      const encoder = new TextEncoder();
      const fallbackMessage = `I'm having trouble connecting to my AI brain right now. But I can still help you with TikTok content! You said: '${message}'. What kind of TikTok content are you looking to create?`;
      
      const readableStream = new ReadableStream({
        start(controller) {
          const data = `data: ${JSON.stringify({ chunk: fallbackMessage })}\n\n`;
          controller.enqueue(encoder.encode(data));
          const doneData = `data: {"done": true}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();
        }
      });

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }
  } catch (error) {
    console.error('Chat stream endpoint error:', error);
    return NextResponse.json(
      { detail: "Failed to process message" },
      { status: 500 }
    );
  }
}