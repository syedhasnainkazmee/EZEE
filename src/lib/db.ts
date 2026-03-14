import { randomUUID } from 'crypto'
import { eq, and, asc, desc } from 'drizzle-orm'
import {
  db,
  organizations   as orgsTable,
  users           as usersTable,
  user_sessions   as sessionsTable,
  invitation_tokens as invitationsTable,
  workflows       as workflowsTable,
  workflow_steps  as workflowStepsTable,
  submissions     as submissionsTable,
  designs         as designsTable,
  reviews         as reviewsTable,
  annotations     as annotationsTable,
  projects        as projectsTable,
  tasks           as tasksTable,
  subtasks        as subtasksTable,
  task_attachments as attachmentsTable,
  notifications   as notificationsTable,
} from './schema'
import { cacheGet, cacheSet, cacheClear, cacheDelete, CK } from './cache'

// ── Types ──────────────────────────────────────────────────────────────────

export type Organization = {
  id: string; name: string; domain: string; created_at: string
}

export type User = {
  id: string; org_id: string | null; name: string; email: string
  role: 'admin' | 'member'; token: string
  password_hash: string | null; notify_email: boolean; created_at: string
}

export type UserSession = {
  id: string; user_id: string; jti: string; expires_at: string; created_at: string
}

export type InvitationToken = {
  id: string; org_id: string; email: string; role: 'admin' | 'member'
  token: string; used: boolean; expires_at: string; created_at: string
}

export type Workflow = {
  id: string; org_id: string | null; name: string; description: string
  is_active: boolean; created_at: string
}

export type WorkflowStep = {
  id: string; workflow_id: string; step: number; user_id: string; focus: string
}

export type Submission = {
  id: string; title: string; description: string; workflow_id: string
  task_id: string | null; submitted_by: string | null
  status: 'draft' | 'in_review' | 'approved' | 'changes_requested'
  current_step: number | null; version: number; created_at: string
}

export type Design = {
  id: string; submission_id: string; filename: string
  original_name: string; variation_label: string; order_index: number; version: number
}

export type Review = {
  id: string; submission_id: string; reviewer_id: string
  action: 'approved' | 'changes_requested' | null; comment: string; version: number; created_at: string
}

export type Annotation = {
  id: string; design_id: string; submission_id: string; reviewer_id: string
  x: number; y: number; comment: string; number: number; created_at: string
}

export type Project = {
  id: string; org_id: string | null; name: string; description: string; created_at: string
}

export type Task = {
  id: string; project_id: string; title: string; description: string
  assignor_id: string | null; assignee_id: string | null
  due_date: string | null; priority: 'low' | 'medium' | 'high'
  status: 'open' | 'in_progress' | 'in_review' | 'completed'
  created_at: string
}

export type Subtask = {
  id: string; task_id: string; title: string; completed: boolean; created_at: string
}

export type TaskAttachment = {
  id: string; task_id: string; filename: string; original_name: string
  mime_type: string; size: number; uploaded_by: string; created_at: string
}

export type Notification = {
  id: string; user_id: string
  type: 'task_assigned' | 'review_needed' | 'submission_approved' | 'changes_requested' | 'invited'
  title: string; body: string; href: string | null; read: boolean; created_at: string
}

// ── Seed default data if DB is empty ──────────────────────────────────────

function ensureSeeded() {
  if (process.env.DISABLE_SEED === 'true') return
  const existing = db.select().from(usersTable).all()
  if (existing.length > 0) return

  const uid1 = randomUUID(), uid2 = randomUUID(), uid3 = randomUUID()
  const wfId = randomUUID()
  const now  = new Date().toISOString()

  db.insert(usersTable).values([
    { id: uid1, org_id: null, name: 'Minhal',  email: 'minhal@sunhub.com',  role: 'member', token: 'minhal-abc123',   password_hash: null, notify_email: true, created_at: now },
    { id: uid2, org_id: null, name: 'Meeran',  email: 'meeran@sunhub.com',  role: 'member', token: 'meeran-def456',   password_hash: null, notify_email: true, created_at: now },
    { id: uid3, org_id: null, name: 'Daniyal', email: 'daniyal@sunhub.com', role: 'admin',  token: 'daniyal-ghi789', password_hash: null, notify_email: true, created_at: now },
  ]).run()

  db.insert(workflowsTable).values([{
    id: wfId, org_id: null, name: 'Social Media Design Review',
    description: 'Default approval chain for social media designs.',
    is_active: true, created_at: now,
  }]).run()

  db.insert(workflowStepsTable).values([
    { id: randomUUID(), workflow_id: wfId, step: 1, user_id: uid1, focus: 'Check brand consistency — logo usage, brand colors, and typography' },
    { id: randomUUID(), workflow_id: wfId, step: 2, user_id: uid2, focus: 'Check copy accuracy, safe margins, and overall aesthetic' },
    { id: randomUUID(), workflow_id: wfId, step: 3, user_id: uid3, focus: 'Final approval — overall sign-off' },
  ]).run()
}

ensureSeeded()

// ── Organizations ──────────────────────────────────────────────────────────

export function getOrg(id: string): Organization | undefined {
  const cached = cacheGet<Organization>(CK.org(id))
  if (cached) return cached
  const org = db.select().from(orgsTable).where(eq(orgsTable.id, id)).get() as Organization | undefined
  if (org) cacheSet(CK.org(id), org, 5 * 60 * 1000)
  return org
}

export function getFirstOrg(): Organization | undefined {
  return db.select().from(orgsTable).get() as Organization | undefined
}

export function createOrg(name: string, domain: string): Organization {
  const org: Organization = { id: randomUUID(), name, domain, created_at: new Date().toISOString() }
  db.insert(orgsTable).values(org).run()
  cacheSet(CK.org(org.id), org, 5 * 60 * 1000)
  return org
}

export function updateOrg(id: string, updates: Partial<Pick<Organization, 'name' | 'domain'>>): Organization | null {
  db.update(orgsTable).set(updates).where(eq(orgsTable.id, id)).run()
  cacheDelete(CK.org(id))
  return getOrg(id) ?? null
}

// ── Users ──────────────────────────────────────────────────────────────────

export function getAllUsers(): User[] {
  const cached = cacheGet<User[]>(CK.users())
  if (cached) return cached
  const users = db.select().from(usersTable).orderBy(asc(usersTable.created_at)).all() as User[]
  cacheSet(CK.users(), users, 5 * 60 * 1000)
  return users
}

export function getUserByToken(token: string): User | undefined {
  return db.select().from(usersTable).where(eq(usersTable.token, token)).get() as User | undefined
}

export function getUserById(id: string): User | undefined {
  const cached = cacheGet<User>(CK.user(id))
  if (cached) return cached
  const user = db.select().from(usersTable).where(eq(usersTable.id, id)).get() as User | undefined
  if (user) cacheSet(CK.user(id), user, 5 * 60 * 1000)
  return user
}

export function getUserByEmail(email: string): User | undefined {
  const cached = cacheGet<User>(CK.userByEmail(email))
  if (cached) return cached
  const user = db.select().from(usersTable).where(eq(usersTable.email, email)).get() as User | undefined
  if (user) cacheSet(CK.userByEmail(email), user, 5 * 60 * 1000)
  return user
}

export function createUser(
  name: string, email: string, role: 'admin' | 'member',
  opts?: { org_id?: string; password_hash?: string }
): User {
  const slug  = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const token = `${slug}-${randomUUID().slice(0, 8)}`
  const user: User = {
    id: randomUUID(), org_id: opts?.org_id ?? null,
    name, email, role, token,
    password_hash: opts?.password_hash ?? null,
    notify_email: true,
    created_at: new Date().toISOString()
  }
  db.insert(usersTable).values(user).run()
  cacheClear('user')
  return user
}

export function updateUser(id: string, updates: Partial<Pick<User, 'name' | 'email' | 'role' | 'password_hash' | 'notify_email' | 'org_id'>>): User | null {
  db.update(usersTable).set(updates).where(eq(usersTable.id, id)).run()
  cacheDelete(CK.user(id))
  cacheClear('user:email')
  cacheDelete(CK.users())
  return getUserById(id) ?? null
}

export function deleteUser(id: string): boolean {
  const result = db.delete(usersTable).where(eq(usersTable.id, id)).run()
  cacheDelete(CK.user(id))
  cacheClear('user:email')
  cacheDelete(CK.users())
  return result.changes > 0
}

// ── Sessions ───────────────────────────────────────────────────────────────

export function createSession(user_id: string, jti: string, expiresAt: Date): UserSession {
  const session: UserSession = {
    id: randomUUID(), user_id, jti,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  }
  db.insert(sessionsTable).values(session).run()
  return session
}

export function getSession(jti: string): UserSession | undefined {
  return db.select().from(sessionsTable).where(eq(sessionsTable.jti, jti)).get() as UserSession | undefined
}

export function deleteSession(jti: string): void {
  db.delete(sessionsTable).where(eq(sessionsTable.jti, jti)).run()
}

export function deleteUserSessions(user_id: string): void {
  db.delete(sessionsTable).where(eq(sessionsTable.user_id, user_id)).run()
}

// ── Invitations ────────────────────────────────────────────────────────────

export function createInvitation(org_id: string, email: string, role: 'admin' | 'member'): InvitationToken {
  // Invalidate any existing unused invitation for this email
  const existing = db.select().from(invitationsTable)
    .where(and(eq(invitationsTable.email, email), eq(invitationsTable.used, false)))
    .get()
  if (existing) {
    db.delete(invitationsTable).where(eq(invitationsTable.id, existing.id)).run()
  }

  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
  const inv: InvitationToken = {
    id: randomUUID(), org_id, email, role,
    token: randomUUID(),
    used: false,
    expires_at: expires.toISOString(),
    created_at: new Date().toISOString(),
  }
  db.insert(invitationsTable).values(inv).run()
  return inv
}

export function getInvitation(token: string): InvitationToken | undefined {
  return db.select().from(invitationsTable).where(eq(invitationsTable.token, token)).get() as InvitationToken | undefined
}

export function getAllInvitations(org_id: string): InvitationToken[] {
  return db.select().from(invitationsTable)
    .where(eq(invitationsTable.org_id, org_id))
    .orderBy(desc(invitationsTable.created_at))
    .all() as InvitationToken[]
}

export function consumeInvitation(token: string): InvitationToken | null {
  const inv = getInvitation(token)
  if (!inv) return null
  db.update(invitationsTable).set({ used: true }).where(eq(invitationsTable.token, token)).run()
  return { ...inv, used: true }
}

export function deleteInvitation(id: string): void {
  db.delete(invitationsTable).where(eq(invitationsTable.id, id)).run()
}

// ── Projects ───────────────────────────────────────────────────────────────

export function getAllProjects(org_id?: string | null): Project[] {
  let query: any = db.select().from(projectsTable)
  if (org_id) query = query.where(eq(projectsTable.org_id, org_id))
  return query.orderBy(asc(projectsTable.name)).all() as Project[]
}

export function getProject(id: string): Project | null {
  return db.select().from(projectsTable).where(eq(projectsTable.id, id)).get() as Project | null
}

export function createProject(name: string, description: string, org_id?: string | null): Project {
  const proj: Project = {
    id: randomUUID(), org_id: org_id ?? null,
    name, description, created_at: new Date().toISOString()
  }
  db.insert(projectsTable).values(proj).run()
  return proj
}

export function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Project | null {
  db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).run()
  return getProject(id)
}

export function deleteProject(id: string): boolean {
  const result = db.delete(projectsTable).where(eq(projectsTable.id, id)).run()
  return result.changes > 0
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export function getAllTasks(project_id?: string, assignee_id?: string): (Task & { assignee: User | null; assignor: User | null; project_name: string })[] {
  const cacheKey = CK.tasks(project_id)
  const cached = cacheGet<any[]>(cacheKey)
  if (cached && !assignee_id) return cached

  let query: any = db.select().from(tasksTable)
  if (project_id) query = query.where(eq(tasksTable.project_id, project_id))
  const allTasks = query.orderBy(desc(tasksTable.created_at)).all() as Task[]
  const allUsers = db.select().from(usersTable).all()
  const allProjects = db.select().from(projectsTable).all()

  const enriched = allTasks.map(t => ({
    ...t,
    assignee: t.assignee_id ? (allUsers.find(u => u.id === t.assignee_id) ?? null) : null,
    assignor: t.assignor_id ? (allUsers.find(u => u.id === t.assignor_id) ?? null) : null,
    project_name: allProjects.find(p => p.id === t.project_id)?.name ?? 'Unknown Project'
  }))

  if (!assignee_id) cacheSet(cacheKey, enriched)
  if (assignee_id) return enriched.filter(t => t.assignee_id === assignee_id)
  return enriched
}

export function getTask(id: string): (Task & { assignee: User | null; assignor: User | null; project_name: string }) | null {
  const task = db.select().from(tasksTable).where(eq(tasksTable.id, id)).get() as Task | null
  if (!task) return null
  const allUsers = db.select().from(usersTable).all()
  const project = db.select().from(projectsTable).where(eq(projectsTable.id, task.project_id)).get() as Project | null
  return {
    ...task,
    assignee: task.assignee_id ? (allUsers.find(u => u.id === task.assignee_id) ?? null) : null,
    assignor: task.assignor_id ? (allUsers.find(u => u.id === task.assignor_id) ?? null) : null,
    project_name: project?.name ?? 'Unknown Project',
  }
}

export function createTask(
  project_id: string, title: string, description: string,
  assignor_id: string | null, assignee_id: string | null,
  opts?: { due_date?: string; priority?: 'low' | 'medium' | 'high' }
): Task {
  const task: Task = {
    id: randomUUID(), project_id, title, description, assignor_id, assignee_id,
    due_date: opts?.due_date ?? null, priority: opts?.priority ?? 'medium',
    status: 'open', created_at: new Date().toISOString()
  }
  db.insert(tasksTable).values(task).run()
  cacheClear('tasks:')
  // Notify assignee
  if (assignee_id) {
    createNotification({
      user_id: assignee_id, type: 'task_assigned',
      title: `New task: ${title}`,
      body: description || 'You have been assigned a new task.',
      href: '/tasks',
    })
  }
  return task
}

export function updateTask(id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'assignee_id' | 'assignor_id' | 'status' | 'due_date' | 'priority'>>): Task | null {
  db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).run()
  cacheClear('tasks:')
  return db.select().from(tasksTable).where(eq(tasksTable.id, id)).get() as Task | null
}

export function updateTaskStatus(id: string, status: 'open' | 'in_progress' | 'in_review' | 'completed'): Task | null {
  return updateTask(id, { status })
}

export function deleteTask(id: string): boolean {
  db.delete(subtasksTable).where(eq(subtasksTable.task_id, id)).run()
  db.delete(attachmentsTable).where(eq(attachmentsTable.task_id, id)).run()
  const result = db.delete(tasksTable).where(eq(tasksTable.id, id)).run()
  cacheClear('tasks:')
  return result.changes > 0
}

// ── Subtasks ───────────────────────────────────────────────────────────────

export function getSubtasks(task_id: string): Subtask[] {
  const cached = cacheGet<Subtask[]>(CK.subtasks(task_id))
  if (cached) return cached
  const items = db.select().from(subtasksTable)
    .where(eq(subtasksTable.task_id, task_id))
    .orderBy(asc(subtasksTable.created_at))
    .all() as Subtask[]
  cacheSet(CK.subtasks(task_id), items)
  return items
}

export function createSubtask(task_id: string, title: string): Subtask {
  const s: Subtask = { id: randomUUID(), task_id, title, completed: false, created_at: new Date().toISOString() }
  db.insert(subtasksTable).values(s).run()
  cacheDelete(CK.subtasks(task_id))
  return s
}

export function updateSubtask(id: string, updates: Partial<Pick<Subtask, 'title' | 'completed'>>): Subtask | null {
  db.update(subtasksTable).set(updates).where(eq(subtasksTable.id, id)).run()
  const s = db.select().from(subtasksTable).where(eq(subtasksTable.id, id)).get() as Subtask | null
  if (s) cacheDelete(CK.subtasks(s.task_id))
  return s
}

export function deleteSubtask(id: string): boolean {
  const s = db.select().from(subtasksTable).where(eq(subtasksTable.id, id)).get() as Subtask | null
  if (s) cacheDelete(CK.subtasks(s.task_id))
  const result = db.delete(subtasksTable).where(eq(subtasksTable.id, id)).run()
  return result.changes > 0
}

// ── Task Attachments ───────────────────────────────────────────────────────

export function getTaskAttachments(task_id: string): TaskAttachment[] {
  const cached = cacheGet<TaskAttachment[]>(CK.attachments(task_id))
  if (cached) return cached
  const items = db.select().from(attachmentsTable)
    .where(eq(attachmentsTable.task_id, task_id))
    .orderBy(asc(attachmentsTable.created_at))
    .all() as TaskAttachment[]
  cacheSet(CK.attachments(task_id), items)
  return items
}

export function addTaskAttachment(data: Omit<TaskAttachment, 'id' | 'created_at'>): TaskAttachment {
  const a: TaskAttachment = { id: randomUUID(), ...data, created_at: new Date().toISOString() }
  db.insert(attachmentsTable).values(a).run()
  cacheDelete(CK.attachments(data.task_id))
  return a
}

export function deleteTaskAttachment(id: string): { filename: string } | null {
  const a = db.select().from(attachmentsTable).where(eq(attachmentsTable.id, id)).get() as TaskAttachment | null
  if (!a) return null
  db.delete(attachmentsTable).where(eq(attachmentsTable.id, id)).run()
  cacheDelete(CK.attachments(a.task_id))
  return { filename: a.filename }
}

// ── Workflows ──────────────────────────────────────────────────────────────

export function getAllWorkflows(org_id?: string | null) {
  const allWf    = db.select().from(workflowsTable).all()
  const allSteps = db.select().from(workflowStepsTable).all()
  const allUsers = db.select().from(usersTable).all()
  const allSubs  = db.select({ workflow_id: submissionsTable.workflow_id }).from(submissionsTable).all()

  const filtered = org_id ? allWf.filter(w => !w.org_id || w.org_id === org_id) : allWf

  return filtered.map(wf => ({
    ...wf,
    steps: allSteps
      .filter(s => s.workflow_id === wf.id)
      .sort((a, b) => a.step - b.step)
      .map(s => ({ ...s, user: allUsers.find(u => u.id === s.user_id) ?? null })),
    submission_count: allSubs.filter(s => s.workflow_id === wf.id).length,
  }))
}

export function getWorkflow(id: string) {
  const wf = db.select().from(workflowsTable).where(eq(workflowsTable.id, id)).get()
  if (!wf) return null
  const allUsers = db.select().from(usersTable).all()
  const steps = db.select().from(workflowStepsTable)
    .where(eq(workflowStepsTable.workflow_id, id))
    .all()
    .sort((a, b) => a.step - b.step)
    .map(s => ({ ...s, user: allUsers.find(u => u.id === s.user_id) ?? null }))
  return { ...wf, steps }
}

export function createWorkflow(name: string, description: string, org_id?: string | null): Workflow {
  const wf: Workflow = {
    id: randomUUID(), org_id: org_id ?? null,
    name, description, is_active: true, created_at: new Date().toISOString()
  }
  db.insert(workflowsTable).values(wf).run()
  return wf
}

export function updateWorkflow(id: string, updates: Partial<Pick<Workflow, 'name' | 'description' | 'is_active'>>): Workflow | null {
  db.update(workflowsTable).set(updates).where(eq(workflowsTable.id, id)).run()
  return db.select().from(workflowsTable).where(eq(workflowsTable.id, id)).get() as Workflow | null
}

export function deleteWorkflow(id: string): boolean {
  db.delete(workflowStepsTable).where(eq(workflowStepsTable.workflow_id, id)).run()
  db.delete(workflowsTable).where(eq(workflowsTable.id, id)).run()
  return true
}

export function setWorkflowSteps(workflow_id: string, steps: { user_id: string; focus: string }[]): WorkflowStep[] {
  db.delete(workflowStepsTable).where(eq(workflowStepsTable.workflow_id, workflow_id)).run()
  const newSteps: WorkflowStep[] = steps.map((s, i) => ({
    id: randomUUID(), workflow_id, step: i + 1, user_id: s.user_id, focus: s.focus,
  }))
  if (newSteps.length > 0) db.insert(workflowStepsTable).values(newSteps).run()
  return newSteps
}

export function getWorkflowStep(workflow_id: string, step: number): (WorkflowStep & { user: User | null }) | null {
  const s = db.select().from(workflowStepsTable)
    .where(and(eq(workflowStepsTable.workflow_id, workflow_id), eq(workflowStepsTable.step, step)))
    .get()
  if (!s) return null
  return { ...s, user: getUserById(s.user_id) ?? null }
}

export function getNextWorkflowStep(workflow_id: string, currentStep: number): (WorkflowStep & { user: User | null }) | null {
  return getWorkflowStep(workflow_id, currentStep + 1)
}

export function getTotalSteps(workflow_id: string): number {
  return db.select().from(workflowStepsTable).where(eq(workflowStepsTable.workflow_id, workflow_id)).all().length
}

// ── Submissions ────────────────────────────────────────────────────────────

export function getAllSubmissions(submitted_by?: string) {
  const cached = cacheGet<any[]>(CK.submissions())
  const allSubs    = db.select().from(submissionsTable).orderBy(desc(submissionsTable.created_at)).all()
  const allWf      = db.select().from(workflowsTable).all()
  const allSteps   = db.select().from(workflowStepsTable).all()
  const allUsers   = db.select().from(usersTable).all()
  const allDesigns = db.select({ submission_id: designsTable.submission_id }).from(designsTable).all()

  const enriched = allSubs.map(sub => {
    const wf       = allWf.find(w => w.id === sub.workflow_id)
    const stepInfo = sub.current_step != null
      ? allSteps.find(s => s.workflow_id === sub.workflow_id && s.step === sub.current_step)
      : null
    const reviewer = stepInfo ? allUsers.find(u => u.id === stepInfo.user_id) : null
    return {
      ...sub,
      design_count:     allDesigns.filter(d => d.submission_id === sub.id).length,
      workflow_name:    wf?.name ?? '',
      current_reviewer: reviewer ? { name: reviewer.name, role: reviewer.role } : null,
    }
  })

  if (!submitted_by && !cached) cacheSet(CK.submissions(), enriched, 15 * 1000)
  if (submitted_by) return enriched.filter(s => s.submitted_by === submitted_by)
  return enriched
}

export function getSubmission(id: string): Submission | undefined {
  return db.select().from(submissionsTable).where(eq(submissionsTable.id, id)).get() as Submission | undefined
}

export function createSubmission(title: string, description: string, workflow_id: string, task_id?: string | null, submitted_by?: string | null): Submission {
  const sub: Submission = {
    id: randomUUID(), title, description, workflow_id, task_id: task_id ?? null,
    submitted_by: submitted_by ?? null,
    status: 'draft', current_step: null, version: 1, created_at: new Date().toISOString(),
  }
  db.insert(submissionsTable).values(sub).run()
  cacheDelete(CK.submissions())
  return sub
}

export function updateSubmission(id: string, updates: Partial<Submission>): Submission | null {
  db.update(submissionsTable).set(updates).where(eq(submissionsTable.id, id)).run()
  cacheDelete(CK.submissions())
  return getSubmission(id) ?? null
}

// ── Designs ────────────────────────────────────────────────────────────────

export function getDesigns(submission_id: string): Design[] {
  return db.select().from(designsTable)
    .where(eq(designsTable.submission_id, submission_id))
    .all()
    .sort((a, b) => a.order_index - b.order_index) as Design[]
}

export function addDesign(data: Omit<Design, 'id'>): Design {
  const design: Design = { id: randomUUID(), ...data }
  db.insert(designsTable).values(design).run()
  return design
}

export function getDesignCount(submission_id: string): number {
  return db.select().from(designsTable).where(eq(designsTable.submission_id, submission_id)).all().length
}

// ── Reviews ────────────────────────────────────────────────────────────────

export function getReviews(submission_id: string): (Review & { reviewer: User | null; step: WorkflowStep | null })[] {
  const sub      = getSubmission(submission_id)
  const allRev   = db.select().from(reviewsTable).where(eq(reviewsTable.submission_id, submission_id)).all()
  const allUsers = db.select().from(usersTable).all()
  const allSteps = sub
    ? db.select().from(workflowStepsTable).where(eq(workflowStepsTable.workflow_id, sub.workflow_id)).all()
    : []

  return allRev
    .map(r => ({
      ...r,
      action:   r.action as 'approved' | 'changes_requested' | null,
      reviewer: (allUsers.find(u => u.id === r.reviewer_id) ?? null) as User | null,
      step:     (allSteps.find(s => s.user_id === r.reviewer_id) ?? null) as WorkflowStep | null,
    }))
    .sort((a, b) => (a.step?.step ?? 0) - (b.step?.step ?? 0))
}

export function upsertReview(
  submission_id: string, reviewer_id: string, version: number,
  action: 'approved' | 'changes_requested', comment: string,
): Review {
  const existing = db.select().from(reviewsTable)
    .where(and(
      eq(reviewsTable.submission_id, submission_id),
      eq(reviewsTable.reviewer_id, reviewer_id),
      eq(reviewsTable.version, version)
    ))
    .get()

  const review: Review = {
    id: existing?.id ?? randomUUID(),
    submission_id, reviewer_id, action, comment, version,
    created_at: new Date().toISOString(),
  }

  if (existing) {
    db.update(reviewsTable).set(review).where(eq(reviewsTable.id, existing.id)).run()
  } else {
    db.insert(reviewsTable).values(review).run()
  }
  cacheDelete(CK.reviews(reviewer_id))
  return review
}

export function getReviewsByUserStep(user_id: string) {
  const cached = cacheGet<any[]>(CK.reviews(user_id))
  if (cached) return cached

  const user = getUserById(user_id)
  if (!user) return []

  const mySteps       = db.select().from(workflowStepsTable).where(eq(workflowStepsTable.user_id, user_id)).all()
  const myReviews     = db.select().from(reviewsTable).where(eq(reviewsTable.reviewer_id, user_id)).all()
  const myReviewedIds = new Set(myReviews.map(r => r.submission_id))

  const allSubs = db.select().from(submissionsTable).all()
  const relevant = allSubs.filter(sub => {
    const myStep = mySteps.find(s => s.workflow_id === sub.workflow_id)
    if (!myStep) return false
    const isPending = sub.status === 'in_review' && sub.current_step === myStep.step
    return isPending || myReviewedIds.has(sub.id)
  })

  const allDesigns     = db.select().from(designsTable).all()
  const allAnnotations = db.select().from(annotationsTable).all()
  const allReviewsAll  = db.select().from(reviewsTable).all()
  const allUsersAll    = db.select().from(usersTable).all()
  const allStepsAll    = db.select().from(workflowStepsTable).all()
  const allWorkflows   = db.select().from(workflowsTable).all()

  const result = relevant
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(sub => {
      const myStep   = mySteps.find(s => s.workflow_id === sub.workflow_id)!
      const myReview = myReviews.find(r => r.submission_id === sub.id)

      const subDesigns     = allDesigns.filter(d => d.submission_id === sub.id).sort((a, b) => a.order_index - b.order_index)
      const subAnnotations = allAnnotations.filter(a => a.submission_id === sub.id)

      const previousReviews = allReviewsAll
        .filter(r => r.submission_id === sub.id)
        .map(r => {
          const stepInfo = allStepsAll.find(s => s.workflow_id === sub.workflow_id && s.user_id === r.reviewer_id)
          const reviewer = allUsersAll.find(u => u.id === r.reviewer_id)
          return { ...r, reviewer: reviewer ?? null, reviewerStep: stepInfo?.step ?? 0 }
        })
        .filter(r => r.reviewerStep < myStep.step)
        .sort((a, b) => a.reviewerStep - b.reviewerStep)

      const wf = allWorkflows.find(w => w.id === sub.workflow_id)
      return {
        ...sub,
        workflow_name: wf?.name ?? '',
        my_step:    myStep.step,
        my_focus:   myStep.focus,
        my_action:  myReview?.action ?? null,
        my_comment: myReview?.comment ?? null,
        designs:    subDesigns,
        annotations: subAnnotations,
        previousReviews,
      }
    })

  cacheSet(CK.reviews(user_id), result, 15 * 1000)
  return result
}

// ── Annotations ────────────────────────────────────────────────────────────

export function getAnnotations(submission_id: string): (Annotation & { reviewer: User | undefined })[] {
  const allAnn   = db.select().from(annotationsTable).where(eq(annotationsTable.submission_id, submission_id)).all()
  const allUsers = db.select().from(usersTable).all()
  return allAnn
    .map(a => ({ ...a, reviewer: allUsers.find(u => u.id === a.reviewer_id) as User | undefined }))
    .sort((a, b) => a.number - b.number)
}

export function addAnnotation(data: Omit<Annotation, 'id' | 'number' | 'created_at'>): Annotation {
  const existing = db.select().from(annotationsTable).where(eq(annotationsTable.design_id, data.design_id)).all()
  const number   = existing.length + 1
  const annotation: Annotation = { id: randomUUID(), ...data, number, created_at: new Date().toISOString() }
  db.insert(annotationsTable).values(annotation).run()
  return annotation
}

export function deleteAnnotation(id: string, reviewer_id: string): boolean {
  const result = db.delete(annotationsTable)
    .where(and(eq(annotationsTable.id, id), eq(annotationsTable.reviewer_id, reviewer_id)))
    .run()
  return result.changes > 0
}

// ── Notifications ──────────────────────────────────────────────────────────

export function createNotification(opts: {
  user_id: string; type: Notification['type'];
  title: string; body?: string; href?: string
}): Notification {
  const n: Notification = {
    id: randomUUID(), user_id: opts.user_id, type: opts.type,
    title: opts.title, body: opts.body ?? '', href: opts.href ?? null,
    read: false, created_at: new Date().toISOString(),
  }
  db.insert(notificationsTable).values(n).run()
  cacheDelete(CK.notifications(opts.user_id))
  return n
}

export function getNotifications(user_id: string, unreadOnly = false): Notification[] {
  const cached = cacheGet<Notification[]>(CK.notifications(user_id))
  if (cached && !unreadOnly) return cached

  let query: any = db.select().from(notificationsTable)
    .where(eq(notificationsTable.user_id, user_id))
    .orderBy(desc(notificationsTable.created_at))

  const items = query.all() as Notification[]
  if (!unreadOnly) cacheSet(CK.notifications(user_id), items, 10 * 1000)
  if (unreadOnly) return items.filter(n => !n.read)
  return items
}

export function markNotificationRead(id: string, user_id: string): void {
  db.update(notificationsTable).set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.user_id, user_id)))
    .run()
  cacheDelete(CK.notifications(user_id))
}

export function markAllNotificationsRead(user_id: string): void {
  db.update(notificationsTable).set({ read: true })
    .where(eq(notificationsTable.user_id, user_id))
    .run()
  cacheDelete(CK.notifications(user_id))
}

// ── Backward-compatible aliases (used by existing API routes) ──────────────
export const getAllReviewers    = getAllUsers
export const getReviewerByToken = getUserByToken
