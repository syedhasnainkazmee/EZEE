import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { updateUser } from '@/lib/db'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' }, { status: 400 })
    }

    const ext = path.extname(file.name) || '.jpg'
    const filename = `${randomUUID()}${ext}`

    const avatarsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    await mkdir(avatarsDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(avatarsDir, filename), buffer)

    const avatar_url = `/uploads/avatars/${filename}`

    await updateUser(userId, { avatar_url })

    return NextResponse.json({ avatar_url }, { status: 200 })
  } catch (err) {
    console.error('[avatar-upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
