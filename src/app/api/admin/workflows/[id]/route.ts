import { NextResponse } from 'next/server'
import { getWorkflow, updateWorkflow, deleteWorkflow } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const wf = getWorkflow(params.id)
  if (!wf) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ workflow: wf })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const updates = await req.json()
  const wf = updateWorkflow(params.id, updates)
  if (!wf) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ workflow: wf })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  deleteWorkflow(params.id)
  return NextResponse.json({ ok: true })
}
