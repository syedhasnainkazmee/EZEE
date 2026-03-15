import { NextResponse } from 'next/server'
import {
  getUserByToken, getSubmission, upsertReview, updateSubmission,
  getNextWorkflowStep, getWorkflowStep, getTotalSteps, getAllUsers, getWorkflow,
  getUserById, createNotification, clearUserReviewCache,
} from '@/lib/db'
import { sendReviewEmail, sendFinalApprovalEmail, sendChangesRequestedEmail } from '@/lib/email'

export async function POST(req: Request, { params }: { params: { token: string; submissionId: string } }) {
  const { action, comment } = await req.json()

  if (!['approved', 'changes_requested'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const user = await getUserByToken(params.token)
  if (!user) return NextResponse.json({ error: 'Invalid review link' }, { status: 404 })

  const submission = await getSubmission(params.submissionId)
  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  // Verify this user is the current step's reviewer
  const currentStep = await getWorkflowStep(submission.workflow_id, submission.current_step ?? -1)
  if (!currentStep || currentStep.user_id !== user.id) {
    return NextResponse.json({ error: 'This submission is not currently at your review step' }, { status: 400 })
  }

  await upsertReview(params.submissionId, user.id, submission.version, action, comment ?? '')
  // Bust every user's review cache so the updated status is visible immediately
  const allUsersForCache = await getAllUsers()
  allUsersForCache.forEach(u => clearUserReviewCache(u.id))

  const total = await getTotalSteps(submission.workflow_id)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const submissionUrl = `${baseUrl}/submission/${submission.id}`
  const allUsers = await getAllUsers()
  const admins = allUsers.filter(u => u.role === 'admin')

  if (action === 'approved') {
    const next = await getNextWorkflowStep(submission.workflow_id, submission.current_step!)
    if (next?.user) {
      await updateSubmission(params.submissionId, { current_step: next.step })
      // Email next reviewer (always — functional email, review can't proceed otherwise)
      sendReviewEmail({
        to: next.user.email,
        reviewerName: next.user.name,
        reviewerRole: next.user.role,
        reviewerFocus: next.focus,
        submissionTitle: submission.title,
        reviewToken: next.user.token,
        step: next.step, totalSteps: total,
        previousApprover: user.name,
      }).then(() => {
        console.log(`[email] Notified ${next.user!.name} for step ${next.step}`)
      }).catch(err => {
        console.error('[email] Failed to notify next reviewer:', err)
      })
      // In-app notification for next reviewer
      await createNotification({
        user_id: next.user.id,
        type: 'review_needed',
        title: `Review needed: "${submission.title}"`,
        body: `Step ${next.step} of ${total} — ${next.focus}`,
        href: `/review/${next.user.token}`,
      })
    } else {
      await updateSubmission(params.submissionId, { status: 'approved', current_step: null })
      console.log(`[email] Submission "${submission.title}" fully approved.`)

      const workflow = await getWorkflow(submission.workflow_id)
      // Email admins + reviewers who have notify_email enabled
      const reviewerUsers = (workflow?.steps.map(s => s.user).filter(Boolean) ?? []) as typeof allUsers
      const toNotify = Array.from(
        new Map(
          [...admins, ...reviewerUsers]
            .filter(u => u.notify_email)
            .map(u => [u.id, u])
        ).values()
      )
      Promise.all(toNotify.map(u =>
        sendFinalApprovalEmail({ to: u.email, submissionTitle: submission.title, submissionUrl })
      )).then(() => {
        console.log(`[email] Sent final approval notices to ${toNotify.map(u => u.email).join(', ')}`)
      }).catch(err => console.error('[email] Failed to send final approvals:', err))
      // In-app notification for all admins
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          type: 'submission_approved',
          title: `Approved: "${submission.title}"`,
          body: 'The submission has passed all review steps.',
          href: submissionUrl,
        })
      }
    }
  } else {
    // changes_requested
    await updateSubmission(params.submissionId, { status: 'changes_requested', current_step: null })

    // Notify the submitter
    if (submission.submitted_by) {
      const submitter = await getUserById(submission.submitted_by)
      if (submitter) {
        await createNotification({
          user_id: submitter.id,
          type: 'changes_requested',
          title: `Changes requested: "${submission.title}"`,
          body: `${user.name} has requested changes.`,
          href: submissionUrl,
        })
        if (submitter.notify_email) {
          sendChangesRequestedEmail({
            to: submitter.email,
            recipientName: submitter.name,
            submissionTitle: submission.title,
            reviewerName: user.name,
            comment: comment ?? undefined,
            submissionUrl,
          }).catch(err => console.error('[email] Failed to notify submitter of changes:', err))
        }
      }
    }

    // Notify all admins (in-app + email if enabled)
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        type: 'changes_requested',
        title: `Changes requested: "${submission.title}"`,
        body: `${user.name} has requested changes.`,
        href: submissionUrl,
      })
      if (admin.notify_email && admin.id !== submission.submitted_by) {
        sendChangesRequestedEmail({
          to: admin.email,
          recipientName: admin.name,
          submissionTitle: submission.title,
          reviewerName: user.name,
          comment: comment ?? undefined,
          submissionUrl,
        }).catch(err => console.error('[email] Failed to notify admin of changes:', err))
      }
    }
  }

  return NextResponse.json({ submission: await getSubmission(params.submissionId) })
}
