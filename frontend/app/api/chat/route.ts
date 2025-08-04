import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createUserScopedClient } from '@/lib/supabase-server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
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

    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';

    const systemPrompt = `You are a helpful TikTok content creation assistant. You help users create engaging TikTok content, provide tips, and give creative suggestions. 

Your responses should be:
- Engaging and conversational
- Focused on TikTok content creation
- Helpful with practical tips
- Creative and inspiring

User: ${username}`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const gptResponse = response.choices[0].message.content?.trim() || 'Sorry, I could not generate a response.';

      // Save message to database
      const { data: savedMessage, error: saveError } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          content: message,
          response: gptResponse
        })
        .select()
        .single();

      if (saveError) {
        console.error('Failed to save message:', saveError);
      }

      // Create a note for the message
      const noteContent = `Discussion about: ${message.substring(0, 50)}...`;
      
      if (savedMessage) {
        const { error: noteError } = await supabase
          .from('notes')
          .insert({
            message_id: savedMessage.id,
            title: "Chat Summary",
            content: noteContent
          });

        if (noteError) {
          console.error('Failed to save note:', noteError);
        }
      }

      return NextResponse.json({
        response: gptResponse,
        user: username,
        message_id: savedMessage?.id || Date.now(),
        note: {
          id: 1,
          title: "Chat Summary",
          content: noteContent
        }
      });
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      const fallbackResponse = `I'm having trouble connecting to my AI brain right now. But I can still help you with TikTok content! You said: '${message}'. What kind of TikTok content are you looking to create?`;
      
      // Still save the message even if OpenAI fails
      const { data: savedMessage } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          content: message,
          response: fallbackResponse
        })
        .select()
        .single();

      return NextResponse.json({
        response: fallbackResponse,
        user: username,
        message_id: savedMessage?.id || Date.now(),
        note: {
          id: 1,
          title: "Chat Summary",
          content: `Discussion about: ${message.substring(0, 50)}...`
        }
      });
    }
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return NextResponse.json(
      { detail: "Failed to process message" },
      { status: 500 }
    );
  }
}