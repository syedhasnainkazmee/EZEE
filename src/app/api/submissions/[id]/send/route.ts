import { NextResponse } from 'next/server'
import { getSubmission, updateSubmission, getDesignCount, getWorkflowStep, getTotalSteps } from '@/lib/db'
import { sendReviewEmail } from '@/lib/email'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const submission = getSubmission(params.id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'draft' && submission.status !== 'changes_requested') {
    return NextResponse.json({ error: 'Already in review or approved' }, { status: 400 })
  }
  if (getDesignCount(params.id) === 0) {
    return NextResponse.json({ error: 'Upload at least one design first' }, { status: 400 })
  }

  const updated = updateSubmission(params.id, { status: 'in_review', current_step: 1 })

  // Email step-1 reviewer
  const step = getWorkflowStep(submission.workflow_id, 1)
  const total = getTotalSteps(submission.workflow_id)
  if (step?.user) {
    sendReviewEmail({
      to: step.user.email,
      reviewerName: step.user.name,
      reviewerRole: step.user.role,
      reviewerFocus: step.focus,
      submissionTitle: submission.title,
      reviewToken: step.user.token,
      step: 1, totalSteps: total,
    }).then(() => {
      console.log(`[email] Notified ${step.user!.name} (${step.user!.email}) for step 1`)
    }).catch(err => {
      console.error('[email] Failed to notify step 1 reviewer:', err)
    })
  } else {
    console.warn('[email] No step-1 reviewer found for workflow', submission.workflow_id)
  }

  return NextResponse.json({ submission: updated })
}
