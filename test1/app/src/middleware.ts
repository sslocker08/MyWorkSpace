import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/session'

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-DNS-Prefetch-Control': 'off',
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  // Apply security headers to all responses
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v))

  // Guard all /admin routes except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = req.cookies.get(SESSION_COOKIE)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    const session = await verifySession(token)
    if (!session) {
      const response = NextResponse.redirect(new URL('/admin/login', req.url))
      response.cookies.delete(SESSION_COOKIE)
      return response
    }
  }

  return res
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
