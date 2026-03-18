import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getOrgByDomain, getUserByEmail, createUser, getAllUsers, createNotification } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json()

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const domain = normalizedEmail.split('@')[1] ?? ''

    if (!domain) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const org = await getOrgByDomain(domain)
    if (!org) {
      return NextResponse.json({ error: 'No workspace found for this domain' }, { status: 404 })
    }

    const existing = await getUserByEmail(normalizedEmail)
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 })
    }

    const password_hash = await hashPassword(password)

    await createUser(name.trim(), normalizedEmail, 'member', {
      org_id: org.id,
      password_hash,
      status: 'pending',
    })

    // Notify all admins
    const allUsers = await getAllUsers()
    const admins = allUsers.filter(u => u.org_id === org.id && u.role === 'admin')
    await Promise.all(
      admins.map(admin =>
        createNotification({
          user_id: admin.id,
          type: 'access_requested',
          title: 'Access Request',
          body: `${name.trim()} (${normalizedEmail}) has requested access to the workspace.`,
          href: '/admin',
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[request-access]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
