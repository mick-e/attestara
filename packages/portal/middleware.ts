import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID()
  const isDev = process.env.NODE_ENV !== 'production'

  // Dev mode needs 'unsafe-eval' for Next.js HMR/fast refresh.
  // Production uses 'strict-dynamic' so the nonced root script can load
  // subsequent chunks without each needing an explicit nonce.
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`

  const relayUrl = process.env.NEXT_PUBLIC_RELAY_URL ?? 'http://localhost:3001'

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `connect-src 'self' ${relayUrl}`,
    `font-src 'self' data:`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  // Pass the nonce downstream so layouts/pages can attach it to inline scripts.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('content-security-policy', csp)
  return response
}

export const config = {
  matcher: [
    // Skip Next.js internals, static assets, and the favicon.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
