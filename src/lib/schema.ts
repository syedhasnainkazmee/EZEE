import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import path from 'path'

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

const sqlite = new Database(path.join(process.cwd(), 'design-review.db'))
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Bootstrap tables on startup — idempotent, safe to run every time
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    domain     TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    org_id        TEXT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    role          TEXT NOT NULL,
    token         TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    notify_email  INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    jti        TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invitation_tokens (
    id         TEXT PRIMARY KEY,
    org_id     TEXT NOT NULL,
    email      TEXT NOT NULL,
    role       TEXT NOT NULL,
    token      TEXT NOT NULL UNIQUE,
    used       INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workflows (
    id          TEXT PRIMARY KEY,
    org_id      TEXT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workflow_steps (
    id          TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    step        INTEGER NOT NULL,
    user_id     TEXT NOT NULL,
    focus       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    workflow_id  TEXT NOT NULL,
    task_id      TEXT,
    submitted_by TEXT,
    status       TEXT NOT NULL DEFAULT 'draft',
    current_step INTEGER,
    version      INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS designs (
    id              TEXT PRIMARY KEY,
    submission_id   TEXT NOT NULL,
    filename        TEXT NOT NULL,
    original_name   TEXT NOT NULL,
    variation_label TEXT NOT NULL,
    order_index     INTEGER NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id            TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    reviewer_id   TEXT NOT NULL,
    action        TEXT,
    comment       TEXT NOT NULL DEFAULT '',
    version       INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS annotations (
    id            TEXT PRIMARY KEY,
    design_id     TEXT NOT NULL,
    submission_id TEXT NOT NULL,
    reviewer_id   TEXT NOT NULL,
    x             REAL NOT NULL,
    y             REAL NOT NULL,
    comment       TEXT NOT NULL,
    number        INTEGER NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    org_id      TEXT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    assignor_id TEXT,
    assignee_id TEXT,
    due_date    TEXT,
    priority    TEXT NOT NULL DEFAULT 'medium',
    status      TEXT NOT NULL DEFAULT 'open',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id         TEXT PRIMARY KEY,
    task_id    TEXT NOT NULL,
    title      TEXT NOT NULL,
    completed  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_attachments (
    id            TEXT PRIMARY KEY,
    task_id       TEXT NOT NULL,
    filename      TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type     TEXT NOT NULL,
    size          INTEGER NOT NULL,
    uploaded_by   TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    href       TEXT,
    read       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`)

// Migration guards for existing deployments
try { sqlite.exec('ALTER TABLE submissions ADD COLUMN task_id TEXT;') } catch (e) {}
try { sqlite.exec('ALTER TABLE submissions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;') } catch (e) {}
try { sqlite.exec('ALTER TABLE submissions ADD COLUMN submitted_by TEXT;') } catch (e) {}
try { sqlite.exec('ALTER TABLE designs ADD COLUMN version INTEGER NOT NULL DEFAULT 1;') } catch (e) {}
try { sqlite.exec('ALTER TABLE reviews ADD COLUMN version INTEGER NOT NULL DEFAULT 1;') } catch (e) {}
try { sqlite.exec('ALTER TABLE tasks ADD COLUMN assignor_id TEXT;') } catch (e) {}
try { sqlite.exec('ALTER TABLE tasks ADD COLUMN due_date TEXT;') } catch (e) {}
try { sqlite.exec('ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT \'medium\';') } catch (e) {}
try { sqlite.exec('ALTER TABLE users ADD COLUMN org_id TEXT;') } catch (e) {}
try { sqlite.exec('ALTER TABLE users ADD COLUMN password_hash TEXT;') } catch (e) {}
try { sqlite.exec('ALTER TABLE users ADD COLUMN notify_email INTEGER NOT NULL DEFAULT 1;') } catch (e) {}
try { sqlite.exec('ALTER TABLE workflows ADD COLUMN org_id TEXT;') } catch (e) {}
try { sqlite.exec('ALTER TABLE projects ADD COLUMN org_id TEXT;') } catch (e) {}

export const db = drizzle(sqlite)
