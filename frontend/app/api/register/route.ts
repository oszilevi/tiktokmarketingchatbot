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

    console.log('Attempting Supabase auth signup with:', { email, username });
    
    // Try a simpler signup first without user metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Remove options temporarily to isolate the issue
      // options: {
      //   data: {
      //     username: username,
      //     display_name: username
      //   }
      // }
    });

    console.log('Supabase signup result:', { data: data?.user?.id ? 'User created' : 'No user', error });

    if (error) {
      console.error('Supabase auth error:', error);
      return NextResponse.json(
        { detail: `Registration failed: ${error.message}` },
        { status: 400 }
      );
    }

    if (!data.user) {
      console.error('No user returned from signup');
      return NextResponse.json(
        { detail: "Registration failed: No user created" },
        { status: 400 }
      );
    }

    console.log('Registration successful for user:', data.user.id);

    // Try to create a user profile record manually if it doesn't exist
    try {
      console.log('Attempting to create user profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: email,
          username: username,
          display_name: username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });
      
      if (profileError) {
        console.log('Profile creation failed (this might be expected):', profileError.message);
      } else {
        console.log('User profile created successfully');
      }
    } catch (profileErr) {
      console.log('Profile creation attempt failed (this might be expected):', profileErr);
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