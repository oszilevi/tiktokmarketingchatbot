import { NextRequest, NextResponse } from 'next/server';
import { createUserScopedClient } from '@/lib/supabase-server';

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

    // const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user'; // Not needed for placeholder responses

    // Placeholder responses
    const placeholderResponses = [
      "That's a great question about TikTok content! Here are some tips to help you create engaging videos that could go viral...",
      "I love your enthusiasm for TikTok creation! Let me share some trending ideas that are perfect for your style...",
      "Excellent thinking! For TikTok success, remember to focus on the first 3 seconds - they're crucial for viewer retention...",
      "Your content strategy sounds amazing! Here's how you can optimize it for maximum engagement on TikTok...",
      "That's a creative approach! TikTok's algorithm loves authentic content, so keep being yourself while following these best practices..."
    ];

    try {
      // Wait 1 second to simulate thinking
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Select a random response
      const gptResponse = placeholderResponses[Math.floor(Math.random() * placeholderResponses.length)];

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
    } catch (error) {
      console.error('Chat Error:', error);
      const fallbackResponse = `I'm having trouble processing your request right now. But I can still help you with TikTok content! What kind of videos are you looking to create?`;
      
      // Still save the message even if error occurs
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