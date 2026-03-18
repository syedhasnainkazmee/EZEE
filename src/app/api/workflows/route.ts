import { NextResponse } from 'next/server'
import { getAllWorkflows } from '@/lib/db'

// Accessible to all authenticated users — needed for the submit form
export async function GET() {
  const all = await getAllWorkflows()
  return NextResponse.json({ workflows: all.filter(w => w.is_active) })
}
