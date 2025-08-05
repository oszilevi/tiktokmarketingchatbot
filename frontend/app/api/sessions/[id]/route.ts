import { NextRequest, NextResponse } from 'next/server';
import { createUserScopedClient } from '@/lib/supabase-server';
import { Video } from '@/types/video';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const sessionId = parseInt(id);

    // Fetch the session with messages and notes
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        notes (*),
        messages (*)
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error || !session) {
      console.error('Database error:', error);
      return NextResponse.json(
        { detail: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch {
    return NextResponse.json(
      { detail: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { title, gallery_videos } = await request.json();
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

    const { id } = await params;
    const sessionId = parseInt(id);

    // Update the session
    const updateData: { updated_at: string; title?: string; gallery_videos?: Video[] } = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    if (gallery_videos !== undefined) {
      updateData.gallery_videos = gallery_videos;
    }

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !session) {
      console.error('Database error:', error);
      return NextResponse.json(
        { detail: "Session not found or failed to update" },
        { status: error?.code === 'PGRST116' ? 404 : 500 }
      );
    }

    return NextResponse.json(session);
  } catch {
    return NextResponse.json(
      { detail: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('DELETE endpoint called');
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

    const { id } = await params;
    const sessionId = parseInt(id);
    console.log('DELETE: sessionId =', sessionId, 'user_id =', user.id);

    // Delete associated messages first (cascade should handle this, but being explicit)
    console.log('DELETE: Deleting messages...');
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user.id);
    
    if (messagesError) console.log('DELETE: Messages error:', messagesError);

    // Delete associated notes
    console.log('DELETE: Deleting notes...');
    const { error: notesError } = await supabase
      .from('notes')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user.id);
      
    if (notesError) console.log('DELETE: Notes error:', notesError);

    // Delete the session
    console.log('DELETE: Deleting session...');
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('DELETE: Database error deleting session:', error);
      return NextResponse.json(
        { detail: "Failed to delete session" },
        { status: 500 }
      );
    }

    console.log('DELETE: Session deleted successfully');
    return NextResponse.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error('DELETE: Unexpected error:', error);
    return NextResponse.json(
      { detail: "Invalid request" },
      { status: 400 }
    );
  }
}