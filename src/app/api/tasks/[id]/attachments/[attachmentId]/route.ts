import { NextRequest, NextResponse } from 'next/server'
import { deleteTaskAttachment } from '@/lib/db'
import { del } from '@vercel/blob'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; attachmentId: string } }) {
  const result = await deleteTaskAttachment(params.attachmentId)
  if (!result) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })

  try {
    await del(result.filename)
  } catch { /* Blob may already be gone */ }

  return NextResponse.json({ ok: true })
}
