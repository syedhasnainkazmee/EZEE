import { NextRequest, NextResponse } from 'next/server'
import { updateSubtask, deleteSubtask } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; subtaskId: string } }) {
  const updates = await req.json()
  const subtask = updateSubtask(params.subtaskId, updates)
  if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
  return NextResponse.json({ subtask })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; subtaskId: string } }) {
  const deleted = deleteSubtask(params.subtaskId)
  if (!deleted) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
