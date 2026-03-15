import { NextRequest, NextResponse } from 'next/server'
import { getReviewsByUserStep, getUserById } from '@/lib/db'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reviews = await getReviewsByUserStep(userId)
  const user = await getUserById(userId)
  return NextResponse.json({ reviews, userToken: user?.token ?? null })
}
