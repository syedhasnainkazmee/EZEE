import { getOrgIntegration, upsertIntegration } from './db'

// ── Token management ───────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const data = await res.json() as { access_token: string; expires_in: number }
  return {
    access_token: data.access_token,
    expires_at:   new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

async function getValidToken(orgId: string): Promise<string | null> {
  const integration = await getOrgIntegration(orgId, 'google-drive')
  if (!integration?.access_token) return null

  const isExpired = integration.token_expires_at
    ? new Date(integration.token_expires_at) < new Date(Date.now() + 60_000)
    : false

  if (!isExpired) return integration.access_token
  if (!integration.refresh_token) return null

  const refreshed = await refreshAccessToken(integration.refresh_token)
  await upsertIntegration({
    org_id:           orgId,
    tool_id:          'google-drive',
    connected_by:     integration.connected_by,
    access_token:     refreshed.access_token,
    refresh_token:    integration.refresh_token,
    token_expires_at: refreshed.expires_at,
    account_email:    integration.account_email,
    account_name:     integration.account_name,
  })
  return refreshed.access_token
}

// ── Drive API helpers ──────────────────────────────────────────────────────

async function createFolder(accessToken: string, name: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  })
  if (!res.ok) throw new Error(`Failed to create folder "${name}": ${await res.text()}`)
  const data = await res.json() as { id: string }
  return data.id
}

async function setAnyoneCanView(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ role: 'reader', type: 'anyone' }),
  })
  if (!res.ok) console.error(`[drive] Failed to set permissions: ${await res.text()}`)
}

async function uploadFile(
  accessToken: string,
  folderId: string,
  filename: string,
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<void> {
  const metadata = JSON.stringify({ name: filename, parents: [folderId] })
  const boundary = '-------boundary_upload'

  const body = Buffer.concat([
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}`),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    Buffer.from(fileBuffer),
    Buffer.from(`\r\n--${boundary}--`),
  ])

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    },
  )
  if (!res.ok) throw new Error(`Failed to upload "${filename}": ${await res.text()}`)
}

// ── Public ─────────────────────────────────────────────────────────────────

/**
 * Creates a shared Drive folder, uploads all designs into it, and returns
 * the shareable folder URL. File uploads happen in the background so they
 * don't delay the response — only folder creation is awaited.
 */
export async function uploadApprovedDesigns(opts: {
  orgId:           string
  submissionTitle: string
  taskTitle:       string | null
  designs:         { filename: string; original_name: string }[]
}): Promise<string | null> {
  const { orgId, submissionTitle, taskTitle, designs } = opts

  const accessToken = await getValidToken(orgId)
  if (!accessToken) {
    console.log('[drive] No Google Drive integration for org — skipping upload')
    return null
  }

  const folderName = taskTitle
    ? `${taskTitle} — ${submissionTitle}`
    : submissionTitle

  // Create folder + make shareable (awaited — we need the URL before returning)
  const folderId = await createFolder(accessToken, folderName)
  await setAnyoneCanView(accessToken, folderId)
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`
  console.log(`[drive] Created shared folder: ${folderUrl}`)

  // Upload files in the background — don't block the review response
  Promise.all(designs.map(async (design) => {
    try {
      const fileRes = await fetch(design.filename)
      if (!fileRes.ok) throw new Error(`Could not fetch: ${design.filename}`)
      const buffer   = await fileRes.arrayBuffer()
      const mimeType = fileRes.headers.get('content-type') ?? 'image/jpeg'
      await uploadFile(accessToken, folderId, design.original_name, buffer, mimeType)
      console.log(`[drive] Uploaded "${design.original_name}"`)
    } catch (err) {
      console.error(`[drive] Failed to upload "${design.original_name}":`, err)
    }
  })).catch(err => console.error('[drive] Upload batch failed:', err))

  return folderUrl
}
