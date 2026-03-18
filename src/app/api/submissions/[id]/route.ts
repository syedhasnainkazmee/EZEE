import { NextRequest, NextResponse } from 'next/server'
import { getSubmission, getDesigns, getReviews, getWorkflowReviewers, getWorkflow, updateSubmission, deleteSubmission } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const submission = await getSubmission(params.id)
  if (!submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const designs = await getDesigns(params.id)
  const reviews = await getReviews(params.id)
  const reviewers = submission.workflow_id ? await getWorkflowReviewers(submission.workflow_id) : []
  const workflow = submission.workflow_id ? await getWorkflow(submission.workflow_id) : null
  return NextResponse.json({ submission, designs, reviews, reviewers, workflowName: workflow?.name ?? null })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')
  const role   = req.headers.get('x-user-role')
  const sub    = await getSubmission(params.id)
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role !== 'admin' && sub.submitted_by !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['draft', 'changes_requested'].includes(sub.status))
    return NextResponse.json({ error: 'Cannot edit a submission in this state' }, { status: 400 })
  const { title, description } = await req.json()
  const updated = await updateSubmission(params.id, { title, description })
  return NextResponse.json({ submission: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')
  const role   = req.headers.get('x-user-role')
  const sub    = await getSubmission(params.id)
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role !== 'admin' && sub.submitted_by !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (['in_review', 'approved'].includes(sub.status))
    return NextResponse.json({ error: 'Cannot delete a submission that is in review or approved' }, { status: 400 })
  await deleteSubmission(params.id)
  return NextResponse.json({ ok: true })
}
