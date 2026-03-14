import { NextResponse } from 'next/server'
import { updateUser, deleteUser } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const updates = await req.json()
  const user = updateUser(params.id, updates)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  deleteUser(params.id)
  return NextResponse.json({ ok: true })
}
