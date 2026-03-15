import { NextResponse } from 'next/server'
import { getLibrarySubmissions } from '@/lib/db'

export async function GET() {
  const items = await getLibrarySubmissions()
  return NextResponse.json({ items })
}
