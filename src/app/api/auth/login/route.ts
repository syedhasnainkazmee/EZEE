import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, createSession, getOrgByDomain, getAllUsers } from '@/lib/db'
import { comparePassword, createSessionToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await getUserByEmail(email.toLowerCase().trim())
    if (!user) {
      const domain = email.toLowerCase().trim().split('@')[1] ?? ''
      if (domain) {
        const org = await getOrgByDomain(domain)
        if (org) {
          const allUsers = await getAllUsers()
          const admin = allUsers.find(u => u.org_id === org.id && u.role === 'admin')
          return NextResponse.json({
            orgExists: true,
            orgName: org.name,
            adminName: admin?.name ?? null,
          }, { status: 401 })
        }
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (user.status === 'pending') {
      return NextResponse.json({ error: 'Your access request is pending admin approval.' }, { status: 403 })
    }

    if (!user.password_hash) {
      return NextResponse.json({ error: 'Account not activated. Check your email for an invitation link.' }, { status: 401 })
    }

    const valid = await comparePassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const { token, jti, expiresAt } = createSessionToken({
      id: user.id, org_id: user.org_id, role: user.role,
      name: user.name, email: user.email,
    })

    await createSession(user.id, jti, expiresAt)

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id }
    })
    const isProd = process.env.NODE_ENV === 'production'
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      secure: isProd,
    })
    return response
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
