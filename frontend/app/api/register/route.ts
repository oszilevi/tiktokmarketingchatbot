import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { detail: "Email, username, and password are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          display_name: username
        }
      }
    });

    if (error) {
      return NextResponse.json(
        { detail: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: "User created successfully",
      user: data.user 
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request" },
      { status: 400 }
    );
  }
}