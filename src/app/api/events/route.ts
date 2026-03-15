import { NextRequest } from 'next/server'
import { getNotifications, getReviewsByUserStep, getSubmission } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  const submissionId = req.nextUrl.searchParams.get('submissionId')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const deadline = Date.now() + 55_000

      req.signal.addEventListener('abort', () => { closed = true })

      function send(event: string, data: object) {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      let lastUnread = -1
      let lastPending = -1
      let lastStatus = ''
      let lastStep = -1

      send('heartbeat', { t: Date.now() })

      while (!closed && Date.now() < deadline) {
        try {
          if (userId) {
            const [notifs, reviews] = await Promise.all([
              getNotifications(userId, true),
              getReviewsByUserStep(userId),
            ])
            const unread = notifs.length
            const pending = reviews.filter((r: any) => r.my_action === null && r.status === 'in_review').length

            if (unread !== lastUnread || pending !== lastPending) {
              lastUnread = unread
              lastPending = pending
              send('badges', { unread, pending })
            }
          }

          if (submissionId) {
            const sub = await getSubmission(submissionId)
            if (sub) {
              if (sub.status !== lastStatus || (sub.current_step ?? 0) !== lastStep) {
                lastStatus = sub.status
                lastStep = sub.current_step ?? 0
                send('submission', { status: sub.status, current_step: sub.current_step, version: sub.version, drive_folder_url: sub.drive_folder_url })
              }
            }
          }
        } catch (err) {
          console.error('[SSE poll]', err)
        }

        await new Promise(resolve => setTimeout(resolve, 3_000))
      }

      if (!closed) {
        try { controller.close() } catch {}
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
