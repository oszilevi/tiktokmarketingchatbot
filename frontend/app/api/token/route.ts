import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { detail: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      token_type: "bearer",
      user: data.user
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request" },
      { status: 400 }
    );
  }
}