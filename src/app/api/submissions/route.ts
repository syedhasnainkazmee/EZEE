import { NextResponse } from 'next/server'
import { getAllSubmissions, createSubmission, updateTaskStatus, getTask, getUserById } from '@/lib/db'
import { sendTaskInReviewEmail } from '@/lib/email'

export async function GET() {
  return NextResponse.json({ submissions: await getAllSubmissions() })
}

export async function POST(req: Request) {
  const userId = (req as any).headers.get('x-user-id') ?? null
  const { title, description, workflow_id, task_id } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!workflow_id) return NextResponse.json({ error: 'workflow_id is required' }, { status: 400 })
  const submission = await createSubmission(title.trim(), description?.trim() ?? '', workflow_id, task_id, userId)

  if (task_id) {
    await updateTaskStatus(task_id, 'in_review')
    const task = await getTask(task_id)
    if (task && task.assignee_id) {
      const user = await getUserById(task.assignee_id)
      if (user && user.notify_email) {
        sendTaskInReviewEmail({
          to: user.email,
          assigneeName: user.name,
          taskTitle: task.title,
          submissionTitle: submission.title
        }).catch(console.error)
      }
    }
  }

  return NextResponse.json({ submission }, { status: 201 })
}
