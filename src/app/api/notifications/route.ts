import { NextRequest, NextResponse } from 'next/server'
import { getNotifications, markAllNotificationsRead } from '@/lib/db'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
  const notifications = await getNotifications(userId, unreadOnly)
  const unread_count = notifications.filter(n => !n.read).length

  return NextResponse.json({ notifications, unread_count })
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await request.json()
  if (action === 'read_all') {
    await markAllNotificationsRead(userId)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
