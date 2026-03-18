import { randomUUID } from 'crypto'
import { eq, and, asc, desc, sql } from 'drizzle-orm'
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
  org_integrations as integrationsTable,
} from './schema'
import { cacheGet, cacheSet, cacheClear, cacheDelete, CK } from './cache'

// ── Types ──────────────────────────────────────────────────────────────────

export type Organization = {
  id: string; name: string; domain: string; created_at: string
}

export type User = {
  id: string; org_id: string | null; name: string; email: string
  role: 'admin' | 'member'; token: string
  password_hash: string | null; notify_email: boolean
  status: 'active' | 'pending'; created_at: string
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
  current_step: number | null; version: number
  drive_folder_url: string | null; tags: string | null; created_at: string
}

export type Design = {
  id: string; submission_id: string; filename: string
  original_name: string; variation_label: string; order_index: number; version: number
  prompt?: string | null; liked?: boolean; model?: string | null; concept_notes?: string | null; copy?: string | null
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
  type: 'task_assigned' | 'review_needed' | 'submission_approved' | 'changes_requested' | 'invited' | 'access_requested'
  title: string; body: string; href: string | null; read: boolean; created_at: string
}

// ── Organizations ──────────────────────────────────────────────────────────

export async function getOrg(id: string): Promise<Organization | undefined> {
  const cached = cacheGet<Organization>(CK.org(id))
  if (cached) return cached
  const org = await db.select().from(orgsTable).where(eq(orgsTable.id, id)).get() as Organization | undefined
  if (org) cacheSet(CK.org(id), org, 5 * 60 * 1000)
  return org
}

export async function getFirstOrg(): Promise<Organization | undefined> {
  return await db.select().from(orgsTable).get() as Organization | undefined
}

export async function createOrg(name: string, domain: string): Promise<Organization> {
  const org: Organization = { id: randomUUID(), name, domain, created_at: new Date().toISOString() }
  await db.insert(orgsTable).values(org).run()
  cacheSet(CK.org(org.id), org, 5 * 60 * 1000)
  return org
}

export async function updateOrg(id: string, updates: Partial<Pick<Organization, 'name' | 'domain'>>): Promise<Organization | null> {
  await db.update(orgsTable).set(updates).where(eq(orgsTable.id, id)).run()
  cacheDelete(CK.org(id))
  return await getOrg(id) ?? null
}

export async function getOrgByDomain(domain: string): Promise<Organization | undefined> {
  return await db.select().from(orgsTable).where(eq(orgsTable.domain, domain)).get() as Organization | undefined
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {
  const cached = cacheGet<User[]>(CK.users())
  if (cached) return cached
  const users = await db.select().from(usersTable).orderBy(asc(usersTable.created_at)).all() as User[]
  cacheSet(CK.users(), users, 5 * 60 * 1000)
  return users
}

export async function getUserByToken(token: string): Promise<User | undefined> {
  return await db.select().from(usersTable).where(eq(usersTable.token, token)).get() as User | undefined
}

export async function getUserById(id: string): Promise<User | undefined> {
  const cached = cacheGet<User>(CK.user(id))
  if (cached) return cached
  const user = await db.select().from(usersTable).where(eq(usersTable.id, id)).get() as User | undefined
  if (user) cacheSet(CK.user(id), user, 5 * 60 * 1000)
  return user
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const cached = cacheGet<User>(CK.userByEmail(email))
  if (cached) return cached
  const user = await db.select().from(usersTable).where(eq(usersTable.email, email)).get() as User | undefined
  if (user) cacheSet(CK.userByEmail(email), user, 5 * 60 * 1000)
  return user
}

export async function createUser(
  name: string, email: string, role: 'admin' | 'member',
  opts?: { org_id?: string; password_hash?: string; status?: 'active' | 'pending' }
): Promise<User> {
  const slug  = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const token = `${slug}-${randomUUID().slice(0, 8)}`
  const user: User = {
    id: randomUUID(), org_id: opts?.org_id ?? null,
    name, email, role, token,
    password_hash: opts?.password_hash ?? null,
    notify_email: true,
    status: opts?.status ?? 'active',
    created_at: new Date().toISOString()
  }
  await db.insert(usersTable).values(user).run()
  cacheClear('user')
  return user
}

export async function updateUser(id: string, updates: Partial<Pick<User, 'name' | 'email' | 'role' | 'password_hash' | 'notify_email' | 'org_id'>>): Promise<User | null> {
  await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).run()
  cacheDelete(CK.user(id))
  cacheClear('user:email')
  cacheDelete(CK.users())
  return await getUserById(id) ?? null
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await db.delete(usersTable).where(eq(usersTable.id, id)).run()
  cacheDelete(CK.user(id))
  cacheClear('user:email')
  cacheDelete(CK.users())
  return result.rowsAffected > 0
}

export async function getPendingUsers(orgId: string): Promise<User[]> {
  return await db.select().from(usersTable)
    .where(and(eq(usersTable.org_id, orgId), eq(usersTable.status, 'pending')))
    .orderBy(asc(usersTable.created_at))
    .all() as User[]
}

export async function approveUser(userId: string): Promise<void> {
  await db.update(usersTable).set({ status: 'active' }).where(eq(usersTable.id, userId)).run()
  cacheDelete(CK.user(userId))
  cacheClear('user:email')
  cacheDelete(CK.users())
}

export async function rejectUser(userId: string): Promise<void> {
  await db.delete(usersTable).where(eq(usersTable.id, userId)).run()
  cacheDelete(CK.user(userId))
  cacheClear('user:email')
  cacheDelete(CK.users())
}

// ── Sessions ───────────────────────────────────────────────────────────────

export async function createSession(user_id: string, jti: string, expiresAt: Date): Promise<UserSession> {
  const session: UserSession = {
    id: randomUUID(), user_id, jti,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  }
  await db.insert(sessionsTable).values(session).run()
  return session
}

export async function getSession(jti: string): Promise<UserSession | undefined> {
  return await db.select().from(sessionsTable).where(eq(sessionsTable.jti, jti)).get() as UserSession | undefined
}

export async function deleteSession(jti: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.jti, jti)).run()
}

export async function deleteUserSessions(user_id: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.user_id, user_id)).run()
}

// ── Invitations ────────────────────────────────────────────────────────────

export async function createInvitation(org_id: string, email: string, role: 'admin' | 'member'): Promise<InvitationToken> {
  // Invalidate any existing unused invitation for this email
  const existing = await db.select().from(invitationsTable)
    .where(and(eq(invitationsTable.email, email), eq(invitationsTable.used, false)))
    .get()
  if (existing) {
    await db.delete(invitationsTable).where(eq(invitationsTable.id, existing.id)).run()
  }

  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
  const inv: InvitationToken = {
    id: randomUUID(), org_id, email, role,
    token: randomUUID(),
    used: false,
    expires_at: expires.toISOString(),
    created_at: new Date().toISOString(),
  }
  await db.insert(invitationsTable).values(inv).run()
  return inv
}

export async function getInvitation(token: string): Promise<InvitationToken | undefined> {
  return await db.select().from(invitationsTable).where(eq(invitationsTable.token, token)).get() as InvitationToken | undefined
}

export async function getAllInvitations(org_id: string): Promise<InvitationToken[]> {
  return await db.select().from(invitationsTable)
    .where(eq(invitationsTable.org_id, org_id))
    .orderBy(desc(invitationsTable.created_at))
    .all() as InvitationToken[]
}

export async function consumeInvitation(token: string): Promise<InvitationToken | null> {
  const inv = await getInvitation(token)
  if (!inv) return null
  await db.update(invitationsTable).set({ used: true }).where(eq(invitationsTable.token, token)).run()
  return { ...inv, used: true }
}

export async function deleteInvitation(id: string): Promise<void> {
  await db.delete(invitationsTable).where(eq(invitationsTable.id, id)).run()
}

// ── Projects ───────────────────────────────────────────────────────────────

export async function getAllProjects(org_id?: string | null): Promise<Project[]> {
  let query: any = db.select().from(projectsTable)
  if (org_id) query = query.where(eq(projectsTable.org_id, org_id))
  return await query.orderBy(asc(projectsTable.name)).all() as Project[]
}

export async function getProject(id: string): Promise<Project | null> {
  return await db.select().from(projectsTable).where(eq(projectsTable.id, id)).get() as Project | null
}

export async function createProject(name: string, description: string, org_id?: string | null): Promise<Project> {
  const proj: Project = {
    id: randomUUID(), org_id: org_id ?? null,
    name, description, created_at: new Date().toISOString()
  }
  await db.insert(projectsTable).values(proj).run()
  return proj
}

export async function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project | null> {
  await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).run()
  return await getProject(id)
}

export async function deleteProject(id: string): Promise<boolean> {
  const result = await db.delete(projectsTable).where(eq(projectsTable.id, id)).run()
  return result.rowsAffected > 0
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export async function getAllTasks(project_id?: string, assignee_id?: string): Promise<(Task & { assignee: User | null; assignor: User | null; project_name: string })[]> {
  const cacheKey = CK.tasks(project_id)
  const cached = cacheGet<any[]>(cacheKey)
  if (cached && !assignee_id) return cached

  let query: any = db.select().from(tasksTable)
  if (project_id) query = query.where(eq(tasksTable.project_id, project_id))
  const allTasks = await query.orderBy(desc(tasksTable.created_at)).all() as Task[]
  const allUsers = await db.select().from(usersTable).all()
  const allProjects = await db.select().from(projectsTable).all()

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

export async function getTask(id: string): Promise<(Task & { assignee: User | null; assignor: User | null; project_name: string }) | null> {
  const task = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).get() as Task | null
  if (!task) return null
  const allUsers = await db.select().from(usersTable).all()
  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, task.project_id)).get() as Project | null
  return {
    ...task,
    assignee: task.assignee_id ? (allUsers.find(u => u.id === task.assignee_id) ?? null) : null,
    assignor: task.assignor_id ? (allUsers.find(u => u.id === task.assignor_id) ?? null) : null,
    project_name: project?.name ?? 'Unknown Project',
  }
}

export async function createTask(
  project_id: string, title: string, description: string,
  assignor_id: string | null, assignee_id: string | null,
  opts?: { due_date?: string; priority?: 'low' | 'medium' | 'high' }
): Promise<Task> {
  const task: Task = {
    id: randomUUID(), project_id, title, description, assignor_id, assignee_id,
    due_date: opts?.due_date ?? null, priority: opts?.priority ?? 'medium',
    status: 'open', created_at: new Date().toISOString()
  }
  await db.insert(tasksTable).values(task).run()
  cacheClear('tasks:')
  // Notify assignee
  if (assignee_id) {
    await createNotification({
      user_id: assignee_id, type: 'task_assigned',
      title: `New task: ${title}`,
      body: description || 'You have been assigned a new task.',
      href: '/tasks',
    })
  }
  return task
}

export async function updateTask(id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'assignee_id' | 'assignor_id' | 'status' | 'due_date' | 'priority'>>): Promise<Task | null> {
  await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).run()
  cacheClear('tasks:')
  return await db.select().from(tasksTable).where(eq(tasksTable.id, id)).get() as Task | null
}

export async function updateTaskStatus(id: string, status: 'open' | 'in_progress' | 'in_review' | 'completed'): Promise<Task | null> {
  return await updateTask(id, { status })
}

export async function deleteTask(id: string): Promise<boolean> {
  await db.delete(subtasksTable).where(eq(subtasksTable.task_id, id)).run()
  await db.delete(attachmentsTable).where(eq(attachmentsTable.task_id, id)).run()
  const result = await db.delete(tasksTable).where(eq(tasksTable.id, id)).run()
  cacheClear('tasks:')
  return result.rowsAffected > 0
}

// ── Subtasks ───────────────────────────────────────────────────────────────

export async function getSubtasks(task_id: string): Promise<Subtask[]> {
  const cached = cacheGet<Subtask[]>(CK.subtasks(task_id))
  if (cached) return cached
  const items = await db.select().from(subtasksTable)
    .where(eq(subtasksTable.task_id, task_id))
    .orderBy(asc(subtasksTable.created_at))
    .all() as Subtask[]
  cacheSet(CK.subtasks(task_id), items)
  return items
}

export async function createSubtask(task_id: string, title: string): Promise<Subtask> {
  const s: Subtask = { id: randomUUID(), task_id, title, completed: false, created_at: new Date().toISOString() }
  await db.insert(subtasksTable).values(s).run()
  cacheDelete(CK.subtasks(task_id))
  return s
}

export async function updateSubtask(id: string, updates: Partial<Pick<Subtask, 'title' | 'completed'>>): Promise<Subtask | null> {
  await db.update(subtasksTable).set(updates).where(eq(subtasksTable.id, id)).run()
  const s = await db.select().from(subtasksTable).where(eq(subtasksTable.id, id)).get() as Subtask | null
  if (s) cacheDelete(CK.subtasks(s.task_id))
  return s
}

export async function deleteSubtask(id: string): Promise<boolean> {
  const s = await db.select().from(subtasksTable).where(eq(subtasksTable.id, id)).get() as Subtask | null
  if (s) cacheDelete(CK.subtasks(s.task_id))
  const result = await db.delete(subtasksTable).where(eq(subtasksTable.id, id)).run()
  return result.rowsAffected > 0
}

// ── Task Attachments ───────────────────────────────────────────────────────

export async function getTaskAttachments(task_id: string): Promise<TaskAttachment[]> {
  const cached = cacheGet<TaskAttachment[]>(CK.attachments(task_id))
  if (cached) return cached
  const items = await db.select().from(attachmentsTable)
    .where(eq(attachmentsTable.task_id, task_id))
    .orderBy(asc(attachmentsTable.created_at))
    .all() as TaskAttachment[]
  cacheSet(CK.attachments(task_id), items)
  return items
}

export async function addTaskAttachment(data: Omit<TaskAttachment, 'id' | 'created_at'>): Promise<TaskAttachment> {
  const a: TaskAttachment = { id: randomUUID(), ...data, created_at: new Date().toISOString() }
  await db.insert(attachmentsTable).values(a).run()
  cacheDelete(CK.attachments(data.task_id))
  return a
}

export async function deleteTaskAttachment(id: string): Promise<{ filename: string } | null> {
  const a = await db.select().from(attachmentsTable).where(eq(attachmentsTable.id, id)).get() as TaskAttachment | null
  if (!a) return null
  await db.delete(attachmentsTable).where(eq(attachmentsTable.id, id)).run()
  cacheDelete(CK.attachments(a.task_id))
  return { filename: a.filename }
}

// ── Workflows ──────────────────────────────────────────────────────────────

export async function getAllWorkflows(org_id?: string | null) {
  const allWf    = await db.select().from(workflowsTable).all()
  const allSteps = await db.select().from(workflowStepsTable).all()
  const allUsers = await db.select().from(usersTable).all()
  const allSubs  = await db.select({ workflow_id: submissionsTable.workflow_id }).from(submissionsTable).all()

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

export async function getWorkflow(id: string) {
  const wf = await db.select().from(workflowsTable).where(eq(workflowsTable.id, id)).get()
  if (!wf) return null
  const allUsers = await db.select().from(usersTable).all()
  const steps = (await db.select().from(workflowStepsTable)
    .where(eq(workflowStepsTable.workflow_id, id))
    .all())
    .sort((a, b) => a.step - b.step)
    .map(s => ({ ...s, user: allUsers.find(u => u.id === s.user_id) ?? null }))
  return { ...wf, steps }
}

export async function createWorkflow(name: string, description: string, org_id?: string | null): Promise<Workflow> {
  const wf: Workflow = {
    id: randomUUID(), org_id: org_id ?? null,
    name, description, is_active: true, created_at: new Date().toISOString()
  }
  await db.insert(workflowsTable).values(wf).run()
  return wf
}

export async function updateWorkflow(id: string, updates: Partial<Pick<Workflow, 'name' | 'description' | 'is_active'>>): Promise<Workflow | null> {
  await db.update(workflowsTable).set(updates).where(eq(workflowsTable.id, id)).run()
  return await db.select().from(workflowsTable).where(eq(workflowsTable.id, id)).get() as Workflow | null
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  await db.delete(workflowStepsTable).where(eq(workflowStepsTable.workflow_id, id)).run()
  await db.delete(workflowsTable).where(eq(workflowsTable.id, id)).run()
  return true
}

export async function setWorkflowSteps(workflow_id: string, steps: { user_id: string; focus: string }[]): Promise<WorkflowStep[]> {
  await db.delete(workflowStepsTable).where(eq(workflowStepsTable.workflow_id, workflow_id)).run()
  const newSteps: WorkflowStep[] = steps.map((s, i) => ({
    id: randomUUID(), workflow_id, step: i + 1, user_id: s.user_id, focus: s.focus,
  }))
  if (newSteps.length > 0) await db.insert(workflowStepsTable).values(newSteps).run()
  return newSteps
}

export async function getWorkflowStep(workflow_id: string, step: number): Promise<(WorkflowStep & { user: User | null }) | null> {
  const s = await db.select().from(workflowStepsTable)
    .where(and(eq(workflowStepsTable.workflow_id, workflow_id), eq(workflowStepsTable.step, step)))
    .get()
  if (!s) return null
  return { ...s, user: await getUserById(s.user_id) ?? null }
}

export async function getNextWorkflowStep(workflow_id: string, currentStep: number): Promise<(WorkflowStep & { user: User | null }) | null> {
  return await getWorkflowStep(workflow_id, currentStep + 1)
}

export async function getTotalSteps(workflow_id: string): Promise<number> {
  return (await db.select().from(workflowStepsTable).where(eq(workflowStepsTable.workflow_id, workflow_id)).all()).length
}

// ── Submissions ────────────────────────────────────────────────────────────

export async function getAllSubmissions(submitted_by?: string) {
  const cached = cacheGet<any[]>(CK.submissions())
  const allSubs    = await db.select().from(submissionsTable).orderBy(desc(submissionsTable.created_at)).all()
  const allWf      = await db.select().from(workflowsTable).all()
  const allSteps   = await db.select().from(workflowStepsTable).all()
  const allUsers   = await db.select().from(usersTable).all()
  const allDesigns = await db.select({ submission_id: designsTable.submission_id }).from(designsTable).all()

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

export async function getSubmission(id: string): Promise<Submission | undefined> {
  return await db.select().from(submissionsTable).where(eq(submissionsTable.id, id)).get() as Submission | undefined
}

export async function createSubmission(title: string, description: string, workflow_id: string, task_id?: string | null, submitted_by?: string | null, tags?: string | null): Promise<Submission> {
  const sub: Submission = {
    id: randomUUID(), title, description, workflow_id, task_id: task_id ?? null,
    submitted_by: submitted_by ?? null,
    status: 'draft', current_step: null, version: 1, drive_folder_url: null, tags: tags ?? null, created_at: new Date().toISOString(),
  }
  await db.insert(submissionsTable).values(sub).run()
  cacheDelete(CK.submissions())
  return sub
}

export async function updateSubmission(id: string, updates: Partial<Submission>): Promise<Submission | null> {
  await db.update(submissionsTable).set(updates).where(eq(submissionsTable.id, id)).run()
  cacheDelete(CK.submissions())
  return await getSubmission(id) ?? null
}

export type LibraryItem = {
  id: string; title: string; description: string; tags: string[]
  drive_folder_url: string | null; created_at: string
  submitter_name: string | null; workflow_name: string
  thumbnail: string | null; design_count: number
}

export async function getLibrarySubmissions(): Promise<LibraryItem[]> {
  const allSubs    = await db.select().from(submissionsTable).where(eq(submissionsTable.status, 'approved')).orderBy(desc(submissionsTable.created_at)).all()
  const allUsers   = await db.select().from(usersTable).all()
  const allWf      = await db.select().from(workflowsTable).all()
  const allDesigns = await db.select().from(designsTable).all()

  return allSubs.map(sub => {
    const submitter = sub.submitted_by ? allUsers.find(u => u.id === sub.submitted_by) ?? null : null
    const workflow  = allWf.find(w => w.id === sub.workflow_id)
    const designs   = allDesigns.filter(d => d.submission_id === sub.id).sort((a, b) => a.order_index - b.order_index)
    return {
      id:               sub.id,
      title:            sub.title,
      description:      sub.description,
      tags:             sub.tags ? JSON.parse(sub.tags) : [],
      drive_folder_url: sub.drive_folder_url,
      created_at:       sub.created_at,
      submitter_name:   submitter?.name ?? null,
      workflow_name:    workflow?.name ?? '',
      thumbnail:        designs[0]?.filename ?? null,
      design_count:     designs.length,
    }
  })
}

// ── Designs ────────────────────────────────────────────────────────────────

export async function getDesigns(submission_id: string): Promise<Design[]> {
  return (await db.select().from(designsTable)
    .where(eq(designsTable.submission_id, submission_id))
    .all())
    .sort((a, b) => a.order_index - b.order_index) as Design[]
}

export async function addDesign(data: Omit<Design, 'id'>): Promise<Design> {
  const design: Design = { id: randomUUID(), ...data }
  await db.insert(designsTable).values(design).run()
  return design
}

export async function getDesignCount(submission_id: string): Promise<number> {
  return (await db.select().from(designsTable).where(eq(designsTable.submission_id, submission_id)).all()).length
}

export async function toggleDesignLike(design_id: string): Promise<boolean> {
  const rows = await db.select().from(designsTable).where(eq(designsTable.id, design_id)).all()
  if (!rows[0]) throw new Error('Design not found')
  // liked is stored as integer 0/1 in SQLite; rows[0].liked may be 0, 1, true, or false
  const currentlyLiked = rows[0].liked === true || (rows[0].liked as unknown as number) === 1
  const newVal = !currentlyLiked
  await db.update(designsTable).set({ liked: newVal }).where(eq(designsTable.id, design_id)).run()
  return newVal
}

// Returns liked agent designs — distilled to style signals when count is large
export async function getLikedAgentDesigns(): Promise<{
  examples: { concept: string; prompt: string }[]
  totalLiked: number
}> {
  const rows = await db.select().from(designsTable)
    .where(sql`${designsTable.liked} = 1`)
    .all()

  const valid = rows.filter(d => d.prompt)
  const total = valid.length

  if (total === 0) return { examples: [], totalLiked: 0 }

  // Under 8: inject up to 5 full examples (recent)
  if (total <= 8) {
    return {
      examples: valid.slice(-5).map(d => ({
        concept: d.original_name ?? 'Liked design',
        prompt:  d.prompt!,
      })),
      totalLiked: total,
    }
  }

  // Over 8: pick 5 maximally diverse examples — spread across the full liked history
  // by sampling at even intervals so early + recent liked both represented
  const step = Math.floor(valid.length / 5)
  const sampled = [0, 1, 2, 3, 4].map(i => valid[Math.min(i * step, valid.length - 1)])

  return {
    examples: sampled.map(d => ({
      concept: d.original_name ?? 'Liked design',
      prompt:  d.prompt!,
    })),
    totalLiked: total,
  }
}

// ── Reviews ────────────────────────────────────────────────────────────────

export async function getReviews(submission_id: string): Promise<(Review & { reviewer: User | null; step: WorkflowStep | null })[]> {
  const sub      = await getSubmission(submission_id)
  const allRev   = await db.select().from(reviewsTable).where(eq(reviewsTable.submission_id, submission_id)).all()
  const allUsers = await db.select().from(usersTable).all()
  const allSteps = sub
    ? await db.select().from(workflowStepsTable).where(eq(workflowStepsTable.workflow_id, sub.workflow_id)).all()
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

export function clearUserReviewCache(userId: string) {
  cacheDelete(CK.reviews(userId))
}

export async function upsertReview(
  submission_id: string, reviewer_id: string, version: number,
  action: 'approved' | 'changes_requested', comment: string,
): Promise<Review> {
  const existing = await db.select().from(reviewsTable)
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
    await db.update(reviewsTable).set(review).where(eq(reviewsTable.id, existing.id)).run()
  } else {
    await db.insert(reviewsTable).values(review).run()
  }
  cacheDelete(CK.reviews(reviewer_id))
  return review
}

export async function getReviewsByUserStep(user_id: string) {
  const cached = cacheGet<any[]>(CK.reviews(user_id))
  if (cached) return cached

  const user = await getUserById(user_id)
  if (!user) return []

  const mySteps       = await db.select().from(workflowStepsTable).where(eq(workflowStepsTable.user_id, user_id)).all()
  const myReviews     = await db.select().from(reviewsTable).where(eq(reviewsTable.reviewer_id, user_id)).all()
  const myReviewedIds = new Set(myReviews.map(r => r.submission_id))

  const allSubs = await db.select().from(submissionsTable).all()
  const relevant = allSubs.filter(sub => {
    const myStep = mySteps.find(s => s.workflow_id === sub.workflow_id)
    if (!myStep) return false
    const isPending = sub.status === 'in_review' && sub.current_step === myStep.step
    return isPending || myReviewedIds.has(sub.id)
  })

  const allDesigns     = await db.select().from(designsTable).all()
  const allAnnotations = await db.select().from(annotationsTable).all()
  const allReviewsAll  = await db.select().from(reviewsTable).all()
  const allUsersAll    = await db.select().from(usersTable).all()
  const allStepsAll    = await db.select().from(workflowStepsTable).all()
  const allWorkflows   = await db.select().from(workflowsTable).all()

  const result = relevant
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(sub => {
      const myStep = mySteps.find(s => s.workflow_id === sub.workflow_id)!
      const isActuallyPending = sub.status === 'in_review' && sub.current_step === myStep.step
      const myReviewForVersion = myReviews.find(r => r.submission_id === sub.id && r.version === sub.version)
      const myLatestReview = myReviews
        .filter(r => r.submission_id === sub.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      // Only show as pending (null action) when submission is genuinely at this user's step
      const myReview = isActuallyPending ? myReviewForVersion : myLatestReview

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

export async function getAnnotations(submission_id: string): Promise<(Annotation & { reviewer: User | undefined })[]> {
  const allAnn   = await db.select().from(annotationsTable).where(eq(annotationsTable.submission_id, submission_id)).all()
  const allUsers = await db.select().from(usersTable).all()
  return allAnn
    .map(a => ({ ...a, reviewer: allUsers.find(u => u.id === a.reviewer_id) as User | undefined }))
    .sort((a, b) => a.number - b.number)
}

export async function addAnnotation(data: Omit<Annotation, 'id' | 'number' | 'created_at'>): Promise<Annotation> {
  const existing = await db.select().from(annotationsTable).where(eq(annotationsTable.design_id, data.design_id)).all()
  const number   = existing.length + 1
  const annotation: Annotation = { id: randomUUID(), ...data, number, created_at: new Date().toISOString() }
  await db.insert(annotationsTable).values(annotation).run()
  return annotation
}

export async function deleteAnnotation(id: string, reviewer_id: string): Promise<boolean> {
  const result = await db.delete(annotationsTable)
    .where(and(eq(annotationsTable.id, id), eq(annotationsTable.reviewer_id, reviewer_id)))
    .run()
  return result.rowsAffected > 0
}

// ── Notifications ──────────────────────────────────────────────────────────

export async function createNotification(opts: {
  user_id: string; type: Notification['type'];
  title: string; body?: string; href?: string | null
}): Promise<Notification> {
  const n: Notification = {
    id: randomUUID(), user_id: opts.user_id, type: opts.type,
    title: opts.title, body: opts.body ?? '', href: opts.href ?? null,
    read: false, created_at: new Date().toISOString(),
  }
  await db.insert(notificationsTable).values(n).run()
  cacheDelete(CK.notifications(opts.user_id))
  return n
}

export async function getNotifications(user_id: string, unreadOnly = false): Promise<Notification[]> {
  const cached = cacheGet<Notification[]>(CK.notifications(user_id))
  if (cached && !unreadOnly) return cached

  let query: any = db.select().from(notificationsTable)
    .where(eq(notificationsTable.user_id, user_id))
    .orderBy(desc(notificationsTable.created_at))

  const items = await query.all() as Notification[]
  if (!unreadOnly) cacheSet(CK.notifications(user_id), items, 10 * 1000)
  if (unreadOnly) return items.filter(n => !n.read)
  return items
}

export async function markNotificationRead(id: string, user_id: string): Promise<void> {
  await db.update(notificationsTable).set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.user_id, user_id)))
    .run()
  cacheDelete(CK.notifications(user_id))
}

export async function markAllNotificationsRead(user_id: string): Promise<void> {
  await db.update(notificationsTable).set({ read: true })
    .where(eq(notificationsTable.user_id, user_id))
    .run()
  cacheDelete(CK.notifications(user_id))
}

// ── Workspace Reset ────────────────────────────────────────────────────────

export async function resetWorkspaceData(): Promise<void> {
  await db.delete(annotationsTable).run()
  await db.delete(reviewsTable).run()
  await db.delete(designsTable).run()
  await db.delete(submissionsTable).run()
  await db.delete(subtasksTable).run()
  await db.delete(attachmentsTable).run()
  await db.delete(tasksTable).run()
  await db.delete(projectsTable).run()
  await db.delete(notificationsTable).run()
  cacheClear('')
}

// ── Integrations ───────────────────────────────────────────────────────────

export type OrgIntegration = {
  id: string; org_id: string; tool_id: string
  connected_by: string; connected_at: string
  access_token: string | null; refresh_token: string | null
  token_expires_at: string | null; account_email: string | null; account_name: string | null
}

export async function getOrgIntegrations(org_id: string): Promise<OrgIntegration[]> {
  return await db.select().from(integrationsTable)
    .where(eq(integrationsTable.org_id, org_id))
    .all() as OrgIntegration[]
}

export async function getOrgIntegration(org_id: string, tool_id: string): Promise<OrgIntegration | null> {
  return await db.select().from(integrationsTable)
    .where(and(eq(integrationsTable.org_id, org_id), eq(integrationsTable.tool_id, tool_id)))
    .get() as OrgIntegration | null ?? null
}

export async function upsertIntegration(data: {
  org_id: string; tool_id: string; connected_by: string
  access_token?: string | null; refresh_token?: string | null
  token_expires_at?: string | null; account_email?: string | null; account_name?: string | null
}): Promise<OrgIntegration> {
  const existing = await getOrgIntegration(data.org_id, data.tool_id)
  const now = new Date().toISOString()
  if (existing) {
    const updated = {
      connected_by: data.connected_by, connected_at: now,
      access_token: data.access_token ?? existing.access_token,
      refresh_token: data.refresh_token ?? existing.refresh_token,
      token_expires_at: data.token_expires_at ?? existing.token_expires_at,
      account_email: data.account_email ?? existing.account_email,
      account_name: data.account_name ?? existing.account_name,
    }
    await db.update(integrationsTable).set(updated).where(eq(integrationsTable.id, existing.id)).run()
    return { ...existing, ...updated }
  }
  const row: OrgIntegration = {
    id: randomUUID(), org_id: data.org_id, tool_id: data.tool_id,
    connected_by: data.connected_by, connected_at: now,
    access_token: data.access_token ?? null, refresh_token: data.refresh_token ?? null,
    token_expires_at: data.token_expires_at ?? null,
    account_email: data.account_email ?? null, account_name: data.account_name ?? null,
  }
  await db.insert(integrationsTable).values(row).run()
  return row
}

export async function disconnectIntegration(org_id: string, tool_id: string): Promise<void> {
  await db.delete(integrationsTable)
    .where(and(eq(integrationsTable.org_id, org_id), eq(integrationsTable.tool_id, tool_id)))
    .run()
}

// ── Backward-compatible aliases (used by existing API routes) ──────────────
export const getAllReviewers    = getAllUsers
export const getReviewerByToken = getUserByToken
