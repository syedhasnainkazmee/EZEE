import { NextResponse } from 'next/server'
import { getSubmission, updateSubmission, addDesign, getDesignCount, getWorkflowStep, getTotalSteps } from '@/lib/db'
import { sendReviewEmail } from '@/lib/email'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const submission = getSubmission(params.id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'changes_requested') {
    return NextResponse.json({ error: 'Submission must be in changes_requested status to resubmit' }, { status: 400 })
  }

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'Upload at least one design' }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })

  // Increment version and reset review flow
  const newVersion = submission.version + 1
  const updated = updateSubmission(params.id, { version: newVersion, status: 'in_review', current_step: 1 })

  const currentCount = getDesignCount(params.id)
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  const inserted = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = path.extname(file.name) || '.png'
    const filename = `${randomUUID()}${ext}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, Buffer.from(await file.arrayBuffer()))

    // Restart labeling for simplicity A, B for new items, but keep orderIndex unique
    const orderIndex = currentCount + i
    const variationLabel = labels[i] ?? `V${i + 1}`

    const design = addDesign({
      submission_id: params.id,
      filename,
      original_name: file.name,
      variation_label: variationLabel,
      order_index: orderIndex,
      version: newVersion,
    })
    inserted.push(design)
  }

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
      console.log(`[email] Notified ${step.user!.name} for step 1 of Resubmission V${newVersion}`)
    }).catch(err => {
      console.error('[email] Failed to notify step 1 reviewer:', err)
    })
  } else {
    console.warn('[email] No step-1 reviewer found for workflow', submission.workflow_id)
  }

  return NextResponse.json({ submission: updated, designs: inserted }, { status: 201 })
}
