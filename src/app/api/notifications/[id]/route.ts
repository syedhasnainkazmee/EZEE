import { NextRequest, NextResponse } from 'next/server'
import { markNotificationRead } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await markNotificationRead(params.id, userId)
  return NextResponse.json({ ok: true })
}
