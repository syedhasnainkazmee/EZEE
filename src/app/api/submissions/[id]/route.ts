import { NextResponse } from 'next/server'
import { getSubmission, getDesigns, getReviews, getAllReviewers } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const submission = getSubmission(params.id)
  if (!submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const designs = getDesigns(params.id)
  const reviews = getReviews(params.id)
  const reviewers = getAllReviewers()
  return NextResponse.json({ submission, designs, reviews, reviewers })
}
