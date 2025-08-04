import { NextRequest, NextResponse } from 'next/server';
import { createUserScopedClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
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

    // Fetch messages for this user
    console.log('Fetching messages for user:', user.id);
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        notes (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { detail: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    console.log('Found messages:', messages?.length || 0);
    return NextResponse.json(messages || []);
  } catch {
    return NextResponse.json(
      { detail: "Invalid request" },
      { status: 400 }
    );
  }
}