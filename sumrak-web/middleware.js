import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export function middleware(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isOwnerPage = request.nextUrl.pathname.startsWith('/owner') || request.nextUrl.pathname.startsWith('/request');
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
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
