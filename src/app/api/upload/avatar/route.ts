import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { updateUser } from '@/lib/db'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 })

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type))
      return NextResponse.json({ error: 'Use JPEG, PNG, WebP, or GIF' }, { status: 400 })

    const ext = file.name.match(/\.[^.]+$/)?.[0] ?? '.jpg'
    const blob = await put(`avatars/${userId}-${Date.now()}${ext}`, file, {
      access: 'public',
      contentType: file.type,
    })

    await updateUser(userId, { avatar_url: blob.url })
    return NextResponse.json({ avatar_url: blob.url })
  } catch (err) {
    console.error('[avatar-upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
