import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth is not configured' }, { status: 500 })
  }

  const userId = request.headers.get('x-user-id')
  const orgId  = request.headers.get('x-org-id')
  if (!userId || !orgId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const state       = randomUUID()
  const baseUrl     = (process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin).replace(/\/$/, '')
  const redirectUri = `${baseUrl}/api/integrations/google-drive/callback`

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state,
  })

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )

  // Store state in HttpOnly cookie to verify on callback (CSRF protection)
  response.cookies.set('gdrive-oauth-state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   600, // 10 minutes
    path:     '/',
  })

  return response
}
