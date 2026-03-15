import { NextRequest, NextResponse } from 'next/server'
import { resetWorkspaceData } from '@/lib/db'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { confirmation } = await req.json()
  if (confirmation !== 'RESET') {
    return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 })
  }

  await resetWorkspaceData()
  return NextResponse.json({ ok: true })
}
