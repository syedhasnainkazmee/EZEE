import { NextResponse } from 'next/server'
import { getAllUsers } from '@/lib/db'

export async function GET() {
  const users = await getAllUsers()
  // Return safe fields only (no password_hash)
  return NextResponse.json({
    members: users.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      avatar_url: u.avatar_url ?? null, token: u.token,
      created_at: u.created_at,
    }))
  })
}
