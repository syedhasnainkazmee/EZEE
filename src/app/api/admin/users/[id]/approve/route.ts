import { NextRequest, NextResponse } from 'next/server'
import { getUserById, approveUser } from '@/lib/db'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const role = _req.headers.get('x-user-role')
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await getUserById(params.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await approveUser(params.id)

    // Send approval email
    if (process.env.RESEND_API_KEY) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
      const loginUrl = `${baseUrl}/login`
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'EZEE <onboarding@resend.dev>',
          to: user.email,
          subject: '[EZEE] Your access request has been approved',
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#FBFBF9;font-family:Arial,sans-serif;color:#1C1917;}
    .wrap{max-width:560px;margin:40px auto;padding:0 16px;}
    .card{background:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #EAE5E0;}
    .hdr{background:#047857;padding:36px 40px 32px;}
    .hdr h1{color:#FFFFFF;font-size:24px;font-weight:600;margin:0 0 8px;}
    .hdr p{color:rgba(255,255,255,0.8);font-size:15px;}
    .body{padding:36px 40px;}
    .info{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:16px;padding:20px 24px;margin:0 0 24px;font-size:15px;color:#166534;}
    .cta{text-align:center;margin:32px 0 16px;}
    .btn{background:#047857;color:#fff;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:16px;font-weight:600;display:inline-block;}
    .foot{background:#FBFBF9;padding:24px 40px;text-align:center;border-top:1px solid #EAE5E0;}
    .foot p{font-size:12px;color:#78716C;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <h1>Access Approved!</h1>
        <p>Hi ${user.name} — your request to join the workspace has been approved.</p>
      </div>
      <div class="body">
        <div class="info">You can now log in to EZEE and access your workspace. Click the button below to get started.</div>
        <div class="cta">
          <a class="btn" href="${loginUrl}">Log In Now &rarr;</a>
        </div>
      </div>
      <div class="foot">
        <p><strong>EZEE</strong> &nbsp;&middot;&nbsp; Design review platform</p>
      </div>
    </div>
  </div>
</body>
</html>`,
        })
      } catch (emailErr) {
        console.error('[approve] email error:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[approve]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
