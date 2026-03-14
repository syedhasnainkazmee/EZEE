import { NextRequest, NextResponse } from 'next/server'
import { deleteTaskAttachment } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; attachmentId: string } }) {
  const result = deleteTaskAttachment(params.attachmentId)
  if (!result) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })

  // Delete the file from disk
  try {
    await unlink(path.join(process.cwd(), 'public', 'uploads', result.filename))
  } catch { /* File may already be gone */ }

  return NextResponse.json({ ok: true })
}
