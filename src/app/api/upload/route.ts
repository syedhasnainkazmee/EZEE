import { NextResponse } from 'next/server'
import { getSubmission, addDesign, getDesignCount } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  const formData = await req.formData()
  const submissionId = formData.get('submissionId') as string
  const files = formData.getAll('files') as File[]

  if (!submissionId || files.length === 0) {
    return NextResponse.json({ error: 'Missing submissionId or files' }, { status: 400 })
  }
  const submission = getSubmission(submissionId)
  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })

  const currentCount = getDesignCount(submissionId)
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const inserted = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = path.extname(file.name) || '.png'
    const filename = `${randomUUID()}${ext}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, Buffer.from(await file.arrayBuffer()))

    const orderIndex = currentCount + i
    const variationLabel = labels[orderIndex] ?? `V${orderIndex + 1}`

    const design = addDesign({
      submission_id: submissionId,
      filename,
      original_name: file.name,
      variation_label: variationLabel,
      order_index: orderIndex,
      version: submission.version,
    })
    inserted.push(design)
  }

  return NextResponse.json({ designs: inserted }, { status: 201 })
}
