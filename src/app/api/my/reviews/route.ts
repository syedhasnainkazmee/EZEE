import { NextRequest, NextResponse } from 'next/server'
import { getReviewsByUserStep } from '@/lib/db'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reviews = getReviewsByUserStep(userId)
  return NextResponse.json({ reviews })
}
