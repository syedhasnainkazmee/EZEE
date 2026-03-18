import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser, getPendingUsers } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  if (status === 'pending') {
    const orgId = req.headers.get('x-org-id') ?? ''
    const users = orgId ? await getPendingUsers(orgId) : []
    return NextResponse.json({ users })
  }

  return NextResponse.json({ users: await getAllUsers() })
}

export async function POST(req: Request) {
  const { name, email, role } = await req.json()
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }
  const user = await createUser(name.trim(), email.trim(), role === 'admin' ? 'admin' : 'member')
  return NextResponse.json({ user }, { status: 201 })
}
