import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isChatPage = request.nextUrl.pathname === '/chat';
  const isHomePage = request.nextUrl.pathname === '/';

  if (!token && isChatPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && (isLoginPage || isHomePage)) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  if (!token && isHomePage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/chat'],
};