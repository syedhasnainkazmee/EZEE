# AI Designer Agent — Reference Document

> Read this before making any changes to the agent pipeline.

---

## What It Does

The AI Designer Agent is triggered from the submission form via the **Activate Designer Agent** button. It:

1. Reads the submission title, description, tags, and linked task context
2. Calls **Kimi K2** to develop 10 distinct advertising creative concepts — each with ad copy and an image prompt
3. Calls **Flux / SD3 Medium / SD3.5 Large** in parallel to render 10 images
4. Creates a separate submission in the DB under the `ai-designer-agent` user
5. Saves each design with its model name, concept notes, ad copy, and Flux prompt for learning

---

## File Map

| File | Role |
|------|------|
| `route.ts` | Main API route — all pipeline logic |
| `branding.ts` | Sunhub brand constants injected into every Kimi prompt |
| `SUNHUB.md` | Full Sunhub company + audience + brand context — read before changing Kimi prompts |
| `AGENT.md` | This document |

**Related files outside this directory:**

| File | What changed |
|------|-------------|
| `src/app/submit/page.tsx` | Agent button, two-call flow, progress modal |
| `src/app/submission/[id]/page.tsx` | AI badge, model tag, ad copy display, like button |
| `src/lib/db.ts` | `addDesign`, `toggleDesignLike`, `getLikedAgentDesigns` |
| `src/lib/schema.ts` | `designs` table — extra columns added |

---

## API Route

**Endpoint:** `POST /api/agent/designer`

The route handles two sequential steps. The frontend calls them separately so the UI can show real progress.

### Step A — `{ step: "concepts" }`

**Input:**
```json
{
  "step": "concepts",
  "title": "Campaign: Stop Wasting Time on Procurement",
  "description": "...",
  "tags": ["Social Media", "Instagram Story"],
  "task_id": "abc123",
  "workflow_id": "wf456"
}
```

**What happens:** Queries liked designs → builds Kimi prompt → calls Kimi K2 → parses 10 concept objects.

**Output:**
```json
{
  "concepts": [ { "concept": "...", "audience": "...", "copy": { "headline": "...", "body": "..." }, "notes": "...", "prompt": "..." } ],
  "width": 768,
  "height": 1344
}
```

---

### Step B — `{ step: "render" }`

**Input:** Same fields as Step A, plus:
```json
{
  "step": "render",
  "concepts": [ ...array from Step A... ]
}
```

**What happens:** Renders 10 images across 3 models in parallel → uploads → creates submission → saves designs.

**Output:**
```json
{ "submissionId": "...", "designCount": 10 }
```

---

## Models

### Kimi K2 (Concept Generation)

- **Model:** `moonshotai/kimi-k2-instruct`
- **Base URL:** `https://integrate.api.nvidia.com/v1`
- **Endpoint:** `POST /chat/completions`
- **Env key:** `NVIDIA_NIM_API_KEY`
- **Temperature:** 0.7 — needs some randomness for creative variety
- **Max tokens:** 3000
- **Vision model:** `moonshotai/kimi-k2.5` — available when `vision=true`, NOT used in current pipeline (too slow, 504 on long tasks). Reserved for future image-input features.

### Flux 2 Klein 4B (Image Generation)

- **Endpoint:** `https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b`
- **Env key:** `NVIDIA_NIM_FLUX_KEY`
- **Request body:** `{ prompt, width, height }` — pixel dimensions only, no `aspect_ratio`
- **Valid dimensions:** 768, 832, 896, 960, 1024, 1088, 1152, 1216, 1280, 1344 (must be from this list)
- **Response:** `{ artifacts: [{ base64, finishReason, seed }] }`
- **Notes:** Does NOT accept `num_inference_steps`, `guidance`, or `negative_prompt`

### Stable Diffusion 3 Medium

- **Endpoint:** `https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium`
- **Env key:** `NVIDIA_SD3_MEDIUM_KEY`
- **Request body:** `{ prompt, aspect_ratio, negative_prompt }` — uses aspect ratio strings, NOT pixel dimensions
- **Valid aspect ratios:** `1:1`, `9:16`, `16:9`, `2:3`, `3:2`, `4:5`, `5:4`, `21:9`, `9:21`
- **Response:** `{ image: "base64jpeg" }` — note: key is `image`, not `artifacts`

### Stable Diffusion 3.5 Large

- **Endpoint:** `https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3_5-large`
- **Env key:** `NVIDIA_SD3_LARGE_KEY` (uses the general `NVIDIA_API_KEY`)
- **Request body:** Same as SD3 Medium — `{ prompt, aspect_ratio, negative_prompt }`
- **Response:** `{ artifacts: [{ base64 }] }` — same format as Flux, NOT the `image` key
- **Status:** Currently returns 404. Likely requires licence acceptance on build.nvidia.com before the endpoint activates. **Falls back to SD3 Medium automatically when 404.**
- **When it activates:** No code change needed — the fallback will stop triggering once the endpoint is live.

---

## Model Distribution

10 images are distributed round-robin by index:

| Index | Model |
|-------|-------|
| 0, 3, 6, 9 | Flux (4 images) |
| 1, 4, 7 | SD3 Medium (3 images) |
| 2, 5, 8 | SD3.5 Large → SD3 Medium fallback (3 images) |

To change distribution, edit `MODEL_FOR_INDEX` in `route.ts`:
```typescript
const MODEL_FOR_INDEX = (i: number) => i % 3 === 0 ? 'flux' : i % 3 === 1 ? 'sd3-medium' : 'sd3-large'
```

---

## Dimension Mapping

Tags on the submission determine image dimensions:

| Tag contains | Flux (w×h) | SD3 aspect ratio |
|---|---|---|
| `story` | 768×1344 | 9:16 |
| `banner` | 1344×768 | 16:9 |
| `email` | 1280×768 | 16:9 |
| `logo` | 1024×1024 | 1:1 |
| *(default)* | 1024×1024 | 1:1 |

---

## Database — `designs` Table Extra Columns

These columns were added to `designs` via `ALTER TABLE` on Turso. They are all nullable and only populated by the agent:

| Column | Type | Purpose |
|--------|------|---------|
| `prompt` | `TEXT` | The exact Flux/SD prompt used — stored for learning |
| `liked` | `INTEGER` (0/1) | User liked this design — feeds back into future generations |
| `model` | `TEXT` | Which model rendered it: `flux`, `sd3-medium`, `sd3-large` |
| `concept_notes` | `TEXT` | Kimi's reasoning: audience + why this concept works |
| `copy` | `TEXT` | JSON string: `{ headline, body }` — ready-to-use ad copy |

**IMPORTANT:** When querying `liked` in Drizzle with LibSQL, use raw SQL — do NOT use `eq(col, true)`:
```typescript
// ✅ Correct
.where(sql`${designsTable.liked} = 1`)

// ❌ Will fail — LibSQL rejects JS boolean as parameter
.where(eq(designsTable.liked, true))
```

---

## Kimi Prompt Structure

Kimi is instructed to work in this 7-step chain per concept. The key principle is **task analysis first, then copy, then visual** — nothing is generated until the campaign goal is understood.

### Pre-generation: Brief Analysis
Before any concepts, Kimi answers internally:
- What is the PRIMARY GOAL of this campaign?
- What specific problem does Sunhub solve in this context?
- Who is the most relevant persona for THIS brief?
- What single emotion should the viewer feel?
- What action should they take?

### Per-concept chain (7 steps):
1. **CAMPAIGN ANGLE** — how this concept serves the specific campaign goal (must reference the brief, not generic)
2. **PERSONA** — which of the 4 personas, and why they are the right target for THIS campaign moment
3. **CORE MESSAGE** — one sentence: the single idea this ad must land (not a tagline — a clear statement)
4. **COPY** — headline (5–8 words) + body (1–2 sentences), written directly from the core message
5. **VISUAL LOGIC** — one sentence: what scene emotionally amplifies the copy, and why (not a literal illustration)
6. **IMAGE PROMPT** — 4–6 sentences, built from the visual logic, ending with the Phase One IQ4 signature line
7. **NOTES** — why copy + visual + persona work together for this specific campaign

The output is a JSON array of 10 objects:
```json
{
  "concept": "Short evocative name",
  "audience": "Persona name",
  "copy": { "headline": "...", "body": "..." },
  "notes": "Why this works for this audience",
  "prompt": "Full image generation prompt..."
}
```

---

## Target Audience (Baked Into Every Kimi Call)

Four personas are defined in the prompt:

1. **EPC Contractors** — Age 32–55, project managers/procurement leads at solar EPC firms. Pain: sourcing large equipment volumes fast under deadline.
2. **Independent Solar Installers** — Age 28–50, owner-operators. Pain: can't match distributor pricing, struggle to source locally.
3. **Solar Manufacturers & Brands** — Age 35–55, sales/channel managers. Pain: reaching qualified buyers at scale, excess warehouse inventory.
4. **Distributors & Inventory Liquidators** — Age 35–60, operations/sales leads. Pain: capital tied up in aging stock, need to move it fast.

Each of the 10 concepts must target a different persona. The audience mix must be spread across all 4.

---

## Agent Learning System

When the agent generates designs, users can **like** individual images on the submission detail page (heart button, only shown on AI submissions).

**How it works:**
- Liked designs have `liked = 1` and their `prompt` saved in the DB
- Before each new Kimi call, `getLikedAgentDesigns()` is called
- Up to 5 representative examples (sampled evenly across all liked, not just most recent) are injected into the Kimi prompt as a "CREATIVE TEAM PREFERENCES" section
- Kimi is told to study the approach and emotional tone — not copy, but understand what resonates
- Prompts are trimmed to 2 sentences before injection to keep context lean

**Scaling:** The sampling strategy ensures the injected section stays the same token size regardless of how many liked designs exist (5 samples max, 2 sentences each).

---

## Agent User

The agent creates submissions under a fixed synthetic user:

```
ID:    ai-designer-agent
Email: ai-designer@ezee.internal
Name:  AI Designer
Role:  member
```

This user is created on first use via `ensureAgentUser()` if it doesn't exist. Agent submissions are identified by `submitted_by = 'ai-designer-agent'` and titled with `[AI]` prefix.

---

## Image Storage

| Environment | Storage | Path |
|---|---|---|
| Production | Vercel Blob | `agent-designs/{uuid}.png` |
| Local dev | `public/agent-uploads/` | `/agent-uploads/{uuid}.png` |

Local fallback activates when `BLOB_READ_WRITE_TOKEN` is unset or equals `your-vercel-blob-token-here`.

---

## Environment Variables

```
NVIDIA_NIM_API_KEY       # Kimi K2 — text model for concept generation
NVIDIA_NIM_FLUX_KEY      # Flux 2 Klein 4B image generation
NVIDIA_SD3_MEDIUM_KEY    # SD3 Medium image generation
NVIDIA_SD3_LARGE_KEY     # SD3.5 Large (also works as general NVIDIA API key)
NVIDIA_API_KEY           # General NVIDIA key (use for new models)
BLOB_READ_WRITE_TOKEN    # Vercel Blob — needed in production for image uploads
```

---

## UI — Submission Detail Page

On AI-generated submissions (`submitted_by = 'ai-designer-agent'`), each design card shows:

- **`[AI Generated]` badge** in the page header
- **Model pill** on each card: `Flux` (blue), `SD3` (purple), `SD3.5` (orange)
- **Headline** — bold ad copy headline
- **Body copy** — 1–2 sentence ad copy
- **Concept notes** — italicized reasoning (audience + why the visual works)
- **Heart button** — toggles `liked` in DB, feeds the learning system

---

## Common Failure Modes

| Error | Cause | Fix |
|-------|-------|-----|
| `Kimi returned no concepts` | Kimi returned malformed JSON | Check `max_tokens` — may be truncating; parseConcepts has fallback |
| `Flux 422` | Invalid dimensions | Only use values from valid dimension list in this doc |
| `sd3-medium 404` | Wrong endpoint URL | Verify URL — no pixel dimensions for SD3, use `aspect_ratio` |
| `sd3-large 404` | Licence not accepted on build.nvidia.com | Falls back to SD3 Medium automatically — no action needed |
| `Failed query: liked = 1` | Drizzle boolean/LibSQL mismatch | Use `sql\`col = 1\`` not `eq(col, true)` |
| Agent generates 6 instead of 10 | One model failing silently | Check server logs for `[agent] image N failed` |
| `BLOB_READ_WRITE_TOKEN` missing | Vercel Blob not configured | Images fall back to `public/agent-uploads/` in dev — this is fine |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-16 | Initial agent built — Kimi K2 + Flux, single-call pipeline |
| 2026-03-16 | Split into two-call flow (concepts → render) for real progress UI |
| 2026-03-16 | Added SD3 Medium + SD3.5 Large, round-robin distribution |
| 2026-03-16 | Added liked/learning system — heart button, `getLikedAgentDesigns` |
| 2026-03-16 | Added `model`, `concept_notes`, `copy` columns to designs table |
| 2026-03-16 | Kimi prompt updated: copy-first sequence, 4 audience personas, richer concept output |
| 2026-03-16 | Kimi prompt restructured: task-analysis-first chain (brief analysis → campaign angle → persona → core message → copy → visual logic → image prompt). max_tokens raised to 4000. |
| 2026-03-16 | UI: model badge, ad copy display, concept notes on design cards |
