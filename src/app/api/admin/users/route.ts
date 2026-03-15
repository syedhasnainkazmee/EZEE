import { NextResponse } from 'next/server'
import { getAllUsers, createUser } from '@/lib/db'

export async function GET() {
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
