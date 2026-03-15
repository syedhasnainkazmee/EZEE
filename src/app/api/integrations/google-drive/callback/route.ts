import { NextRequest, NextResponse } from 'next/server'
import { upsertIntegration } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl     = (process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin).replace(/\/$/, '')
  const settingsUrl = `${baseUrl}/settings?tab=integrations`

  if (error) {
    return NextResponse.redirect(`${settingsUrl}&gdrive_error=access_denied`)
  }

  // CSRF check — state must match what we stored in the cookie
  const savedState = request.cookies.get('gdrive-oauth-state')?.value
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${settingsUrl}&gdrive_error=invalid_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}&gdrive_error=no_code`)
  }

  const userId = request.headers.get('x-user-id')
  const orgId  = request.headers.get('x-org-id')
  if (!userId || !orgId) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  // Exchange authorization code for tokens
  const redirectUri = `${baseUrl}/api/integrations/google-drive/callback`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('[gdrive/callback] token exchange failed', await tokenRes.text())
    return NextResponse.redirect(`${settingsUrl}&gdrive_error=token_exchange`)
  }

  const tokens = await tokenRes.json() as {
    access_token:  string
    refresh_token?: string
    expires_in:    number
    token_type:    string
  }

  // Fetch the Google account info to show in the UI
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const profile = profileRes.ok
    ? await profileRes.json() as { email?: string; name?: string }
    : {}

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await upsertIntegration({
    org_id:           orgId,
    tool_id:          'google-drive',
    connected_by:     userId,
    access_token:     tokens.access_token,
    refresh_token:    tokens.refresh_token ?? null,
    token_expires_at: expiresAt,
    account_email:    profile.email ?? null,
    account_name:     profile.name  ?? null,
  })

  const response = NextResponse.redirect(`${settingsUrl}&gdrive_connected=1`)
  response.cookies.delete('gdrive-oauth-state')
  return response
}
