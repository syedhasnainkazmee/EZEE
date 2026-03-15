import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/db'
import { verifyJwt, COOKIE_NAME } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME)?.value
  if (cookie) {
    const payload = verifyJwt(cookie)
    if (payload) {
      await deleteSession(payload.jti)
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  })
  return response
}
