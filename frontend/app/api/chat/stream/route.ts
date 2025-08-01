import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
});

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!message || !message.trim()) {
      return NextResponse.json(
        { detail: "Message cannot be empty" },
        { status: 400 }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { detail: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { detail: "Invalid token" },
        { status: 401 }
      );
    }

    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';

    const systemPrompt = `You are a helpful TikTok content creation assistant. You help users create engaging TikTok content, provide tips, and give creative suggestions. 

Your responses should be:
- Engaging and conversational
- Focused on TikTok content creation
- Helpful with practical tips
- Creative and inspiring

User: ${username}`;

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
      let fullResponse = '';

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                const data = `data: ${JSON.stringify({ chunk: content })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
            
            // Save the complete message to database after streaming
            const { data: savedMessage } = await supabase
              .from('messages')
              .insert({
                user_id: user.id,
                session_id: sessionId,
                content: message,
                response: fullResponse
              })
              .select()
              .single();

            // Update session's updated_at timestamp and create a note if it's the first message
            if (sessionId) {
              await supabase
                .from('chat_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', sessionId)
                .eq('user_id', user.id);

              // Check if this is the first message in the session
              const { data: messageCount } = await supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('session_id', sessionId);

              // Create a session summary note if this is the first or few messages
              if (messageCount && (messageCount as any).length === 1) {
                await supabase
                  .from('notes')
                  .insert({
                    session_id: sessionId,
                    title: "Session Summary",
                    content: `Chat started with: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`
                  });
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
      
      // Save fallback message to database
      await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          content: message,
          response: fallbackMessage
        });
      
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