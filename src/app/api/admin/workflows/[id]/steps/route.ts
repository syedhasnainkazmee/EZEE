import { NextResponse } from 'next/server'
import { setWorkflowSteps } from '@/lib/db'

// PUT /api/admin/workflows/[id]/steps — replace all steps
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { steps } = await req.json()
  if (!Array.isArray(steps)) return NextResponse.json({ error: 'steps must be an array' }, { status: 400 })
  const saved = setWorkflowSteps(params.id, steps)
  return NextResponse.json({ steps: saved })
}
