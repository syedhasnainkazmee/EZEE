import { NextRequest, NextResponse } from 'next/server'
import { addTaskAttachment, getTaskAttachments } from '@/lib/db'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'
import path from 'path'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ attachments: await getTaskAttachments(params.id) })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })

    const ext = path.extname(file.name)
    const filename = `${randomUUID()}${ext}`

    const blob = await put(`attachments/${filename}`, file, { access: 'public' })

    const attachment = await addTaskAttachment({
      task_id: params.id,
      filename: blob.url,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
      uploaded_by: userId,
    })

    return NextResponse.json({ attachment }, { status: 201 })
  } catch (err) {
    console.error('[task-attachment]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
