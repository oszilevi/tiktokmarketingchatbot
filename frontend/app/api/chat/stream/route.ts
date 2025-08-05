import { NextRequest, NextResponse } from 'next/server';
import { createUserScopedClient } from '@/lib/supabase-server';

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

    // Create user-scoped Supabase client
    const supabase = createUserScopedClient(token);

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { detail: "Invalid token" },
        { status: 401 }
      );
    }

    // const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user'; // Not needed for placeholder responses

    // Placeholder responses for different types of questions
    const placeholderResponses = [
      "That's a great question about TikTok content! Here are some tips to help you create engaging videos that could go viral...",
      "I love your enthusiasm for TikTok creation! Let me share some trending ideas that are perfect for your style...",
      "Excellent thinking! For TikTok success, remember to focus on the first 3 seconds - they're crucial for viewer retention...",
      "Your content strategy sounds amazing! Here's how you can optimize it for maximum engagement on TikTok...",
      "That's a creative approach! TikTok's algorithm loves authentic content, so keep being yourself while following these best practices..."
    ];

    // Select a random response
    const selectedResponse = placeholderResponses[Math.floor(Math.random() * placeholderResponses.length)];

    try {
      const encoder = new TextEncoder();
      let fullResponse = '';

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Wait 1 second to show thinking animation
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simulate streaming by chunking the response
            const words = selectedResponse.split(' ');
            
            for (let i = 0; i < words.length; i++) {
              const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
              fullResponse += chunk;
              const data = `data: ${JSON.stringify({ chunk })}\n\n`;
              controller.enqueue(encoder.encode(data));
              
              // Small delay between chunks to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Save the complete message to database after streaming
            const { error: saveError } = await supabase
              .from('messages')
              .insert({
                user_id: user.id,
                session_id: sessionId,
                content: message,
                response: fullResponse
              });

            if (saveError) {
              console.error('Failed to save message:', saveError);
            }

            // Update session's updated_at timestamp
            if (sessionId) {
              await supabase
                .from('chat_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', sessionId)
                .eq('user_id', user.id);
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