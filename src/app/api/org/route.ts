import { NextRequest, NextResponse } from 'next/server'
import { getOrg, updateOrg, getAllInvitations, deleteInvitation } from '@/lib/db'

export async function GET(request: NextRequest) {
  const orgId = request.headers.get('x-org-id')
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 404 })

  const org = getOrg(orgId)
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const invitations = getAllInvitations(orgId)
  return NextResponse.json({ org, invitations })
}

export async function PUT(request: NextRequest) {
  const orgId = request.headers.get('x-org-id')
  const role  = request.headers.get('x-user-role')
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 404 })

  const updates = await request.json()
  const org = updateOrg(orgId, { name: updates.name, domain: updates.domain })
  return NextResponse.json({ org })
}

export async function DELETE(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { invitation_id } = await request.json()
  if (invitation_id) {
    deleteInvitation(invitation_id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'invitation_id required' }, { status: 400 })
}
