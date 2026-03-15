import { NextRequest, NextResponse } from 'next/server'
import { getSubtasks, createSubtask } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ subtasks: await getSubtasks(params.id) })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  const subtask = await createSubtask(params.id, title.trim())
  return NextResponse.json({ subtask }, { status: 201 })
}
