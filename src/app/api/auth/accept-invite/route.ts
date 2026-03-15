import { NextRequest, NextResponse } from 'next/server'
import { getInvitation, consumeInvitation, createUser, updateUser, getUserByEmail, getUserById, createSession, getOrg, getAllUsers, createNotification } from '@/lib/db'
import { hashPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const inv = getInvitation(token)
  if (!inv) return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
  if (inv.used) return NextResponse.json({ error: 'This invitation has already been used' }, { status: 410 })
  if (new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })

  const org = getOrg(inv.org_id)
  return NextResponse.json({
    email: inv.email,
    role: inv.role,
    org_name: org?.name ?? 'the workspace',
  })
}

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json()
    if (!token || !name || !password) {
      return NextResponse.json({ error: 'Token, name, and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const inv = getInvitation(token)
    if (!inv) return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
    if (inv.used) return NextResponse.json({ error: 'This invitation has already been used' }, { status: 410 })
    if (new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })

    const password_hash = await hashPassword(password)
    consumeInvitation(token)

    // Either update existing user or create new one
    const existingUser = getUserByEmail(inv.email)
    let user
    if (existingUser) {
      updateUser(existingUser.id, { name, password_hash })
      // Also set org_id directly since it's not in updateUser's Pick type
      user = getUserById(existingUser.id) ?? null
    } else {
      user = createUser(name, inv.email, inv.role, { org_id: inv.org_id, password_hash })
    }

    if (!user) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })

    const org = getOrg(inv.org_id)
    // Welcome email to new user (always — functional account-creation email)
    sendWelcomeEmail({
      to: user.email,
      name: user.name,
      orgName: org?.name ?? 'the workspace',
    }).catch(err => console.error('[email] Failed to send welcome email:', err))

    // In-app notification for all admins that a new member joined
    const allUsers = getAllUsers()
    for (const admin of allUsers.filter(u => u.role === 'admin' && u.id !== user!.id)) {
      createNotification({
        user_id: admin.id,
        type: 'invited',
        title: `New member joined: ${user.name}`,
        body: `${user.email} has accepted their invitation and joined ${org?.name ?? 'the workspace'}.`,
        href: null,
      })
    }

    const { token: jwt, jti, expiresAt } = createSessionToken({
      id: user.id, org_id: user.org_id, role: user.role, name: user.name, email: user.email,
    })
    createSession(user.id, jti, expiresAt)

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id },
      redirect: '/onboarding',
    })
    const isProd = process.env.NODE_ENV === 'production'
    response.cookies.set(COOKIE_NAME, jwt, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      secure: isProd,
    })
    return response
  } catch (err) {
    console.error('[accept-invite]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
