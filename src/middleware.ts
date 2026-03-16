import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'process-session'

// Edge-compatible JWT verification using jose (jsonwebtoken doesn't work in Edge runtime)
async function verifyToken(token: string): Promise<{ sub: string; role: string; org: string; name: string; email: string } | null> {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? 'dev-secret-change-in-production-please'
    )
    const { payload } = await jwtVerify(token, secret)
    return payload as any
  } catch {
    return null
  }
}

// Routes that require NO authentication
const PUBLIC_PREFIXES = [
  '/login',
  '/setup',
  '/accept-invite',
  '/review/',         // magic-link reviewer access — must stay public forever
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/accept-invite',
  '/api/org/setup',   // first-time org setup
  '/api/review/',     // review submission API (public for external reviewers)
  '/_next/',
  '/favicon.ico',
  '/uploads/',
]

// Admin-only route prefixes
const ADMIN_PREFIXES = [
  '/admin',
  '/api/admin/',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

function isAdminOnly(pathname: string): boolean {
  return ADMIN_PREFIXES.some(p => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow static files
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  if (isPublic(pathname)) {
    if (pathname === '/login') {
      const cookie = request.cookies.get(COOKIE_NAME)?.value
      if (cookie) {
        const payload = await verifyToken(cookie)
        if (payload) {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    }
    return NextResponse.next()
  }

  // Protected routes — require valid JWT
  const cookie = request.cookies.get(COOKIE_NAME)?.value
  if (!cookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const payload = await verifyToken(cookie)
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin-only route check
  if (isAdminOnly(pathname) && payload.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Attach user info to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.sub)
  requestHeaders.set('x-user-role', payload.role as string)
  requestHeaders.set('x-org-id', (payload.org as string) ?? '')
  requestHeaders.set('x-user-name', payload.name as string)
  requestHeaders.set('x-user-email', payload.email as string)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
