import { NextRequest, NextResponse } from 'next/server'
import { getAllTasks, createTask, getUserById, getAllProjects } from '@/lib/db'
import { sendTaskAssignedEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const project_id  = url.searchParams.get('project_id') || undefined
  const userId      = req.headers.get('x-user-id')
  const userRole    = req.headers.get('x-user-role')

  // Members only see their assigned tasks; admins see all
  const assignee_filter = (userRole === 'member' && userId) ? userId : undefined
  return NextResponse.json({ tasks: getAllTasks(project_id, assignee_filter) })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  const { title, description, project_id, assignee_id, due_date, priority } = await req.json()
  if (!title?.trim() || !project_id) {
    return NextResponse.json({ error: 'Title and project_id are required' }, { status: 400 })
  }

  const task = createTask(
    project_id, title.trim(), description?.trim() ?? '',
    userId ?? null, assignee_id ?? null,
    { due_date, priority }
  )

  if (assignee_id && assignee_id !== userId) {
    const user    = getUserById(assignee_id)
    const assignor = userId ? getUserById(userId) : null
    const projects = getAllProjects()
    const project  = projects.find(p => p.id === project_id)
    if (user && project && user.notify_email) {
      sendTaskAssignedEmail({
        to: user.email,
        assigneeName: user.name,
        assignorName: assignor?.name,
        taskTitle: task.title,
        projectName: project.name
      }).catch(console.error)
    }
  }

  return NextResponse.json({ task }, { status: 201 })
}
