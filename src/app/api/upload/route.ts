import { NextResponse } from 'next/server'
import { getSubmission, addDesign, getDesignCount } from '@/lib/db'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'
import path from 'path'

export async function POST(req: Request) {
  const formData = await req.formData()
  const submissionId = formData.get('submissionId') as string
  const files = formData.getAll('files') as File[]

  if (!submissionId || files.length === 0) {
    return NextResponse.json({ error: 'Missing submissionId or files' }, { status: 400 })
  }
  const submission = await getSubmission(submissionId)
  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  try {
    const currentCount = await getDesignCount(submissionId)
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const inserted = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = path.extname(file.name) || '.png'
      const filename = `${randomUUID()}${ext}`

      const blob = await put(`designs/${filename}`, file, { access: 'public' })

      const orderIndex = currentCount + i
      const variationLabel = labels[orderIndex] ?? `V${orderIndex + 1}`

      const design = await addDesign({
        submission_id: submissionId,
        filename: blob.url,
        original_name: file.name,
        variation_label: variationLabel,
        order_index: orderIndex,
        version: submission.version,
      })
      inserted.push(design)
    }

    return NextResponse.json({ designs: inserted }, { status: 201 })
  } catch (err: any) {
    console.error('[upload]', err)
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 })
  }
}
