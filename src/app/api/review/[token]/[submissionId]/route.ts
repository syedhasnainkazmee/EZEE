import { NextResponse } from 'next/server'
import {
  getUserByToken, getSubmission, upsertReview, updateSubmission,
  getNextWorkflowStep, getWorkflowStep, getTotalSteps, getAllUsers, getWorkflow
} from '@/lib/db'
import { sendReviewEmail, sendFinalApprovalEmail } from '@/lib/email'

export async function POST(req: Request, { params }: { params: { token: string; submissionId: string } }) {
  const { action, comment } = await req.json()

  if (!['approved', 'changes_requested'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const user = getUserByToken(params.token)
  if (!user) return NextResponse.json({ error: 'Invalid review link' }, { status: 404 })

  const submission = getSubmission(params.submissionId)
  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  // Verify this user is the current step's reviewer
  const currentStep = getWorkflowStep(submission.workflow_id, submission.current_step ?? -1)
  if (!currentStep || currentStep.user_id !== user.id) {
    return NextResponse.json({ error: 'This submission is not currently at your review step' }, { status: 400 })
  }

  upsertReview(params.submissionId, user.id, submission.version, action, comment ?? '')

  const total = getTotalSteps(submission.workflow_id)

  if (action === 'approved') {
    const next = getNextWorkflowStep(submission.workflow_id, submission.current_step!)
    if (next?.user) {
      updateSubmission(params.submissionId, { current_step: next.step })
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
    } else {
      updateSubmission(params.submissionId, { status: 'approved', current_step: null })
      console.log(`[email] Submission "${submission.title}" fully approved.`)
      
      const workflow = getWorkflow(submission.workflow_id)
      const allUsers = getAllUsers()
      const admins = allUsers.filter(u => u.role === 'admin')
      const reviewerEmails = workflow?.steps.map(s => s.user?.email).filter(Boolean) as string[] || []
      const emailsToNotify = Array.from(new Set([...admins.map(a => a.email), ...reviewerEmails]))
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
      const submissionUrl = `${baseUrl}/submission/${submission.id}`

      Promise.all(emailsToNotify.map(email => 
        sendFinalApprovalEmail({
          to: email,
          submissionTitle: submission.title,
          submissionUrl
        })
      )).then(() => {
        console.log(`[email] Sent final approval notices to ${emailsToNotify.join(', ')}`)
      }).catch(err => console.error('[email] Failed to send final approvals:', err))
    }
  } else {
    updateSubmission(params.submissionId, { status: 'changes_requested', current_step: null })
  }

  return NextResponse.json({ submission: getSubmission(params.submissionId) })
}
