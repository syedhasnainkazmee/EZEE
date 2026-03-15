import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { addDesign } from '@/lib/db'

export async function POST(request: Request) {
  const body = await request.json() as HandleUploadBody
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
          tokenPayload: clientPayload ?? '',
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { submissionId, orderIndex, variationLabel, originalName, version } = JSON.parse(tokenPayload ?? '{}')
        await addDesign({
          submission_id: submissionId,
          filename: blob.url,
          original_name: originalName,
          variation_label: variationLabel,
          order_index: orderIndex,
          version,
        })
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (err: any) {
    console.error('[upload]', err)
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 })
  }
}
