import { NextRequest, NextResponse } from 'next/server'
import { getAllSubmissions, getReviews } from '@/lib/db'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Include submissions explicitly owned by this user + legacy submissions with no owner set
  const all = await getAllSubmissions()
  const submissions = all.filter(s => s.submitted_by === userId || !s.submitted_by)

  const enriched = await Promise.all(submissions.map(async sub => {
    if (sub.status === 'changes_requested') {
      const reviews = await getReviews(sub.id)
      const changesReview = reviews
        .filter(r => r.action === 'changes_requested')
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      return {
        ...sub,
        changes_review: changesReview
          ? { reviewer_name: changesReview.reviewer?.name ?? 'Unknown', comment: changesReview.comment }
          : null,
      }
    }
    return { ...sub, changes_review: null }
  }))

  return NextResponse.json({ submissions: enriched })
}
