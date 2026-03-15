import { NextResponse } from 'next/server'
import { getSubmission, updateSubmission, addDesign, getDesignCount } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const submission = await getSubmission(params.id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'changes_requested') {
    return NextResponse.json({ error: 'Submission must be in changes_requested status to resubmit' }, { status: 400 })
  }

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'Upload at least one design' }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })

  // Bump version but keep as draft — user will explicitly click "Send for Review"
  const newVersion = submission.version + 1
  const updated = await updateSubmission(params.id, { version: newVersion, status: 'draft', current_step: null })

  const currentCount = await getDesignCount(params.id)
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  const inserted = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = path.extname(file.name) || '.png'
    const filename = `${randomUUID()}${ext}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, Buffer.from(await file.arrayBuffer()))

    const orderIndex = currentCount + i
    const variationLabel = labels[i] ?? `V${i + 1}`

    const design = await addDesign({
      submission_id: params.id,
      filename,
      original_name: file.name,
      variation_label: variationLabel,
      order_index: orderIndex,
      version: newVersion,
    })
    inserted.push(design)
  }

  return NextResponse.json({ submission: updated, designs: inserted }, { status: 201 })
}
