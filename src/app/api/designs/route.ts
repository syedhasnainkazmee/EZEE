import { NextRequest, NextResponse } from 'next/server'
import { addDesign, getSubmission } from '@/lib/db'

type DesignInput = {
  blobUrl: string
  originalName: string
  variationLabel: string
  orderIndex: number
  version: number
}

export async function POST(req: NextRequest) {
  const { submissionId, designs } = await req.json()
  if (!submissionId || !Array.isArray(designs) || designs.length === 0) {
    return NextResponse.json({ error: 'Missing submissionId or designs' }, { status: 400 })
  }

  const submission = await getSubmission(submissionId)
  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const inserted = []
  for (const d of designs as DesignInput[]) {
    const design = await addDesign({
      submission_id: submissionId,
      filename: d.blobUrl,
      original_name: d.originalName,
      variation_label: d.variationLabel,
      order_index: d.orderIndex,
      version: d.version,
    })
    inserted.push(design)
  }

  return NextResponse.json({ designs: inserted }, { status: 201 })
}
