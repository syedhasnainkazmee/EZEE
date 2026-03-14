import { NextRequest, NextResponse } from 'next/server'
import { getTask, updateTask, deleteTask, getSubtasks, getTaskAttachments } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const task = getTask(params.id)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const subtasks    = getSubtasks(params.id)
  const attachments = getTaskAttachments(params.id)
  return NextResponse.json({ task, subtasks, attachments })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')
  const role   = req.headers.get('x-user-role')
  const task   = getTask(params.id)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // Only assignor or admin can update
  if (role !== 'admin' && task.assignor_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates = await req.json()
  const updated = updateTask(params.id, updates)
  return NextResponse.json({ task: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deleted = deleteTask(params.id)
  if (!deleted) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
