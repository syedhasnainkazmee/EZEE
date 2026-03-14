/**
 * One-time migration: data.json → design-review.db
 * Run from the project root: npx tsx scripts/migrate-from-json.ts
 * Safe to re-run — uses INSERT OR IGNORE semantics.
 */

import fs   from 'fs'
import path from 'path'

// Importing schema initialises the DB and creates tables
import {
  db,
  users, workflows, workflow_steps, submissions, designs, reviews, annotations,
} from '../src/lib/schema'

const DATA_PATH = path.join(process.cwd(), 'data.json')

if (!fs.existsSync(DATA_PATH)) {
  console.log('No data.json found — nothing to migrate.')
  process.exit(0)
}

const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))

// Handle legacy format that had 'reviewers' instead of 'users'
let data = raw
if (raw.reviewers && !raw.users) {
  const { randomUUID } = require('crypto')
  const wfId = randomUUID()
  data = {
    users: raw.reviewers.map((r: any) => ({
      id: r.id, name: r.name,
      email: r.email ?? 'hasnain.kazmee@sunhub.com',
      role: r.role === 'Marketing Director' ? 'admin' : 'member',
      token: r.token, created_at: new Date().toISOString(),
    })),
    workflows: [{ id: wfId, name: 'Social Media Design Review', description: 'Default approval chain.', is_active: 1, created_at: new Date().toISOString() }],
    workflow_steps: raw.reviewers.map((r: any) => ({
      id: randomUUID(), workflow_id: wfId, step: r.step, user_id: r.id, focus: r.focus,
    })),
    submissions: (raw.submissions ?? []).map((s: any) => ({ ...s, workflow_id: s.workflow_id ?? wfId })),
    designs:     raw.designs     ?? [],
    reviews:     raw.reviews     ?? [],
    annotations: raw.annotations ?? [],
  }
}

const counts: Record<string, number> = {}

function insert<T extends object>(table: any, rows: T[], label: string) {
  let n = 0
  for (const row of rows) {
    try {
      db.insert(table).values(row as any).onConflictDoNothing().run()
      n++
    } catch (e) {
      console.warn(`  ⚠ Skipped ${label} row:`, (e as Error).message)
    }
  }
  counts[label] = n
}

// Insert in dependency order
insert(users,          data.users          ?? [], 'users')
insert(workflows,      data.workflows      ?? [], 'workflows')
insert(workflow_steps, data.workflow_steps ?? [], 'workflow_steps')
insert(submissions,    data.submissions    ?? [], 'submissions')
insert(designs,        data.designs        ?? [], 'designs')
insert(reviews,        data.reviews        ?? [], 'reviews')
insert(annotations,    data.annotations    ?? [], 'annotations')

console.log('\n✓ Migration complete\n')
for (const [table, count] of Object.entries(counts)) {
  console.log(`  ${table.padEnd(16)} ${count} rows`)
}
console.log()
