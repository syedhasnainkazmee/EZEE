import { NextRequest, NextResponse } from 'next/server'
import { getFirstOrg, createOrg, createUser, updateUser, getUserByEmail, createSession } from '@/lib/db'
import { hashPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth'

// GET — lets the setup page check if an org already exists before rendering the form
export async function GET() {
  const org = await getFirstOrg()
  return NextResponse.json({ exists: !!org }, {
    headers: { 'Cache-Control': 'no-store' }
  })
}

export async function POST(request: NextRequest) {
  try {
    // Only allow if no org exists yet
    const existing = await getFirstOrg()
    if (existing) {
      return NextResponse.json({ error: 'Organization already exists. Use the login page.' }, { status: 409 })
    }

    const { org_name, domain, admin_name, admin_email, password } = await request.json()

    if (!org_name || !admin_name || !admin_email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const cleanDomain = domain?.toLowerCase().trim().replace('@', '') || admin_email.split('@')[1]
    const org = await createOrg(org_name, cleanDomain)

    const password_hash = await hashPassword(password)
    const normalizedEmail = admin_email.toLowerCase().trim()

    // If a user with this email already exists (e.g. from seed data), update them
    // instead of inserting a duplicate row that would break getUserByEmail lookups.
    const existingUser = await getUserByEmail(normalizedEmail)
    let admin
    if (existingUser) {
      admin = await updateUser(existingUser.id, { name: admin_name, role: 'admin', org_id: org.id, password_hash })!
    } else {
      admin = await createUser(admin_name, normalizedEmail, 'admin', { org_id: org.id, password_hash })
    }

    const { token, jti, expiresAt } = createSessionToken({
      id: admin!.id, org_id: admin!.org_id, role: admin!.role,
      name: admin!.name, email: admin!.email,
    })
    await createSession(admin!.id, jti, expiresAt)

    const response = NextResponse.json({
      org: { id: org.id, name: org.name, domain: org.domain },
      user: { id: admin!.id, name: admin!.name, email: admin!.email, role: admin!.role },
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
    console.error('[org/setup]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
