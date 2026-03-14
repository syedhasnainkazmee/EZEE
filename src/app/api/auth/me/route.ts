import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser } from '@/lib/db'
import { comparePassword, hashPassword, verifyJwt, COOKIE_NAME } from '@/lib/auth'

// /api/auth/me is under the public /api/auth/ prefix so middleware doesn't set x-user-id.
// We read the JWT directly from the cookie here instead.
function getUserIdFromRequest(request: NextRequest): string | null {
  // Try middleware-set header first (for protected routes)
  const fromHeader = request.headers.get('x-user-id')
  if (fromHeader) return fromHeader
  // Fall back to reading cookie directly
  const cookie = request.cookies.get(COOKIE_NAME)?.value
  if (!cookie) return null
  const payload = verifyJwt(cookie)
  return payload?.sub ?? null
}

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return NextResponse.json({ user: null }, { status: 401 })

  const user = getUserById(userId)
  if (!user) return NextResponse.json({ user: null }, { status: 401 })

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id, notify_email: user.notify_email }
  })
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, notify_email } = await request.json()
  const updates: any = {}
  if (name?.trim()) updates.name = name.trim()
  if (typeof notify_email === 'boolean') updates.notify_email = notify_email

  const user = updateUser(userId, updates)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id, notify_email: user.notify_email }
  })
}

export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { current_password, new_password } = await request.json()
  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
  }
  if (new_password.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const user = getUserById(userId)
  if (!user?.password_hash) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const valid = await comparePassword(current_password, user.password_hash)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

  const password_hash = await hashPassword(new_password)
  updateUser(userId, { password_hash })

  return NextResponse.json({ ok: true })
}
