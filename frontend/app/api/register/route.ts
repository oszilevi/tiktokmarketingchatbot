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

    // Check if email is in allowed_emails table
    console.log('Checking email:', email.toLowerCase());
    const { data: allowedEmail, error: allowedError } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    console.log('Allowed email check result:', { allowedEmail, allowedError });

    if (allowedError) {
      console.error('Database error checking allowed emails:', allowedError);
      return NextResponse.json(
        { detail: `Database error: ${allowedError.message}` },
        { status: 500 }
      );
    }

    if (!allowedEmail) {
      console.log('Email not found in allowed_emails table');
      return NextResponse.json(
        { detail: "This email is not authorized to register. Please contact an administrator." },
        { status: 403 }
      );
    }

    console.log('Email is allowed, proceeding with registration');

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
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { detail: "Database error adding user" },
      { status: 500 }
    );
  }
}