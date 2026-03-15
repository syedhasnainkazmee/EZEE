import SetupClient from './SetupClient'

// Force dynamic so this always runs as a Node.js server component (never statically cached)
export const dynamic = 'force-dynamic'

// Multiple organisations are supported — the setup page is always accessible.
// Duplicate org name/domain validation is handled by the /api/org/setup endpoint.
export default function SetupPage() {
  return <SetupClient />
}
