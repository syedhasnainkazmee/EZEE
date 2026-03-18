import { NextResponse } from 'next/server'
import { getSubmission, getDesigns, getReviews, getWorkflowReviewers, getWorkflow } from '@/lib/db'

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
