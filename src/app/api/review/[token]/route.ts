import { NextResponse } from 'next/server'
import { getUserByToken, getReviewsByUserStep } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const user = getUserByToken(params.token)
  if (!user) return NextResponse.json({ error: 'Invalid review link' }, { status: 404 })
  const submissions = getReviewsByUserStep(user.id)
  return NextResponse.json({ reviewer: user, submissions })
}
