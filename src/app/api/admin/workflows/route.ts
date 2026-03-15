import { NextResponse } from 'next/server'
import { getAllWorkflows, createWorkflow } from '@/lib/db'

export async function GET() {
  return NextResponse.json({ workflows: await getAllWorkflows() })
}

export async function POST(req: Request) {
  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const workflow = await createWorkflow(name.trim(), description?.trim() ?? '')
  return NextResponse.json({ workflow }, { status: 201 })
}
