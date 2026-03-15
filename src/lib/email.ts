import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type ReviewEmailOptions = {
  to: string
  reviewerName: string
  reviewerRole: string
  reviewerFocus: string
  submissionTitle: string
  reviewToken: string
  step: number
  totalSteps: number
  previousApprover?: string
}

export async function sendReviewEmail(opts: ReviewEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping.')
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const reviewUrl = `${baseUrl}/review/${opts.reviewToken}`
  const stepLabel = opts.step === opts.totalSteps ? 'Final Approval' : `Step ${opts.step} of ${opts.totalSteps}`

  const logoSvg = `<span style="font-family:Arial Black,Impact,sans-serif;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;">EZEE</span>`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#FBFBF9;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1C1917;}
    .wrap{max-width:560px;margin:40px auto;padding:0 16px;}
    .card{background:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #EAE5E0;box-shadow:0 12px 24px -6px rgba(28,25,23,0.08),0 4px 12px -3px rgba(28,25,23,0.04);}
    .hdr{background:#1C1917;padding:36px 40px 32px;}
    .hdr-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
    .desk-label{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.8);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;padding:6px 14px;border-radius:100px;border:1px solid rgba(255,255,255,0.12);}
    .hdr h1{font-family:'Outfit',sans-serif;color:#FFFFFF;font-size:24px;font-weight:600;margin:0 0 8px;line-height:1.2;letter-spacing:-0.02em;}
    .hdr p{color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;}
    .body{padding:36px 40px;}
    .step-row{display:flex;align-items:center;gap:10px;margin-bottom:24px;}
    .step-dot{width:8px;height:8px;border-radius:50%;background:#E05236;flex-shrink:0;box-shadow:0 0 0 4px rgba(224,82,54,0.15);}
    .step-txt{font-size:12px;font-weight:600;color:#E05236;text-transform:uppercase;letter-spacing:0.8px;}
    .submission-box{background:#FBFBF9;border:1px solid #EAE5E0;border-left:4px solid #1C1917;border-radius:0 16px 16px 0;padding:20px 24px;margin:0 0 20px;}
    .box-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#78716C;margin-bottom:6px;}
    .box-value{font-family:'Outfit',sans-serif;font-size:18px;font-weight:600;color:#1C1917;line-height:1.4;}
    .focus-box{background:rgba(224,82,54,0.04);border:1px solid rgba(224,82,54,0.15);border-radius:16px;padding:20px 24px;margin-bottom:24px;}
    .focus-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#BF4027;margin-bottom:8px;}
    .focus-text{font-size:15px;color:#1C1917;line-height:1.6;font-weight:500;}
    .prev-box{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:16px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#166534;display:flex;align-items:center;gap:10px;}
    .divider{border:none;border-top:1px solid #EAE5E0;margin:32px 0;}
    .cta{text-align:center;margin:32px 0 16px;}
    .btn{background:#E05236;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:16px;font-weight:600;display:inline-block;letter-spacing:0.3px;box-shadow:0 8px 16px -4px rgba(224,82,54,0.3);font-family:'Outfit',sans-serif;}
    .url-hint{text-align:center;font-size:12px;color:#A8A29E;margin-top:16px;word-break:break-all;padding:0 24px;}
    .foot{background:#FBFBF9;padding:24px 40px;text-align:center;border-top:1px solid #EAE5E0;}
    .foot p{font-size:12px;color:#78716C;}
    .foot strong{color:#1C1917;font-weight:600;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <!-- Header -->
      <div class="hdr">
        <div class="hdr-top">
          ${logoSvg}
          <span class="desk-label">Desk</span>
        </div>
        <h1>Approval needed: "${opts.submissionTitle}"</h1>
        <p>Hi ${opts.reviewerName} &mdash; a submission is waiting for your review.</p>
      </div>

      <!-- Body -->
      <div class="body">
        <div class="step-row">
          <div class="step-dot"></div>
          <span class="step-txt">${stepLabel} &nbsp;&middot;&nbsp; ${opts.reviewerRole}</span>
        </div>

        <div class="submission-box">
          <div class="box-label">Submission</div>
          <div class="box-value">${opts.submissionTitle}</div>
        </div>

        <div class="focus-box">
          <div class="focus-label">Your review scope</div>
          <div class="focus-text">${opts.reviewerFocus}</div>
        </div>

        ${opts.previousApprover ? `
        <div class="prev-box">
          <span style="font-size:18px;">&check;</span> <span><strong>${opts.previousApprover}</strong> has already approved this and passed it to you.</span>
        </div>` : ''}

        <hr class="divider"/>

        <div class="cta">
          <a class="btn" href="${reviewUrl}">Open Review &rarr;</a>
        </div>
        <div class="url-hint">${reviewUrl}</div>
      </div>

      <!-- Footer -->
      <div class="foot">
        <p><strong>EZEE</strong> &nbsp;&middot;&nbsp; Automated approval workflow</p>
      </div>
    </div>
  </div>
</body>
</html>`.trim()

  try {
    const { data, error } = await resend.emails.send({
      from: 'EZEE <onboarding@resend.dev>',
      to: opts.to,
      subject: `[EZEE] Review needed: "${opts.submissionTitle}"`,
      html,
    })
    if (error) console.error('[email] Resend error:', error)
    else console.log('[email] Sent to', opts.to, '— id:', data?.id)
  } catch (err) {
    console.error('[email] Failed:', err)
  }
}

export type TaskEmailOptions = {
  to: string
  assigneeName: string
  assignorName?: string
  taskTitle: string
  projectName: string
}

export async function sendTaskAssignedEmail(opts: TaskEmailOptions) {
  if (!process.env.RESEND_API_KEY) return

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const taskUrl = `${baseUrl}/tasks`
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#FBFBF9;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1C1917;}
    .wrap{max-width:560px;margin:40px auto;padding:0 16px;}
    .card{background:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #EAE5E0;box-shadow:0 12px 24px -6px rgba(28,25,23,0.08),0 4px 12px -3px rgba(28,25,23,0.04);}
    .hdr{background:#1C1917;padding:36px 40px 32px;}
    .hdr h1{font-family:'Outfit',sans-serif;color:#FFFFFF;font-size:24px;font-weight:600;margin:0 0 8px;line-height:1.2;letter-spacing:-0.02em;}
    .hdr p{color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;}
    .body{padding:36px 40px;}
    .submission-box{background:#FBFBF9;border:1px solid #EAE5E0;border-left:4px solid #1C1917;border-radius:0 16px 16px 0;padding:20px 24px;margin:0 0 20px;}
    .box-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#78716C;margin-bottom:6px;}
    .box-value{font-family:'Outfit',sans-serif;font-size:18px;font-weight:600;color:#1C1917;line-height:1.4;}
    .cta{text-align:center;margin:32px 0 16px;}
    .btn{background:#E05236;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:16px;font-weight:600;display:inline-block;letter-spacing:0.3px;box-shadow:0 8px 16px -4px rgba(224,82,54,0.3);font-family:'Outfit',sans-serif;}
    .foot{background:#FBFBF9;padding:24px 40px;text-align:center;border-top:1px solid #EAE5E0;}
    .foot p{font-size:12px;color:#78716C;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <h1>New Task: "${opts.taskTitle}"</h1>
        <p>Hi ${opts.assigneeName} &mdash; ${opts.assignorName ? `<strong>${opts.assignorName}</strong> assigned a new task to you.` : 'a new task has been assigned to you.'}</p>
      </div>
      <div class="body">
        <div class="submission-box">
          <div class="box-label">Project</div>
          <div class="box-value">${opts.projectName}</div>
        </div>
        <div class="cta">
          <a class="btn" href="${taskUrl}">View Tasks &rarr;</a>
        </div>
      </div>
      <div class="foot">
        <p><strong>EZEE</strong> &nbsp;&middot;&nbsp; Automated workflow</p>
      </div>
    </div>
  </div>
</body>
</html>`
  try {
    await resend.emails.send({
      from: 'EZEE <onboarding@resend.dev>',
      to: opts.to,
      subject: `[EZEE] New Task: "${opts.taskTitle}"`,
      html,
    })
  } catch (err) { console.error('[email]', err) }
}

export async function sendTaskInReviewEmail(opts: { to: string, assigneeName: string, taskTitle: string, submissionTitle: string }) {
  if (!process.env.RESEND_API_KEY) return

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const tasksUrl = `${baseUrl}/tasks`
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#FBFBF9;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1C1917;}
    .wrap{max-width:560px;margin:40px auto;padding:0 16px;}
    .card{background:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #EAE5E0;box-shadow:0 12px 24px -6px rgba(28,25,23,0.08),0 4px 12px -3px rgba(28,25,23,0.04);}
    .hdr{background:#1C1917;padding:36px 40px 32px;}
    .hdr h1{font-family:'Outfit',sans-serif;color:#FFFFFF;font-size:24px;font-weight:600;margin:0 0 8px;line-height:1.2;letter-spacing:-0.02em;}
    .hdr p{color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;}
    .body{padding:36px 40px;}
    .submission-box{background:#FBFBF9;border:1px solid #EAE5E0;border-left:4px solid #1C1917;border-radius:0 16px 16px 0;padding:20px 24px;margin:0 0 16px;}
    .box-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#78716C;margin-bottom:6px;}
    .box-value{font-family:'Outfit',sans-serif;font-size:18px;font-weight:600;color:#1C1917;line-height:1.4;}
    .cta{text-align:center;margin:32px 0 16px;}
    .btn{background:#E05236;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:16px;font-weight:600;display:inline-block;letter-spacing:0.3px;box-shadow:0 8px 16px -4px rgba(224,82,54,0.3);font-family:'Outfit',sans-serif;}
    .foot{background:#FBFBF9;padding:24px 40px;text-align:center;border-top:1px solid #EAE5E0;}
    .foot p{font-size:12px;color:#78716C;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <h1>Your task is now in review</h1>
        <p>Hi ${opts.assigneeName} &mdash; a submission linked to your task has entered the review pipeline.</p>
      </div>
      <div class="body">
        <div class="submission-box">
          <div class="box-label">Task</div>
          <div class="box-value">${opts.taskTitle}</div>
        </div>
        <div class="submission-box">
          <div class="box-label">Submission</div>
          <div class="box-value">${opts.submissionTitle}</div>
        </div>
        <div class="cta">
          <a class="btn" href="${tasksUrl}">View Tasks &rarr;</a>
        </div>
      </div>
      <div class="foot">
        <p><strong>EZEE</strong> &nbsp;&middot;&nbsp; Automated workflow</p>
      </div>
    </div>
  </div>
</body>
</html>`
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'EZEE <onboarding@resend.dev>',
      to: opts.to,
      subject: `[EZEE] Task in review: "${opts.taskTitle}"`,
      html,
    })
  } catch (err) { console.error('[email]', err) }
}

export async function sendChangesRequestedEmail(opts: {
  to: string
  recipientName: string
  submissionTitle: string
  reviewerName: string
  comment?: string
  submissionUrl: string
}) {
  if (!process.env.RESEND_API_KEY) return

  const commentBlock = opts.comment ? `
        <div style="background:#FEF3C7;border:1px solid #FDE68A;border-left:4px solid #D97706;border-radius:0 16px 16px 0;padding:20px 24px;margin:0 0 24px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#92400E;margin-bottom:8px;">Reviewer comment</div>
          <div style="font-size:15px;color:#1C1917;line-height:1.6;font-style:italic;">"${opts.comment}"</div>
        </div>` : ''

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#FBFBF9;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1C1917;}
    .wrap{max-width:560px;margin:40px auto;padding:0 16px;}
    .card{background:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #EAE5E0;box-shadow:0 12px 24px -6px rgba(28,25,23,0.08),0 4px 12px -3px rgba(28,25,23,0.04);}
    .hdr{background:#B45309;padding:36px 40px 32px;}
    .hdr h1{font-family:'Outfit',sans-serif;color:#FFFFFF;font-size:24px;font-weight:600;margin:0 0 8px;line-height:1.2;letter-spacing:-0.02em;}
    .hdr p{color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6;}
    .body{padding:36px 40px;}
    .submission-box{background:#FBFBF9;border:1px solid #EAE5E0;border-left:4px solid #B45309;border-radius:0 16px 16px 0;padding:20px 24px;margin:0 0 24px;}
    .box-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#78716C;margin-bottom:6px;}
    .box-value{font-family:'Outfit',sans-serif;font-size:18px;font-weight:600;color:#1C1917;line-height:1.4;}
    .reviewer-row{font-size:14px;color:#57534E;margin-bottom:24px;}
    .cta{text-align:center;margin:32px 0 16px;}
    .btn{background:#B45309;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:16px;font-weight:600;display:inline-block;letter-spacing:0.3px;box-shadow:0 8px 16px -4px rgba(180,83,9,0.3);font-family:'Outfit',sans-serif;}
    .foot{background:#FBFBF9;padding:24px 40px;text-align:center;border-top:1px solid #EAE5E0;}
    .foot p{font-size:12px;color:#78716C;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <h1>Changes requested: "${opts.submissionTitle}"</h1>
        <p>Hi ${opts.recipientName} &mdash; a reviewer has requested changes to this submission.</p>
      </div>
      <div class="body">
        <div class="submission-box">
          <div class="box-label">Submission</div>
          <div class="box-value">${opts.submissionTitle}</div>
        </div>
        <div class="reviewer-row">Requested by <strong>${opts.reviewerName}</strong></div>
        ${commentBlock}
        <div class="cta">
          <a class="btn" href="${opts.submissionUrl}">View Submission &rarr;</a>
        </div>
      </div>
      <div class="foot">
        <p><strong>EZEE</strong> &nbsp;&middot;&nbsp; Automated workflow</p>
      </div>
    </div>
  </div>
</body>
</html>`
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'EZEE <onboarding@resend.dev>',
      to: opts.to,
      subject: `[EZEE] Changes requested: "${opts.submissionTitle}"`,
      html,
    })
  } catch (err) { console.error('[email]', err) }
}

export async function sendWelcomeEmail(opts: { to: string, name: string, orgName: string }) {
  if (!process.env.RESEND_API_KEY) return

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#FBFBF9;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1C1917;}
    .wrap{max-width:560px;margin:40px auto;padding:0 16px;}
    .card{background:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #EAE5E0;box-shadow:0 12px 24px -6px rgba(28,25,23,0.08),0 4px 12px -3px rgba(28,25,23,0.04);}
    .hdr{background:#047857;padding:36px 40px 32px;}
    .hdr h1{font-family:'Outfit',sans-serif;color:#FFFFFF;font-size:24px;font-weight:600;margin:0 0 8px;line-height:1.2;letter-spacing:-0.02em;}
    .hdr p{color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6;}
    .body{padding:36px 40px;}
    .info-box{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:16px;padding:20px 24px;margin:0 0 24px;font-size:15px;color:#166534;line-height:1.6;}
    .cta{text-align:center;margin:32px 0 16px;}
    .btn{background:#047857;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:16px;font-weight:600;display:inline-block;letter-spacing:0.3px;box-shadow:0 8px 16px -4px rgba(4,120,87,0.3);font-family:'Outfit',sans-serif;}
    .foot{background:#FBFBF9;padding:24px 40px;text-align:center;border-top:1px solid #EAE5E0;}
    .foot p{font-size:12px;color:#78716C;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <h1>Welcome to ${opts.orgName}!</h1>
        <p>Hi ${opts.name} &mdash; your account is ready. You're all set to get started.</p>
      </div>
      <div class="body">
        <div class="info-box">
          You now have access to <strong>${opts.orgName}</strong> on EZEE &mdash; your design review and project management workspace. Head to your dashboard to see your tasks and reviews.
        </div>
        <div class="cta">
          <a class="btn" href="${baseUrl}">Go to Dashboard &rarr;</a>
        </div>
      </div>
      <div class="foot">
        <p><strong>EZEE</strong> &nbsp;&middot;&nbsp; Design review platform</p>
      </div>
    </div>
  </div>
</body>
</html>`
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'EZEE <onboarding@resend.dev>',
      to: opts.to,
      subject: `Welcome to ${opts.orgName} on EZEE!`,
      html,
    })
  } catch (err) { console.error('[email]', err) }
}

export async function sendFinalApprovalEmail(opts: { to: string, submissionTitle: string, submissionUrl: string }) {
  if (!process.env.RESEND_API_KEY) return

  const logoSvg = `<span style="font-family:Arial Black,Impact,sans-serif;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;">EZEE</span>`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#FBFBF9;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1C1917;}
    .wrap{max-width:560px;margin:40px auto;padding:0 16px;}
    .card{background:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #EAE5E0;box-shadow:0 12px 24px -6px rgba(28,25,23,0.08),0 4px 12px -3px rgba(28,25,23,0.04);}
    .hdr{background:#047857;padding:36px 40px 32px;}
    .hdr h1{font-family:'Outfit',sans-serif;color:#FFFFFF;font-size:24px;font-weight:600;margin:0 0 8px;line-height:1.2;letter-spacing:-0.02em;}
    .hdr p{color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6;}
    .body{padding:36px 40px;}
    .submission-box{background:#FBFBF9;border:1px solid #EAE5E0;border-left:4px solid #10B981;border-radius:0 16px 16px 0;padding:20px 24px;margin:0 0 20px;}
    .cta{text-align:center;margin:32px 0 16px;}
    .btn{background:#10B981;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:16px;font-weight:600;display:inline-block;letter-spacing:0.3px;box-shadow:0 8px 16px -4px rgba(16,185,129,0.3);font-family:'Outfit',sans-serif;}
    .foot{background:#FBFBF9;padding:24px 40px;text-align:center;border-top:1px solid #EAE5E0;}
    .foot p{font-size:12px;color:#78716C;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <div style="margin-bottom:24px;">${logoSvg}</div>
        <h1>Fully Approved: "${opts.submissionTitle}"</h1>
        <p>The submission has successfully passed all reviews!</p>
      </div>
      <div class="body">
        <div class="submission-box">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#78716C;margin-bottom:6px;">Submission</div>
          <div style="font-size:18px;font-weight:600;color:#1C1917;">${opts.submissionTitle}</div>
        </div>
        <div class="cta">
          <a class="btn" href="${opts.submissionUrl}">View Submission &rarr;</a>
        </div>
      </div>
      <div class="foot">
        <p><strong>EZEE</strong> &nbsp;&middot;&nbsp; Automated workflow</p>
      </div>
    </div>
  </div>
</body>
</html>`
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'EZEE <onboarding@resend.dev>',
      to: opts.to,
      subject: `[EZEE] Approved: "${opts.submissionTitle}"`,
      html,
    })
  } catch (err) { console.error('[email]', err) }
}
