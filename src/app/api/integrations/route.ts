import { NextRequest, NextResponse } from 'next/server'
import { getOrgIntegrations, connectIntegration, disconnectIntegration } from '@/lib/db'

export async function GET(request: NextRequest) {
  const orgId = request.headers.get('x-org-id')
  if (!orgId) return NextResponse.json({ integrations: [] })
  const integrations = await getOrgIntegrations(orgId)
  return NextResponse.json({ integrations })
}

export async function POST(request: NextRequest) {
  const orgId  = request.headers.get('x-org-id')
  const userId = request.headers.get('x-user-id')
  if (!orgId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tool_id } = await request.json()
  if (!tool_id) return NextResponse.json({ error: 'tool_id required' }, { status: 400 })
  const integration = await connectIntegration(orgId, tool_id, userId)
  return NextResponse.json({ integration })
}

export async function DELETE(request: NextRequest) {
  const orgId = request.headers.get('x-org-id')
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tool_id } = await request.json()
  if (!tool_id) return NextResponse.json({ error: 'tool_id required' }, { status: 400 })
  await disconnectIntegration(orgId, tool_id)
  return NextResponse.json({ ok: true })
}
