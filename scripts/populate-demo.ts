/**
 * Populate demo data for hasnain.kazmee@sunhub.com
 * Run from design-review/ with: npx tsx scripts/populate-demo.ts
 */
import Database from 'better-sqlite3'
import { hashSync } from 'bcryptjs'
import { randomUUID } from 'crypto'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'design-review.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Helpers ──────────────────────────────────────────────────────────────

const uid = () => randomUUID()
const now = new Date().toISOString()

function ago(days: number, hours = 0, mins = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(d.getHours() - hours)
  d.setMinutes(d.getMinutes() - mins)
  return d.toISOString()
}

function future(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function insert(table: string, row: Record<string, any>) {
  const keys   = Object.keys(row)
  const values = Object.values(row)
  db.prepare(
    `INSERT OR IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  ).run(...values)
}

// ── IDs ───────────────────────────────────────────────────────────────────

const orgId    = uid()
const hasnainId = uid()
const sarahId   = uid()
const omarId    = uid()
const fariaId   = uid()
const zaynId    = uid()

const wfId      = uid()
const wfStep1   = uid()
const wfStep2   = uid()
const wfStep3   = uid()

const proj1Id   = uid()  // Brand Identity 2025
const proj2Id   = uid()  // Social Media Q1

// submission IDs
const sub1Id = uid(); const sub2Id = uid(); const sub3Id = uid()
const sub4Id = uid(); const sub5Id = uid(); const sub6Id = uid()
const sub7Id = uid()

// task IDs
const task1Id = uid(); const task2Id = uid(); const task3Id = uid(); const task4Id = uid()
const task5Id = uid(); const task6Id = uid(); const task7Id = uid(); const task8Id = uid()

// ── 1. Organisation ───────────────────────────────────────────────────────

insert('organizations', {
  id: orgId, name: 'Sunhub', domain: 'sunhub.com', created_at: ago(60),
})
console.log('✔ Organisation: Sunhub')

// ── 2. Users ──────────────────────────────────────────────────────────────

const hasnainHash = hashSync('Kazmi123', 10)

// Upsert hasnain: insert or update password + org
const existingHasnain = db.prepare('SELECT id FROM users WHERE email = ?').get('hasnain.kazmee@sunhub.com') as any
if (existingHasnain) {
  db.prepare('UPDATE users SET password_hash = ?, org_id = ?, role = ? WHERE email = ?')
    .run(hasnainHash, orgId, 'admin', 'hasnain.kazmee@sunhub.com')
  console.log('✔ Updated existing user: Hasnain Kazmee (admin)')
} else {
  insert('users', {
    id: hasnainId, org_id: orgId, name: 'Hasnain Kazmee',
    email: 'hasnain.kazmee@sunhub.com', role: 'admin',
    token: uid(), password_hash: hasnainHash, notify_email: 1, created_at: ago(60),
  })
  console.log('✔ Created user: Hasnain Kazmee (admin)')
}

// Resolve hasnain's actual ID
const resolvedHasnain = db.prepare('SELECT id FROM users WHERE email = ?').get('hasnain.kazmee@sunhub.com') as any
const hId = resolvedHasnain?.id ?? hasnainId

insert('users', {
  id: sarahId, org_id: orgId, name: 'Sarah Al-Rashidi',
  email: 'sarah@sunhub.com', role: 'member',
  token: uid(), password_hash: hashSync('Password123!', 10), notify_email: 1, created_at: ago(55),
})

insert('users', {
  id: omarId, org_id: orgId, name: 'Omar Farouk',
  email: 'omar@sunhub.com', role: 'member',
  token: uid(), password_hash: hashSync('Password123!', 10), notify_email: 1, created_at: ago(50),
})

insert('users', {
  id: fariaId, org_id: orgId, name: 'Faria Siddiqui',
  email: 'faria@sunhub.com', role: 'member',
  token: uid(), password_hash: hashSync('Password123!', 10), notify_email: 1, created_at: ago(45),
})

insert('users', {
  id: zaynId, org_id: orgId, name: 'Zayn Mirza',
  email: 'zayn@sunhub.com', role: 'member',
  token: uid(), password_hash: hashSync('Password123!', 10), notify_email: 1, created_at: ago(40),
})
console.log('✔ Team members: Sarah, Omar, Faria, Zayn')

// ── 3. Workflow ───────────────────────────────────────────────────────────

insert('workflows', {
  id: wfId, org_id: orgId, name: 'Brand & Social Review',
  description: 'Standard approval chain for all brand and social design output.',
  is_active: 1, created_at: ago(55),
})

insert('workflow_steps', { id: wfStep1, workflow_id: wfId, step: 1, user_id: sarahId, focus: 'Visual design quality & brand consistency' })
insert('workflow_steps', { id: wfStep2, workflow_id: wfId, step: 2, user_id: omarId,  focus: 'Messaging, tone & copy accuracy' })
insert('workflow_steps', { id: wfStep3, workflow_id: wfId, step: 3, user_id: hId,     focus: 'Final sign-off & publishing approval' })
console.log('✔ Workflow: Brand & Social Review (3 steps)')

// ── 4. Projects ───────────────────────────────────────────────────────────

insert('projects', { id: proj1Id, org_id: orgId, name: 'Brand Identity 2025', description: 'Full rebrand — logo, guidelines, and digital assets.', created_at: ago(50) })
insert('projects', { id: proj2Id, org_id: orgId, name: 'Social Media Q1',     description: 'Instagram, LinkedIn, YouTube and Facebook content for Q1.', created_at: ago(40) })
console.log('✔ Projects: Brand Identity 2025, Social Media Q1')

// ── 5. Tasks ──────────────────────────────────────────────────────────────

// Brand Identity tasks
insert('tasks', { id: task1Id, project_id: proj1Id, title: 'Redesign company logo', description: 'Create 3 logo directions. Final must work on dark and light backgrounds.', assignor_id: hId, assignee_id: sarahId, due_date: future(5), priority: 'high', status: 'in_progress', created_at: ago(20) })
insert('tasks', { id: task2Id, project_id: proj1Id, title: 'Brand guidelines document', description: 'Compile typography, color, spacing, and usage rules into a single PDF.', assignor_id: hId, assignee_id: fariaId, due_date: future(14), priority: 'medium', status: 'open', created_at: ago(18) })
insert('tasks', { id: task3Id, project_id: proj1Id, title: 'Website hero banner set', description: 'Desktop + mobile variants for the homepage hero. Match new brand guidelines.', assignor_id: hId, assignee_id: sarahId, due_date: future(8), priority: 'high', status: 'open', created_at: ago(15) })
insert('tasks', { id: task4Id, project_id: proj1Id, title: 'Business card design', description: 'Standard and premium stock variants.', assignor_id: hId, assignee_id: zaynId, due_date: future(20), priority: 'low', status: 'completed', created_at: ago(30) })

// Social Media tasks
insert('tasks', { id: task5Id, project_id: proj2Id, title: 'Instagram carousel — Solar savings tips', description: '6-slide carousel for March. Use warm sunset palette.', assignor_id: hId, assignee_id: omarId, due_date: future(3), priority: 'high', status: 'in_progress', created_at: ago(10) })
insert('tasks', { id: task6Id, project_id: proj2Id, title: 'LinkedIn header redesign', description: 'Update company banner to reflect new brand direction.', assignor_id: hId, assignee_id: sarahId, due_date: future(7), priority: 'medium', status: 'open', created_at: ago(8) })
insert('tasks', { id: task7Id, project_id: proj2Id, title: 'Facebook spring campaign banner', description: 'Static and animated versions. Size: 1200×628.', assignor_id: hId, assignee_id: fariaId, due_date: future(6), priority: 'high', status: 'open', created_at: ago(6) })
insert('tasks', { id: task8Id, project_id: proj2Id, title: 'YouTube thumbnail templates', description: 'Create a reusable template set — bold title overlay on product image.', assignor_id: hId, assignee_id: zaynId, due_date: future(12), priority: 'low', status: 'open', created_at: ago(4) })
console.log('✔ Tasks (8)')

// Subtasks for task1 (logo redesign)
insert('subtasks', { id: uid(), task_id: task1Id, title: 'Research competitor logos', completed: 1, created_at: ago(19) })
insert('subtasks', { id: uid(), task_id: task1Id, title: 'Create 3 concept directions', completed: 1, created_at: ago(17) })
insert('subtasks', { id: uid(), task_id: task1Id, title: 'Refine chosen direction', completed: 0, created_at: ago(14) })
insert('subtasks', { id: uid(), task_id: task1Id, title: 'Prepare final files (SVG, PNG, PDF)', completed: 0, created_at: ago(14) })

// Subtasks for task5 (instagram carousel)
insert('subtasks', { id: uid(), task_id: task5Id, title: 'Write slide copy (6 slides)', completed: 1, created_at: ago(9) })
insert('subtasks', { id: uid(), task_id: task5Id, title: 'Design slide layouts', completed: 0, created_at: ago(9) })
insert('subtasks', { id: uid(), task_id: task5Id, title: 'Export in correct dimensions', completed: 0, created_at: ago(9) })
console.log('✔ Subtasks')

// ── 6. Submissions ────────────────────────────────────────────────────────

// sub1: Approved — logo directions
insert('submissions', { id: sub1Id, title: 'Logo Concept Directions v1', description: 'Three initial logo directions for the 2025 rebrand. Presented to the leadership team.', workflow_id: wfId, task_id: task1Id, submitted_by: sarahId, status: 'approved', current_step: null, version: 1, created_at: ago(25) })

// sub2: Changes requested — Instagram carousel
insert('submissions', { id: sub2Id, title: 'Instagram Carousel — Solar Savings', description: '6-slide carousel for March. Copy finalized, awaiting design sign-off.', workflow_id: wfId, task_id: task5Id, submitted_by: omarId, status: 'changes_requested', current_step: 1, version: 1, created_at: ago(6) })

// sub3: In review step 2 — LinkedIn header
insert('submissions', { id: sub3Id, title: 'LinkedIn Company Header', description: 'Updated company banner aligned to new brand direction. Awaiting final approval.', workflow_id: wfId, task_id: task6Id, submitted_by: sarahId, status: 'in_review', current_step: 2, version: 1, created_at: ago(3) })

// sub4: In review step 1 — Facebook banner
insert('submissions', { id: sub4Id, title: 'Facebook Spring Campaign Banner', description: 'Static 1200×628px and animated GIF versions for the spring push.', workflow_id: wfId, task_id: task7Id, submitted_by: fariaId, status: 'in_review', current_step: 1, version: 1, created_at: ago(1) })

// sub5: Draft — brand guidelines
insert('submissions', { id: sub5Id, title: 'Brand Guidelines Overview', description: 'Cover page + typography section. Full PDF to follow.', workflow_id: wfId, task_id: task2Id, submitted_by: fariaId, status: 'draft', current_step: null, version: 1, created_at: ago(2) })

// sub6: Approved — previous campaign
insert('submissions', { id: sub6Id, title: 'Q4 LinkedIn Campaign Graphics', description: 'End-of-year performance graphics. Approved and published Dec 2024.', workflow_id: wfId, task_id: null, submitted_by: sarahId, status: 'approved', current_step: null, version: 2, created_at: ago(40) })

// sub7: Changes requested — website banner
insert('submissions', { id: sub7Id, title: 'Website Hero Banner — Desktop', description: 'Homepage hero for new brand launch. Needs copy adjustment per brand lead feedback.', workflow_id: wfId, task_id: task3Id, submitted_by: zaynId, status: 'changes_requested', current_step: 2, version: 1, created_at: ago(4) })
console.log('✔ Submissions (7)')

// ── 7. Reviews ────────────────────────────────────────────────────────────

// sub1 reviews (full approval chain)
insert('reviews', { id: uid(), submission_id: sub1Id, reviewer_id: sarahId, action: 'approved', comment: 'Love direction B — strong and modern. My vote for this one.', version: 1, created_at: ago(23) })
insert('reviews', { id: uid(), submission_id: sub1Id, reviewer_id: omarId,  action: 'approved', comment: 'Copy-friendly — the wordmark scales well at small sizes.', version: 1, created_at: ago(22) })
insert('reviews', { id: uid(), submission_id: sub1Id, reviewer_id: hId,     action: 'approved', comment: 'Direction B it is. Proceed to full guidelines.', version: 1, created_at: ago(21) })

// sub2 review (changes requested by sarah)
insert('reviews', { id: uid(), submission_id: sub2Id, reviewer_id: sarahId, action: 'changes_requested', comment: 'Slide 3 feels too cluttered — reduce text and let the visual breathe. Also the CTA on slide 6 needs to be more prominent.', version: 1, created_at: ago(5) })

// sub3 reviews (step 1 approved, step 2 pending)
insert('reviews', { id: uid(), submission_id: sub3Id, reviewer_id: sarahId, action: 'approved', comment: 'Clean execution. Good use of the new primary blue.', version: 1, created_at: ago(2) })
insert('reviews', { id: uid(), submission_id: sub3Id, reviewer_id: omarId,  action: null,       comment: '', version: 1, created_at: ago(1) })

// sub4 review (step 1 pending)
insert('reviews', { id: uid(), submission_id: sub4Id, reviewer_id: sarahId, action: null, comment: '', version: 1, created_at: ago(0) })

// sub6 reviews (full chain, older)
insert('reviews', { id: uid(), submission_id: sub6Id, reviewer_id: sarahId, action: 'approved', comment: 'Solid work, consistent with Q4 campaign brief.', version: 2, created_at: ago(38) })
insert('reviews', { id: uid(), submission_id: sub6Id, reviewer_id: omarId,  action: 'approved', comment: 'Copy matches what we agreed. All good.', version: 2, created_at: ago(37) })
insert('reviews', { id: uid(), submission_id: sub6Id, reviewer_id: hId,     action: 'approved', comment: 'Approved. Schedule for Monday morning post.', version: 2, created_at: ago(36) })

// sub7 review (changes requested by omar)
insert('reviews', { id: uid(), submission_id: sub7Id, reviewer_id: sarahId, action: 'approved', comment: 'Visually strong. Handed to Omar for copy check.', version: 1, created_at: ago(3) })
insert('reviews', { id: uid(), submission_id: sub7Id, reviewer_id: omarId,  action: 'changes_requested', comment: '"Clean energy for a brighter tomorrow" is too generic. Need something specific to the product launch.', version: 1, created_at: ago(2) })
console.log('✔ Reviews')

// ── 8. Notifications ──────────────────────────────────────────────────────

insert('notifications', { id: uid(), user_id: hId, type: 'changes_requested', title: 'Changes requested on Instagram Carousel', body: 'Sarah: Slide 3 feels too cluttered — reduce text and let the visual breathe.', href: `/submission/${sub2Id}`, read: 0, created_at: ago(5) })
insert('notifications', { id: uid(), user_id: hId, type: 'review_needed',      title: 'LinkedIn Header needs your approval',   body: 'Step 3 of 3 — final sign-off required.', href: `/submission/${sub3Id}`, read: 0, created_at: ago(1) })
insert('notifications', { id: uid(), user_id: hId, type: 'submission_approved', title: 'Logo Concept Directions approved',       body: 'All 3 reviewers signed off. Ready to proceed.', href: `/submission/${sub1Id}`, read: 1, created_at: ago(21) })
insert('notifications', { id: uid(), user_id: hId, type: 'changes_requested',  title: 'Changes requested on Website Hero Banner', body: 'Omar: "Clean energy for a brighter tomorrow" is too generic.', href: `/submission/${sub7Id}`, read: 0, created_at: ago(2) })
insert('notifications', { id: uid(), user_id: hId, type: 'task_assigned',       title: 'Task assigned: Instagram Carousel',        body: 'Due in 3 days — Solar savings tips, 6 slides.', href: `/tasks`, read: 1, created_at: ago(10) })
console.log('✔ Notifications')

// ── Done ──────────────────────────────────────────────────────────────────

console.log('\n🎉 Demo data populated successfully!')
console.log(`   Login: hasnain.kazmee@sunhub.com  |  Kazmi123`)
console.log(`   Org:   Sunhub (${orgId})`)
console.log(`   Users: Hasnain (admin), Sarah, Omar, Faria, Zayn`)
console.log(`   Projects: Brand Identity 2025, Social Media Q1`)
console.log(`   Submissions: 7 (2 approved, 2 in review, 2 changes requested, 1 draft)`)
console.log(`   Tasks: 8 across both projects`)
