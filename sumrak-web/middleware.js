import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export function middleware(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isOwnerPage = request.nextUrl.pathname.startsWith('/owner') || request.nextUrl.pathname.startsWith('/request');
  const csp = [
    "default-src 'self' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${isOwnerPage ? "'none'" : "'self'"}`,
  ].join('; ');
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set('Content-Security-Policy', csp);
  
  //условие для проверки на локалке без CSP
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  } 

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
