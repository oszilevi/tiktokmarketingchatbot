import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage (resets on restart)
const users: Record<string, { password: string; id: number }> = {};

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (username in users) {
      return NextResponse.json(
        { detail: "Username already registered" },
        { status: 400 }
      );
    }

    users[username] = { password, id: Object.keys(users).length + 1 };
    
    return NextResponse.json({ message: "User created successfully" });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request" },
      { status: 400 }
    );
  }
}