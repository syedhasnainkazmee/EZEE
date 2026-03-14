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

  // Sunhub SVG logo as inline data URI (navy on white)
  const logoSvg = `<svg width="96" height="22" viewBox="0 0 121 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.488281 23.9331L4.15957 22.157C5.73298 23.6197 6.88682 24.351 9.29938 24.351C12.1315 24.351 13.8098 22.9928 13.8098 20.7988C13.8098 18.7093 12.8658 17.4555 8.56512 15.7839C3.32042 13.6944 1.22254 11.8138 1.22254 7.8437C1.22254 3.66463 4.47426 0.948242 9.29938 0.948242C13.0756 0.948242 15.4881 2.41091 17.586 4.50045L14.0196 6.38102C12.9707 5.33626 11.5022 4.50045 9.19449 4.50045C6.46724 4.50045 5.20851 5.96312 5.20851 7.63474C5.20851 9.6198 6.04767 10.6646 10.3483 12.3362C15.8028 14.5302 17.9007 16.5153 17.9007 20.5898C17.9007 24.9779 14.5441 27.9032 9.29938 27.9032C5.5232 27.9032 2.58616 26.3361 0.488281 23.9331Z" fill="white"/><path d="M22.2017 19.9601V7.94531H26.1876V19.4377C26.1876 23.0944 27.4464 24.5571 29.9638 24.5571C32.3764 24.5571 34.1596 23.0944 34.1596 19.5422V7.94531H38.1456V27.5869H34.1596V25.4974C33.0057 26.96 31.3274 28.0048 28.9149 28.0048C24.6142 27.9003 22.2017 25.3929 22.2017 19.9601Z" fill="white"/><path d="M42.5503 7.84271H46.5363V9.93224C47.6901 8.46957 49.3684 7.4248 51.781 7.4248C55.8718 7.4248 58.3893 9.93224 58.3893 15.365V27.3798H54.4033V15.8874C54.4033 12.2307 53.1446 10.7681 50.6271 10.7681C48.2146 10.7681 46.4314 12.2307 46.4314 15.7829L46.5363 27.4843H42.5503V7.84271Z" fill="white"/><path d="M63.0048 2.40495L66.9908 0.210938V9.92726C68.1446 8.46459 69.8229 7.41982 72.2355 7.41982C76.3263 7.41982 78.8438 9.92726 78.8438 15.36V27.3748H74.8578V15.8824C74.8578 12.2257 73.5991 10.7631 71.0816 10.7631C68.6691 10.7631 66.8859 12.2257 66.8859 15.7779V27.3748H62.8999L63.0048 2.40495Z" fill="white"/><path d="M83.459 19.8547V7.83984H87.445V19.3323C87.445 22.9889 88.7037 24.4516 91.2211 24.4516C93.6337 24.4516 95.4169 22.9889 95.4169 19.4367V7.83984H99.4029V27.4814H95.4169V25.3919C94.2631 26.8546 92.5848 27.8993 90.1722 27.8993C85.9764 27.8993 83.459 25.2874 83.459 19.8547Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M107.9 27.4822V25.4972C109.159 26.8554 110.732 27.9001 113.145 27.9001C117.341 27.9001 120.487 24.4524 120.487 17.4525C120.382 10.557 117.341 7.5272 113.459 7.5272C110.942 7.5272 109.264 8.67644 107.9 10.0346V0.00488281L103.914 2.30337V27.4822H107.9ZM112.305 10.7646C114.928 10.7646 116.396 12.6452 116.396 17.4511C116.396 22.2571 115.138 24.4511 112.41 24.4511C110.417 24.4511 108.844 23.4063 107.9 22.0481V13.0631C109.054 11.7049 110.522 10.7646 112.305 10.7646Z" fill="white"/></svg>`

  const html = `
<!DOCTYPE html>
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
        <p><strong>Process</strong> &nbsp;&middot;&nbsp; Automated approval workflow</p>
      </div>
    </div>
  </div>
</body>
</html>`.trim()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Process <onboarding@resend.dev>',
      to: opts.to,
      subject: `[Process] Review needed: "${opts.submissionTitle}"`,
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
        <p><strong>Process</strong> &nbsp;&middot;&nbsp; Automated workflow</p>
      </div>
    </div>
  </div>
</body>
</html>`
  try {
    await resend.emails.send({
      from: 'Process <onboarding@resend.dev>',
      to: opts.to,
      subject: `[Process] New Task: "${opts.taskTitle}"`,
      html,
    })
  } catch (err) { console.error('[email]', err) }
}

export async function sendTaskInReviewEmail(opts: { to: string, assigneeName: string, taskTitle: string, submissionTitle: string }) {
  if (!process.env.RESEND_API_KEY) return

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const html = `<!DOCTYPE html>
<html>
<head>
  <style>body{font-family:Arial,sans-serif;}</style>
</head>
<body>
  <h2>Your Task is In Review</h2>
  <p>Hi ${opts.assigneeName},</p>
  <p>A submission <strong>"${opts.submissionTitle}"</strong> has been tied to your task <strong>"${opts.taskTitle}"</strong> and is now in the review pipeline.</p>
</body>
</html>`
  try {
    await resend.emails.send({
      from: 'Process <onboarding@resend.dev>',
      to: opts.to,
      subject: `[Process] Task In Review: "${opts.taskTitle}"`,
      html,
    })
} catch (err) { console.error('[email]', err) }
}

export async function sendFinalApprovalEmail(opts: { to: string, submissionTitle: string, submissionUrl: string }) {
  if (!process.env.RESEND_API_KEY) return

  const logoSvg = `<svg width="96" height="22" viewBox="0 0 121 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.488281 23.9331L4.15957 22.157C5.73298 23.6197 6.88682 24.351 9.29938 24.351C12.1315 24.351 13.8098 22.9928 13.8098 20.7988C13.8098 18.7093 12.8658 17.4555 8.56512 15.7839C3.32042 13.6944 1.22254 11.8138 1.22254 7.8437C1.22254 3.66463 4.47426 0.948242 9.29938 0.948242C13.0756 0.948242 15.4881 2.41091 17.586 4.50045L14.0196 6.38102C12.9707 5.33626 11.5022 4.50045 9.19449 4.50045C6.46724 4.50045 5.20851 5.96312 5.20851 7.63474C5.20851 9.6198 6.04767 10.6646 10.3483 12.3362C15.8028 14.5302 17.9007 16.5153 17.9007 20.5898C17.9007 24.9779 14.5441 27.9032 9.29938 27.9032C5.5232 27.9032 2.58616 26.3361 0.488281 23.9331Z" fill="white"/><path d="M22.2017 19.9601V7.94531H26.1876V19.4377C26.1876 23.0944 27.4464 24.5571 29.9638 24.5571C32.3764 24.5571 34.1596 23.0944 34.1596 19.5422V7.94531H38.1456V27.5869H34.1596V25.4974C33.0057 26.96 31.3274 28.0048 28.9149 28.0048C24.6142 27.9003 22.2017 25.3929 22.2017 19.9601Z" fill="white"/><path d="M42.5503 7.84271H46.5363V9.93224C47.6901 8.46957 49.3684 7.4248 51.781 7.4248C55.8718 7.4248 58.3893 9.93224 58.3893 15.365V27.3798H54.4033V15.8874C54.4033 12.2307 53.1446 10.7681 50.6271 10.7681C48.2146 10.7681 46.4314 12.2307 46.4314 15.7829L46.5363 27.4843H42.5503V7.84271Z" fill="white"/><path d="M63.0048 2.40495L66.9908 0.210938V9.92726C68.1446 8.46459 69.8229 7.41982 72.2355 7.41982C76.3263 7.41982 78.8438 9.92726 78.8438 15.36V27.3748H74.8578V15.8824C74.8578 12.2257 73.5991 10.7631 71.0816 10.7631C68.6691 10.7631 66.8859 12.2257 66.8859 15.7779V27.3748H62.8999L63.0048 2.40495Z" fill="white"/><path d="M83.459 19.8547V7.83984H87.445V19.3323C87.445 22.9889 88.7037 24.4516 91.2211 24.4516C93.6337 24.4516 95.4169 22.9889 95.4169 19.4367V7.83984H99.4029V27.4814H95.4169V25.3919C94.2631 26.8546 92.5848 27.8993 90.1722 27.8993C85.9764 27.8993 83.459 25.2874 83.459 19.8547Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M107.9 27.4822V25.4972C109.159 26.8554 110.732 27.9001 113.145 27.9001C117.341 27.9001 120.487 24.4524 120.487 17.4525C120.382 10.557 117.341 7.5272 113.459 7.5272C110.942 7.5272 109.264 8.67644 107.9 10.0346V0.00488281L103.914 2.30337V27.4822H107.9ZM112.305 10.7646C114.928 10.7646 116.396 12.6452 116.396 17.4511C116.396 22.2571 115.138 24.4511 112.41 24.4511C110.417 24.4511 108.844 23.4063 107.9 22.0481V13.0631C109.054 11.7049 110.522 10.7646 112.305 10.7646Z" fill="white"/></svg>`

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
        <p><strong>Process</strong> &nbsp;&middot;&nbsp; Automated workflow</p>
      </div>
    </div>
  </div>
</body>
</html>`
  try {
    await resend.emails.send({
      from: 'Process <onboarding@resend.dev>',
      to: opts.to,
      subject: `[Process] Approved: "${opts.submissionTitle}"`,
      html,
    })
  } catch (err) { console.error('[email]', err) }
}
