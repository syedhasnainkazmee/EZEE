import { redirect } from 'next/navigation'
import { getFirstOrg } from '@/lib/db'
import SetupClient from './SetupClient'

// Force dynamic so this always runs as a Node.js server component (never statically cached)
export const dynamic = 'force-dynamic'

// Server component — runs on the server before sending any HTML to the browser.
// If an org already exists the user is redirected to /login instantly,
// with no client-side flash or timing race.
export default function SetupPage() {
  const org = getFirstOrg()
  if (org) redirect('/login')
  return <SetupClient />
}
