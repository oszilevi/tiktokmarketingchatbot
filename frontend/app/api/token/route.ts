import { NextRequest, NextResponse } from 'next/server';

// Access the same users object (in a real app, this would be a database)
const users: Record<string, { password: string; id: number }> = {};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password || !(username in users) || users[username].password !== password) {
      return NextResponse.json(
        { detail: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      access_token: `fake-token-${username}`,
      token_type: "bearer"
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request" },
      { status: 400 }
    );
  }
}