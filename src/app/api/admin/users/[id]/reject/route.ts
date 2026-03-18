import { NextRequest, NextResponse } from 'next/server'
import { rejectUser } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const role = req.headers.get('x-user-role')
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await rejectUser(params.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reject]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
