# EZEE — Design Review Platform

A full-stack platform for managing design approval workflows. Teams submit designs through configurable multi-step pipelines, reviewers give annotated feedback, and everyone stays in sync via email and in-app notifications.

---

## Features

### Approval Workflows
- Build multi-step review chains with a named focus per step (e.g. "Brand check → Copy check → Final approval")
- Submissions progress sequentially: **Draft → In Review → Approved / Changes Requested**
- Resubmit revised designs and restart the review cycle

### Design Submissions
- Upload design files with variation labels and ordering
- Dashboard with filter tabs (In Review, Needs Action, Approved) and live badge counts
- Full submission history with per-version review trail

### Pin Annotations
- Reviewers click directly on a design to drop numbered pin comments
- Coordinates stored as normalized (0–1) values — resolution-independent

### Task Management
- Create tasks with priority levels (Low / Medium / High)
- Link tasks to submissions — task owners are notified when their submission enters review
- Subtasks, file attachments, and status tracking (Open → In Progress → In Review → Completed)

### External Reviewer Access
- Magic links let external reviewers access their queue with no login required
- Copy-to-clipboard link generation from the admin panel

### Notifications
- In-app notification panel with unread badge
- Email notifications for: review requests, approvals, change requests, task assignments, and invites
- Mark all read or dismiss individually

### Team Administration
- Invite members by email with role-based access (Admin / Member)
- Admin dashboard for user and workflow management

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite + Drizzle ORM |
| Auth | JWT (HttpOnly cookies) + bcryptjs |
| Email | Resend API |
| Caching | LRU cache (500 items, 30s TTL) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Resend](https://resend.com) API key for email

### Setup

```bash
git clone https://github.com/syedhasnainkazmee/EZEE.git
cd EZEE
npm install
```

Create a `.env.local` file:

```env
JWT_SECRET=your-secret-here
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=you@yourdomain.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

```bash
npm run dev
```

Visit `http://localhost:3000/setup` to initialize your organization on first run.

The database auto-seeds with a default workflow and three demo users on first launch. Set `DISABLE_SEED=true` to skip.

---

## Default Demo Users

| Name | Role |
|---|---|
| Daniyal | Admin |
| Minhal | Member |
| Meeran | Member |

Default workflow: **Social Media Design Review** (3-step approval chain)

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET` | JWT signing key | `dev-secret-change-in-production-please` |
| `BCRYPT_ROUNDS` | Password hash rounds | `12` |
| `RESEND_API_KEY` | Resend email API key | — |
| `RESEND_FROM_EMAIL` | Sender address | — |
| `NEXT_PUBLIC_BASE_URL` | App URL (used in email links) | — |
| `DISABLE_SEED` | Skip auto-seed on first run | `false` |

---

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:studio    # Open Drizzle Studio (DB browser)
npx tsx scripts/populate-demo.ts   # Populate demo data
npx tsx scripts/test-emails.ts     # Preview email templates
```
