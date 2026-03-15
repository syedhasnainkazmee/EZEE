import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ── Table definitions ──────────────────────────────────────────────────────

export const organizations = sqliteTable('organizations', {
  id:         text('id').primaryKey(),
  name:       text('name').notNull(),
  domain:     text('domain').notNull().default(''),
  created_at: text('created_at').notNull(),
})

export const users = sqliteTable('users', {
  id:            text('id').primaryKey(),
  org_id:        text('org_id'),
  name:          text('name').notNull(),
  email:         text('email').notNull(),
  role:          text('role').notNull().$type<'admin' | 'member'>(),
  token:         text('token').notNull(),           // magic review-link token (legacy, kept)
  password_hash: text('password_hash'),             // null until invite accepted
  notify_email:  integer('notify_email', { mode: 'boolean' }).notNull().default(true),
  created_at:    text('created_at').notNull(),
})

export const user_sessions = sqliteTable('user_sessions', {
  id:         text('id').primaryKey(),
  user_id:    text('user_id').notNull(),
  jti:        text('jti').notNull(),
  expires_at: text('expires_at').notNull(),
  created_at: text('created_at').notNull(),
})

export const invitation_tokens = sqliteTable('invitation_tokens', {
  id:         text('id').primaryKey(),
  org_id:     text('org_id').notNull(),
  email:      text('email').notNull(),
  role:       text('role').notNull().$type<'admin' | 'member'>(),
  token:      text('token').notNull(),
  used:       integer('used', { mode: 'boolean' }).notNull().default(false),
  expires_at: text('expires_at').notNull(),
  created_at: text('created_at').notNull(),
})

export const workflows = sqliteTable('workflows', {
  id:          text('id').primaryKey(),
  org_id:      text('org_id'),
  name:        text('name').notNull(),
  description: text('description').notNull().default(''),
  is_active:   integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at:  text('created_at').notNull(),
})

export const workflow_steps = sqliteTable('workflow_steps', {
  id:          text('id').primaryKey(),
  workflow_id: text('workflow_id').notNull(),
  step:        integer('step').notNull(),
  user_id:     text('user_id').notNull(),
  focus:       text('focus').notNull(),
})

export const submissions = sqliteTable('submissions', {
  id:           text('id').primaryKey(),
  title:        text('title').notNull(),
  description:  text('description').notNull().default(''),
  workflow_id:  text('workflow_id').notNull(),
  task_id:      text('task_id'),
  submitted_by: text('submitted_by'),
  status:       text('status').notNull().default('draft')
                  .$type<'draft' | 'in_review' | 'approved' | 'changes_requested'>(),
  current_step: integer('current_step'),
  version:      integer('version').notNull().default(1),
  created_at:   text('created_at').notNull(),
})

export const projects = sqliteTable('projects', {
  id:          text('id').primaryKey(),
  org_id:      text('org_id'),
  name:        text('name').notNull(),
  description: text('description').notNull().default(''),
  created_at:  text('created_at').notNull(),
})

export const tasks = sqliteTable('tasks', {
  id:          text('id').primaryKey(),
  project_id:  text('project_id').notNull(),
  title:       text('title').notNull(),
  description: text('description').notNull().default(''),
  assignor_id: text('assignor_id'),
  assignee_id: text('assignee_id'),
  due_date:    text('due_date'),
  priority:    text('priority').notNull().default('medium').$type<'low' | 'medium' | 'high'>(),
  status:      text('status').notNull().default('open')
                 .$type<'open' | 'in_progress' | 'in_review' | 'completed'>(),
  created_at:  text('created_at').notNull(),
})

export const subtasks = sqliteTable('subtasks', {
  id:         text('id').primaryKey(),
  task_id:    text('task_id').notNull(),
  title:      text('title').notNull(),
  completed:  integer('completed', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull(),
})

export const task_attachments = sqliteTable('task_attachments', {
  id:            text('id').primaryKey(),
  task_id:       text('task_id').notNull(),
  filename:      text('filename').notNull(),
  original_name: text('original_name').notNull(),
  mime_type:     text('mime_type').notNull(),
  size:          integer('size').notNull(),
  uploaded_by:   text('uploaded_by').notNull(),
  created_at:    text('created_at').notNull(),
})

export const designs = sqliteTable('designs', {
  id:              text('id').primaryKey(),
  submission_id:   text('submission_id').notNull(),
  filename:        text('filename').notNull(),
  original_name:   text('original_name').notNull(),
  variation_label: text('variation_label').notNull(),
  order_index:     integer('order_index').notNull(),
  version:         integer('version').notNull().default(1),
})

export const reviews = sqliteTable('reviews', {
  id:            text('id').primaryKey(),
  submission_id: text('submission_id').notNull(),
  reviewer_id:   text('reviewer_id').notNull(),
  action:        text('action').$type<'approved' | 'changes_requested' | null>(),
  comment:       text('comment').notNull().default(''),
  version:       integer('version').notNull().default(1),
  created_at:    text('created_at').notNull(),
})

export const annotations = sqliteTable('annotations', {
  id:            text('id').primaryKey(),
  design_id:     text('design_id').notNull(),
  submission_id: text('submission_id').notNull(),
  reviewer_id:   text('reviewer_id').notNull(),
  x:             real('x').notNull(),
  y:             real('y').notNull(),
  comment:       text('comment').notNull(),
  number:        integer('number').notNull(),
  created_at:    text('created_at').notNull(),
})

export const notifications = sqliteTable('notifications', {
  id:         text('id').primaryKey(),
  user_id:    text('user_id').notNull(),
  type:       text('type').notNull()
                .$type<'task_assigned' | 'review_needed' | 'submission_approved' | 'changes_requested' | 'invited'>(),
  title:      text('title').notNull(),
  body:       text('body').notNull().default(''),
  href:       text('href'),
  read:       integer('read', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull(),
})

// ── Database instance ──────────────────────────────────────────────────────

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:./design-review.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client)
