import { NextResponse } from 'next/server';

export async function GET() {
  // For demo purposes, return a mock user
  return NextResponse.json({
    username: "demo_user",
    id: 1
  });
}