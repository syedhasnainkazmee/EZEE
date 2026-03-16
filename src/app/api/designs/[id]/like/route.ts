import { NextRequest, NextResponse } from 'next/server'
import { toggleDesignLike } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const liked = await toggleDesignLike(params.id)
    return NextResponse.json({ liked })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 })
  }
}
