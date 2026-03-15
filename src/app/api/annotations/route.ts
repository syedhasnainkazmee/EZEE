import { NextResponse } from 'next/server'
import { getAnnotations, addAnnotation, deleteAnnotation, getReviewerByToken } from '@/lib/db'

// GET /api/annotations?submissionId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const submissionId = searchParams.get('submissionId')
  if (!submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 })
  return NextResponse.json({ annotations: await getAnnotations(submissionId) })
}

// POST /api/annotations — add a pin
export async function POST(req: Request) {
  const { token, design_id, submission_id, x, y, comment } = await req.json()
  if (!token || !design_id || !submission_id || x == null || y == null || !comment?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const reviewer = await getReviewerByToken(token)
  if (!reviewer) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  const annotation = await addAnnotation({
    design_id,
    submission_id,
    reviewer_id: reviewer.id,
    x,
    y,
    comment: comment.trim(),
  })
  return NextResponse.json({ annotation: { ...annotation, reviewer } }, { status: 201 })
}

// DELETE /api/annotations?id=xxx&token=xxx
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const token = searchParams.get('token')
  if (!id || !token) return NextResponse.json({ error: 'id and token required' }, { status: 400 })
  const reviewer = await getReviewerByToken(token)
  if (!reviewer) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  const ok = await deleteAnnotation(id, reviewer.id)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
}
