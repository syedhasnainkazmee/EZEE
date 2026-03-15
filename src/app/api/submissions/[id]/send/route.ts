import { NextResponse } from 'next/server'
import { getSubmission, updateSubmission, getDesignCount, getWorkflowStep, getTotalSteps, getAllUsers, createNotification, getReviews, clearUserReviewCache } from '@/lib/db'
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

  // For resubmissions (version > 1), route back to the reviewer who requested changes
  let targetStep = 1
  if (submission.version > 1) {
    const allReviews = getReviews(params.id)
    const changesReview = allReviews.find(
      r => r.action === 'changes_requested' && r.version === submission.version - 1
    )
    if (changesReview?.step?.step != null) {
      targetStep = changesReview.step.step
    }
  }

  const updated = updateSubmission(params.id, { status: 'in_review', current_step: targetStep })

  // Bust review cache for all users so the reviewer sees the new pending item immediately
  getAllUsers().forEach(u => clearUserReviewCache(u.id))

  const step = getWorkflowStep(submission.workflow_id, targetStep)
  const total = getTotalSteps(submission.workflow_id)
  const isResubmission = submission.version > 1

  if (step?.user) {
    sendReviewEmail({
      to: step.user.email,
      reviewerName: step.user.name,
      reviewerRole: step.user.role,
      reviewerFocus: step.focus,
      submissionTitle: submission.title,
      reviewToken: step.user.token,
      step: targetStep, totalSteps: total,
    }).then(() => {
      console.log(`[email] Notified ${step.user!.name} (${step.user!.email}) for step ${targetStep}${isResubmission ? ' (resubmission)' : ''}`)
    }).catch(err => {
      console.error('[email] Failed to notify reviewer:', err)
    })
    // In-app notification for the target reviewer
    createNotification({
      user_id: step.user.id,
      type: 'review_needed',
      title: isResubmission
        ? `Resubmission ready for review: "${submission.title}"`
        : `Review needed: "${submission.title}"`,
      body: `Step ${targetStep} of ${total} — ${step.focus}`,
      href: `/review/${step.user.token}`,
    })
  } else {
    console.warn('[email] No reviewer found for step', targetStep, 'workflow', submission.workflow_id)
  }

  // In-app notification for all admins
  const allUsers = getAllUsers()
  for (const admin of allUsers.filter(u => u.role === 'admin')) {
    createNotification({
      user_id: admin.id,
      type: 'review_needed',
      title: isResubmission
        ? `Resubmission in review: "${submission.title}"`
        : `Submission in review: "${submission.title}"`,
      body: isResubmission
        ? `Version ${submission.version} has been submitted for review.`
        : 'A submission has entered the review pipeline.',
      href: `/submission/${params.id}`,
    })
  }

  return NextResponse.json({ submission: updated })
}
