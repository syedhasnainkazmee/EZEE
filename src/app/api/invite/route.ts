import { NextRequest, NextResponse } from 'next/server'
import { createInvitation, getOrg, getUserByEmail } from '@/lib/db'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const orgId  = request.headers.get('x-org-id')
  const role   = request.headers.get('x-user-role')
  const sender = request.headers.get('x-user-name')

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { email, role: inviteRole = 'member' } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const cleanEmail = email.toLowerCase().trim()

    // Check if user already exists and has a password
    const existing = await getUserByEmail(cleanEmail)
    if (existing?.password_hash) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    // Domain validation
    if (orgId) {
      const org = await getOrg(orgId)
      if (org?.domain) {
        const domain = cleanEmail.split('@')[1]
        if (domain !== org.domain) {
          return NextResponse.json({ error: `Only @${org.domain} addresses are allowed` }, { status: 400 })
        }
      }
    }

    const inv = await createInvitation(orgId || 'default', cleanEmail, inviteRole as 'admin' | 'member')

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/accept-invite?token=${inv.token}`

    const org = orgId ? await getOrg(orgId) : null

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'EZEE <onboarding@resend.dev>',
        to: cleanEmail,
        subject: `You've been invited to ${org?.name ?? 'EZEE'}`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#FBFBF9">
            <div style="background:#E05236;padding:32px 40px;border-radius:16px 16px 0 0">
              <h1 style="color:white;font-size:24px;margin:0;font-weight:700">EZEE</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Team workspace</p>
            </div>
            <div style="padding:40px;background:white;border-radius:0 0 16px 16px;border:1px solid #E5E3DF;border-top:none">
              <h2 style="font-size:20px;color:#1C1917;margin:0 0 12px">You've been invited!</h2>
              <p style="color:#57534E;font-size:15px;line-height:1.6;margin:0 0 24px">
                <strong>${sender ?? 'An admin'}</strong> has invited you to join <strong>${org?.name ?? 'the workspace'}</strong> on EZEE — the design review and project management platform.
              </p>
              <a href="${inviteUrl}" style="display:inline-block;background:#E05236;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">
                Accept Invitation →
              </a>
              <p style="color:#A8A29E;font-size:12px;margin:24px 0 0">This link expires in 72 hours. If you didn't expect this invitation, you can ignore this email.</p>
            </div>
          </div>
        `,
      })
    }

    return NextResponse.json({ message: 'Invitation sent', invitation_id: inv.id })
  } catch (err) {
    console.error('[invite]', err)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}
