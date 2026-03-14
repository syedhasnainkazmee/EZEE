import { NextResponse } from 'next/server'
import { getAllProjects, createProject } from '@/lib/db'

export async function GET() {
  return NextResponse.json({ projects: getAllProjects() })
}

export async function POST(req: Request) {
  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const project = createProject(name.trim(), description?.trim() ?? '')
  return NextResponse.json({ project }, { status: 201 })
}
