# EZEE — Design Review Platform: Codebase Reference

> Keep this document updated as changes are made.

---

## Project Overview

**EZEE** is a full-stack TypeScript/Next.js design review and project management platform.

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite via Drizzle ORM (`./design-review.db`)
- **Auth**: JWT cookies (HttpOnly) + magic review links
- **Email**: Resend API
- **Styling**: Tailwind CSS with custom theme
- **Location**: `c:\Users\Hasnain Kazmee\Experiment\design-review\`

---

## Directory Structure

```
src/
├── app/
│   ├── api/                        # All API route handlers
│   │   ├── auth/                   # login, logout, me, invite, accept-invite
│   │   ├── submissions/            # CRUD + send + resubmit
│   │   ├── review/[token]/         # Public magic-link review API
│   │   ├── my/reviews/             # Logged-in user's pending reviews
│   │   ├── annotations/            # Add annotation pins
│   │   ├── tasks/                  # Task CRUD, subtasks, attachments
│   │   ├── projects/               # Project listing
│   │   ├── admin/
│   │   │   ├── workflows/          # Workflow + step management
│   │   │   └── users/              # Admin user management
│   │   ├── notifications/          # Get/mark-read notifications
│   │   └── org/                    # Org info + setup
│   ├── admin/                      # Admin dashboard page
│   ├── review/[token]/             # Public reviewer UI (no login)
│   ├── submissions/                # Submission list & detail
│   ├── tasks/                      # Task management
│   ├── submit/                     # New submission form
│   ├── settings/                   # User settings
│   ├── login/                      # Auth page
│   ├── onboarding/                 # First-run setup
│   ├── accept-invite/              # Invitation acceptance
│   ├── setup/                      # Org setup flow
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Dashboard home
│   └── globals.css
├── components/
│   ├── AuthProvider.tsx            # Auth React context + useAuth() hook
│   ├── Sidebar.tsx                 # Nav + notification panel
│   ├── AnnotationCanvas.tsx        # Clickable image pin annotations
│   ├── Lightbox.tsx                # Full-screen image viewer
│   ├── ProcessLogo.tsx
│   └── SunhubLogo.tsx
└── lib/
    ├── db.ts                       # All DB operations + exported types
    ├── schema.ts                   # Drizzle table definitions
    ├── auth.ts                     # JWT sign/verify, bcrypt, cookie helpers
    ├── cache.ts                    # LRU cache (500 items, 30s default TTL)
    └── email.ts                    # Email templates + Resend sending
```

---

## Database Schema (14 tables)

| Table | Key Fields |
|-------|-----------|
| `organizations` | id, name, domain |
| `users` | id, org_id, name, email, role (admin\|member), token (magic link), password_hash, notify_email |
| `user_sessions` | id, user_id, jti, expires_at |
| `invitation_tokens` | id, org_id, email, role, token, used, expires_at (72h) |
| `workflows` | id, org_id, name, description, is_active |
| `workflow_steps` | id, workflow_id, user_id, step (int), focus (text) |
| `submissions` | id, title, description, workflow_id, task_id, submitted_by, status, current_step, version |
| `designs` | id, submission_id, filename, original_name, variation_label, order_index, version |
| `reviews` | id, submission_id, reviewer_id, action (approved\|changes_requested), comment, version |
| `annotations` | id, design_id, submission_id, reviewer_id, x, y (normalized 0-1), comment, number |
| `projects` | id, org_id, name, description |
| `tasks` | id, project_id, title, description, assignor_id, assignee_id, due_date, priority (low\|medium\|high), status (open\|in_progress\|in_review\|completed) |
| `subtasks` | id, task_id, title, completed |
| `task_attachments` | id, task_id, filename, original_name, mime_type, size, uploaded_by |
| `notifications` | id, user_id, type, title, body, href, read |

**Notification types**: `task_assigned`, `review_needed`, `submission_approved`, `changes_requested`, `invited`

**Submission statuses**: `draft` → `in_review` → `approved` / `changes_requested`

---

## Authentication Flow

- **Cookie name**: `process-session` (HttpOnly JWT)
- **Middleware** (`src/middleware.ts`): Edge-compatible via `jose`, attaches `x-user-id`, `x-user-role`, `x-org-id`, `x-user-name`, `x-user-email` headers to every request
- **Public routes**: `/login`, `/setup`, `/accept-invite`, `/review/[token]`, `/api/auth/*`, `/api/org/setup`, `/api/review/*`
- **Admin routes**: `/admin`, `/api/admin/*`
- **Magic links**: Reviewers access `/review/{user.token}` — no login required

---

## API Routes Summary

### Auth
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Email+password → JWT cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/invite` | Admin creates invite |
| POST | `/api/auth/accept-invite` | Set password + create account |

### Submissions
| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/submissions` | List all / create |
| GET | `/api/submissions/[id]` | Detail with reviews + designs |
| POST | `/api/submissions/[id]/send` | Move to `in_review`, email first reviewer |
| POST | `/api/submissions/[id]/resubmit` | Reset to step 1 after changes |

### Reviews
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/review/[token]` | Public: reviewer + pending submissions |
| POST | `/api/review/[token]/[subId]` | Submit approve/changes_requested action |
| GET | `/api/my/reviews` | Logged-in user's pending reviews |
| POST | `/api/annotations` | Add annotation pin |

### Tasks
| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/tasks` | List / create |
| POST | `/api/tasks/[id]` | Update status |
| POST | `/api/tasks/[id]/subtasks` | Add subtask |
| POST | `/api/tasks/[id]/attachments` | Upload file |

### Admin/Other
| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/admin/workflows` | List / create workflows |
| POST | `/api/admin/workflows/[id]/steps` | Define steps |
| GET | `/api/admin/users` | List all users |
| GET | `/api/notifications` | User notifications |
| POST | `/api/notifications` | Mark read |
| GET | `/api/org` | Current org |
| GET | `/api/projects` | List projects |

---

## Caching (`src/lib/cache.ts`)

LRU cache, 500 items max. Cache keys:

| Key Pattern | Content |
|-------------|---------|
| `users:all` | All users |
| `user:{id}` | Single user |
| `user:email:{email}` | User by email |
| `tasks:{projectId?}` | Tasks |
| `subtasks:{taskId}` | Subtasks |
| `attachments:{taskId}` | Attachments |
| `submissions:all` | All submissions |
| `reviews:user:{userId}` | User reviews |
| `notifs:user:{userId}` | Notifications |
| `org:{id}` | Organization |
| `workflows:all` | Workflows |

Invalidation: `cacheDelete(key)` or `cacheClear('prefix:')`.

---

## Email Templates (`src/lib/email.ts`)

All sent via Resend. Types:
1. **Review Email** — Reviewer notified when submission ready (includes magic link)
2. **Task Assigned Email** — Assignee notified of new task
3. **Task in Review Email** — Task owner notified when linked submission enters review
4. **Changes Requested Email** — Submitter notified (orange styling)
5. **Final Approval Email** — Submitted approved (green styling)
6. **Welcome Email** — New team member onboarding

---

## Tailwind Theme

Custom config in `tailwind.config.js`:
- **Nav**: `#100F0D` (warm near-black)
- **Background**: `#F4F2EE` (warm parchment)
- **Surface**: `#FDFCFB` (off-white cards)
- **Accent**: `#D4512E` (deep terracotta) — primary CTA color
- **Success**: `#0EA572` (emerald)
- **Error**: `#DC3545` (red)
- **Fonts**: `DM Sans` (body), `Fraunces` (display/headings — optical-size serif)
- **Custom shadows**: `card`, `card-h`, `popup`, `modal`, `accent`, `glow`
- **Animations**: `fade-in`, `slide-in-left`, `scale-in`, `pulse-soft`, `shimmer`, `notif-slide`

Use `p-*` prefix for custom colors (e.g. `bg-p-accent`, `text-p-nav`).

### Design Utilities (globals.css)
- `.with-noise` — adds subtle grain texture (use on dark panels/sidebar)
- `.text-gradient` — terracotta shimmer gradient text
- `.pulse-dot` — pulsing scale animation for status indicators
- `kbd` — styled keyboard shortcut badge

---

## Environment Variables

```
JWT_SECRET=                  # Default: 'dev-secret-change-in-production-please'
BCRYPT_ROUNDS=               # Default: 12
RESEND_API_KEY=              # Resend email service key
RESEND_FROM_EMAIL=           # From address
NEXT_PUBLIC_BASE_URL=        # App URL for email links
NODE_ENV=
DISABLE_SEED=                # Set 'true' to skip seeding
```

---

## Key Architectural Patterns

1. **Magic Links** — External reviewers get a permanent token URL; no password needed
2. **Version Tracking** — `version` field on submissions/reviews handles concurrent edits
3. **Configurable Workflow Chain** — Admins define ordered steps with per-step reviewer focus
4. **Dual Notifications** — In-app (`notifications` table) + email via Resend
5. **Edge Auth** — `jose` in middleware for Edge runtime; `jsonwebtoken` elsewhere
6. **Enriched API Responses** — Routes join user/project/count data before returning to client
7. **Uploads** — Files stored in `public/uploads/`
8. **Seed Data** — DB auto-seeds on first run with 3 users (Minhal, Meeran, Daniyal) and 1 workflow

---

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Production server
npm run db:migrate   # Run migration script
npm run db:studio    # Open Drizzle Studio (DB GUI)
```

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-15 | Initial document created from codebase analysis |
| 2026-03-15 | **Design overhaul** — DM Sans + Fraunces typography; deeper dark nav (#100F0D); warm parchment bg (#F4F2EE); deeper terracotta accent (#D4512E); compact 1-line submission rows; filter tabs on dashboard; stats pills in header; `/` keyboard shortcut for search; split-screen login with brand panel; slimmer task sidebar; noise texture on sidebar; new animations |
