import { NextRequest, NextResponse } from 'next/server'
import { getUserById, getAllTasks, getAllSubmissions } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const user = await getUserById(id)
  if (!user) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const [allTasks, allSubmissions] = await Promise.all([
    getAllTasks(),
    getAllSubmissions(),
  ])

  // Task stats
  const userTasks = allTasks.filter(t => t.assignee_id === id)
  const tasks_assigned = userTasks.length
  const tasks_completed = userTasks.filter(t => t.status === 'completed').length
  const tasks_open = userTasks.filter(t => t.status !== 'completed').length

  // Submission stats
  const userSubs = allSubmissions.filter(s => s.submitted_by === id)
  const submissions_total = userSubs.length
  const submissions_approved = userSubs.filter(s => s.status === 'approved').length
  const submissions_in_review = userSubs.filter(s => s.status === 'in_review').length

  // Recent tasks (last 5 where assignee or assignor)
  const recentTasks = allTasks
    .filter(t => t.assignee_id === id || t.assignor_id === id)
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      assignee: t.assignee ? { name: t.assignee.name } : null,
      assignor: t.assignor ? { name: t.assignor.name } : null,
    }))

  // Recent submissions (last 5)
  const recentSubmissions = userSubs.slice(0, 5).map(s => ({
    id: s.id,
    title: s.title,
    status: s.status,
    created_at: s.created_at,
  }))

  return NextResponse.json({
    member: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url ?? null,
      token: user.token,
      created_at: user.created_at,
    },
    stats: {
      tasks_assigned,
      tasks_completed,
      tasks_open,
      submissions_total,
      submissions_approved,
      submissions_in_review,
    },
    recentTasks,
    recentSubmissions,
  })
}
