import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { createSubmission, addDesign, getUserById, getTask, getSubtasks, getLikedAgentDesigns } from '@/lib/db'
import { db } from '@/lib/schema'
import { users as usersTable } from '@/lib/schema'

import { BRAND } from './branding'

// ── Constants ──────────────────────────────────────────────────────────────

const KIMI_BASE         = 'https://integrate.api.nvidia.com/v1'
const KIMI_MODEL_TEXT   = 'moonshotai/kimi-k2-instruct'
const KIMI_MODEL_VISION = 'moonshotai/kimi-k2.5'

// Image generation endpoints
const FLUX_BASE       = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b'
const SD3_MEDIUM_BASE = 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium'
const SD3_LARGE_BASE  = 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3_5-large'
const OPENAI_BASE     = 'https://api.openai.com/v1'

// Distribution across 10 images: 0,4,8→Flux | 1,5,9→SD3 Medium | 2,6→DALL-E 3 | 3,7→SD3.5 Large
const MODEL_FOR_INDEX = (i: number) => {
  const mod = i % 4
  if (mod === 0) return 'flux'
  if (mod === 1) return 'sd3-medium'
  if (mod === 2) return 'dalle3'
  return 'sd3-large'
}

export const maxDuration = 300

const AGENT_USER_ID    = 'ai-designer-agent'
const AGENT_USER_EMAIL = 'ai-designer@ezee.internal'
const AGENT_USER_NAME  = 'AI Designer'

const VARIATION_LABELS = ['A','B','C','D','E','F','G','H','I','J']

// ── Helpers ────────────────────────────────────────────────────────────────

function getDimensions(tags: string[]): { width: number; height: number } {
  const t = tags.map(s => s.toLowerCase()).join(' ')
  if (t.includes('story'))   return { width: 768,  height: 1344 }
  if (t.includes('banner'))  return { width: 1344, height: 768  }
  if (t.includes('email'))   return { width: 1280, height: 768  }
  if (t.includes('logo'))    return { width: 1024, height: 1024 }
  return                            { width: 1024, height: 1024 }
}

// SD3 uses aspect_ratio strings instead of pixel dimensions
function toAspectRatio(width: number, height: number): string {
  if (width === height)    return '1:1'
  if (width < height)      return '9:16'   // story / portrait
  return '16:9'                             // banner / landscape
}

async function ensureAgentUser(orgId: string | null): Promise<void> {
  const existing = await getUserById(AGENT_USER_ID)
  if (existing) return

  await db.insert(usersTable).values({
    id:            AGENT_USER_ID,
    org_id:        orgId,
    name:          AGENT_USER_NAME,
    email:         AGENT_USER_EMAIL,
    role:          'member',
    token:         'ai-designer-agent-token',
    password_hash: null,
    notify_email:  false,
    created_at:    new Date().toISOString(),
  }).run()
}

async function callKimi(
  messages: { role: string; content: string | object[] }[],
  vision = false,
): Promise<string> {
  const key = process.env.NVIDIA_NIM_API_KEY
  if (!key) throw new Error('NVIDIA_NIM_API_KEY not set')

  const model = vision ? KIMI_MODEL_VISION : KIMI_MODEL_TEXT

  const res = await fetch(`${KIMI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Kimi API error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

async function generateImageWithFlux(prompt: string, width: number, height: number): Promise<Buffer> {
  const key = process.env.NVIDIA_NIM_FLUX_KEY
  if (!key) throw new Error('NVIDIA_NIM_FLUX_KEY not set')
  const res = await fetch(FLUX_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ prompt, width, height }),
  })
  if (!res.ok) throw new Error(`Flux ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const b64 = data?.artifacts?.[0]?.base64
  if (!b64) throw new Error('Flux returned no image data')
  return Buffer.from(b64, 'base64')
}

// SD3 Medium: returns { image: "base64jpeg" }
// SD3.5 Large: returns { artifacts: [{ base64 }] }  — same format as Flux
async function generateImageWithSD3(
  prompt: string, width: number, height: number,
  model: 'sd3-medium' | 'sd3-large',
): Promise<Buffer> {
  const [url, key] = model === 'sd3-medium'
    ? [SD3_MEDIUM_BASE, process.env.NVIDIA_SD3_MEDIUM_KEY]
    : [SD3_LARGE_BASE,  process.env.NVIDIA_SD3_LARGE_KEY]
  if (!key) throw new Error(`Key not set for ${model}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      prompt,
      aspect_ratio:    toAspectRatio(width, height),
      negative_prompt: 'split screen, diptych, collage, text, watermark, logo, blue solar panels, low quality, blurry',
    }),
  })
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  // SD3 Medium → data.image  |  SD3.5 Large → data.artifacts[0].base64
  const b64 = data?.image ?? data?.artifacts?.[0]?.base64
  if (!b64) throw new Error(`${model} returned no image data`)
  return Buffer.from(b64, 'base64')
}

// GPT Image 1.5: returns { data: [{ url }] }
async function generateImageWithDALLE3(prompt: string, width: number, height: number): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not set')

  // gpt-image-1.5 supported sizes
  let size: '1024x1024' | '1536x1024' | '1024x1536' = '1024x1024'
  if (width > height)  size = '1536x1024'
  else if (height > width) size = '1024x1536'

  // Force photorealism — model defaults to illustrative/painterly without this
  const realisticPrompt = `Photorealistic photograph only. Not illustrated, not digital art, not cartoon, not painting. ${prompt}`

  const res = await fetch(`${OPENAI_BASE}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-image-1.5', prompt: realisticPrompt, size, quality: 'medium', n: 1 }),
  })
  if (!res.ok) throw new Error(`GPT Image 1.5 ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()

  // gpt-image-1.5 returns a temporary URL, not base64
  const url = data?.data?.[0]?.url
  if (!url) throw new Error('GPT Image 1.5 returned no image URL')

  const imgRes = await fetch(url)
  if (!imgRes.ok) throw new Error(`Failed to fetch GPT Image 1.5 result: ${imgRes.status}`)
  return Buffer.from(await imgRes.arrayBuffer())
}

// Dispatch to the right model — SD3.5 Large falls back to SD3 Medium if 404
async function generateImage(prompt: string, index: number, width: number, height: number): Promise<Buffer> {
  const model = MODEL_FOR_INDEX(index)
  if (model === 'flux')       return generateImageWithFlux(prompt, width, height)
  if (model === 'sd3-medium') return generateImageWithSD3(prompt, width, height, 'sd3-medium')
  if (model === 'dalle3')     return generateImageWithDALLE3(prompt, width, height)
  // SD3.5 Large — fall back to SD3 Medium if endpoint not yet accessible
  try {
    return await generateImageWithSD3(prompt, width, height, 'sd3-large')
  } catch (e: any) {
    if (e.message?.includes('404')) {
      console.warn('[agent] SD3.5 Large 404 — falling back to SD3 Medium')
      return generateImageWithSD3(prompt, width, height, 'sd3-medium')
    }
    throw e
  }
}

async function uploadImage(buffer: Buffer, filename: string): Promise<string> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN

  // Production: Vercel Blob
  if (blobToken && blobToken !== 'your-vercel-blob-token-here') {
    const { put } = await import('@vercel/blob')
    const blob = await put(`agent-designs/${filename}`, buffer, {
      access: 'public',
      contentType: 'image/png',
      token: blobToken,
    })
    return blob.url
  }

  // Local dev fallback: public/agent-uploads/
  const uploadsDir = path.join(process.cwd(), 'public', 'agent-uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  fs.writeFileSync(path.join(uploadsDir, filename), buffer)
  return `/agent-uploads/${filename}`
}

// ── POST handler ───────────────────────────────────────────────────────────

// ── Shared context builder ──────────────────────────────────────────────────

interface ConceptItem {
  concept: string
  audience: string
  notes: string
  copy: { headline: string; body: string }
  prompt: string
}

async function buildContext(tags: string[], task_id: string | null | undefined) {
  let taskContext = ''
  if (task_id) {
    const [task, subtasks] = await Promise.all([getTask(task_id), getSubtasks(task_id)])
    if (task) {
      const subtaskLines = subtasks.length > 0
        ? '\n  Brief details:\n' + subtasks.map((s: { title: string }) => `    - ${s.title}`).join('\n')
        : ''
      taskContext = `
LINKED TASK:
  Project:     ${task.project_name}
  Title:       ${task.title}
  Description: ${task.description || '(none)'}
  Priority:    ${task.priority}${subtaskLines}`
    }
  }
  const contentType = tags.length > 0 ? tags.join(', ') : 'Marketing Design'
  const { width, height } = getDimensions(tags)
  return { taskContext, contentType, width, height }
}

function parseConcepts(raw: string): ConceptItem[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array')
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty array')
    const items: ConceptItem[] = parsed.map((item: any, i: number) => {
      const emptyCopy = { headline: '', body: '' }
      if (typeof item === 'string') return { concept: `Concept ${i + 1}`, audience: '', notes: '', copy: emptyCopy, prompt: item }
      return {
        concept:  item.concept  ?? `Concept ${i + 1}`,
        audience: item.audience ?? '',
        notes:    item.notes    ?? '',
        copy:     item.copy     ?? emptyCopy,
        prompt:   item.prompt   ?? '',
      }
    })
    return items.slice(0, 10)
  } catch {
    const lines = raw
      .split(/\n+/)
      .map(l => l.replace(/^\d+[\.\)]\s*"|"[,]?$|^"/g, '').trim())
      .filter(l => l.length > 20)
      .slice(0, 10)
    return lines.map((prompt, i) => ({ concept: `Concept ${i + 1}`, audience: '', notes: '', copy: { headline: '', body: '' }, prompt }))
  }
}

export async function POST(req: NextRequest) {
  const orgId = req.headers.get('x-org-id')
  const body  = await req.json()

  const { step, title, description, tags = [], task_id, workflow_id, concepts: incomingConcepts } = body as {
    step?: 'concepts' | 'render'
    title: string
    description?: string
    tags?: string[]
    task_id?: string | null
    workflow_id: string
    concepts?: ConceptItem[]   // only present in step=render
  }

  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const kimiKey = process.env.NVIDIA_NIM_API_KEY
  const fluxKey = process.env.NVIDIA_NIM_FLUX_KEY
  if (!kimiKey) return NextResponse.json({ error: 'NVIDIA_NIM_API_KEY not configured' }, { status: 500 })
  if (!fluxKey) return NextResponse.json({ error: 'NVIDIA_NIM_FLUX_KEY not configured' }, { status: 500 })

  try {
    const { taskContext, contentType, width, height } = await buildContext(tags, task_id)

    // ── STEP A: Kimi — generate 10 creative concepts + Flux prompts ────────
    if (step === 'concepts') {
      const { examples: likedExamples, totalLiked } = await getLikedAgentDesigns()
      const likedSection = likedExamples.length > 0
        ? `\nCREATIVE TEAM PREFERENCES — ${totalLiked} designs liked so far. Here are ${likedExamples.length} representative examples (distilled from the full set). Study the visual approach and emotional tone — don't copy, but understand what direction resonates:
${likedExamples.map((e, i) => {
  // Trim to first 2 sentences to keep context lean
  const brief = e.prompt.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ')
  return `${i + 1}. "${e.concept}"\n   ${brief}`
}).join('\n\n')}\n`
        : ''

      const kimiPrompt = `You are a senior advertising creative director. You have been handed a specific campaign brief for Sunhub. Your job is NOT to generate generic solar marketplace ads — it is to produce 10 highly focused concepts that are directly derived from the brief below, each with a copy and a visual that are built for each other.

CAMPAIGN BRIEF:
  Title:        ${title}
  Description:  ${description || '(none provided)'}
  Format:       ${contentType} (${width}×${height}px)
${taskContext}

${BRAND}
${likedSection}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — READ THE BRIEF. BEFORE YOU WRITE ANYTHING, ANSWER THESE IN YOUR HEAD:
  • What is the PRIMARY GOAL of this campaign? (e.g. drive sign-ups, move aging inventory, attract EPCs for bulk sourcing, grow seller listings, promote a specific product category, etc.)
  • What SPECIFIC PROBLEM does Sunhub solve in this context?
  • Who is the most relevant audience for THIS brief? (one persona, or multiple — let the brief decide)
  • What single emotion should someone feel when they see these ads? (urgency, relief, confidence, FOMO, pride, trust?)
  • What action should they take immediately after?

Use these answers to anchor every concept you produce. Every headline, body, and visual must serve THIS campaign goal — not a generic Sunhub brand message.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TARGET AUDIENCE — 4 PERSONAS (pick the right one per concept based on the brief):
  1. EPC CONTRACTORS (Engineering, Procurement & Construction)
     Age 32–55 — project managers, procurement leads at solar EPC firms
     Pain: sourcing large equipment volumes fast under project deadlines
     Mindset: risk-averse, time-poor, accountable for project margins
     Visual world: job sites, hard hats, blueprints, truckloads of equipment

  2. INDEPENDENT SOLAR INSTALLERS
     Age 28–50 — owner-operators of small-to-mid installation businesses
     Pain: can't match distributor pricing, struggle to source inventory fast
     Mindset: scrappy, entrepreneurial, proud of craft
     Visual world: rooftops, vans, tools, residential neighborhoods

  3. SOLAR MANUFACTURERS & BRANDS
     Age 35–55 — sales directors, channel managers at panel/inverter/battery manufacturers
     Pain: reaching qualified buyers at scale, excess inventory in warehouses
     Mindset: growth-focused, need volume, want a marketplace that converts
     Visual world: factories, warehouses, logistics, large commercial installs

  4. DISTRIBUTORS & INVENTORY LIQUIDATORS
     Age 35–60 — operations and sales leads managing aging solar inventory
     Pain: capital tied up in unsold stock, losing value every month
     Mindset: pragmatic, urgency-driven — need to move product and recover cash
     Visual world: warehouse aisles, pallets, loading docks, spreadsheets

PROFESSIONAL AUDIENCE RULES:
  - These people make decisions worth hundreds of thousands of dollars. Speak accordingly.
  - Peer-to-peer credibility beats consumer-brand flash. Gritty and real beats polished and generic.
  - The strongest ads make the viewer say "that's exactly my problem" within 2 seconds.
  - Emotional triggers that work: TIME (wasted vs. recovered), CONTROL (chaos vs. clarity), SCALE (struggling vs. winning), MONEY (tied up vs. flowing).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATIVE CHAIN — follow this exact sequence for every one of the 10 concepts:

1. CAMPAIGN ANGLE
   How does this concept serve the specific campaign goal? What dimension of the brief does it attack?
   (e.g. "targets EPCs who delay sourcing and get burned on timelines" — must be specific to THIS brief)

2. PERSONA
   Which of the 4 personas is this concept for, and why are they the right target for THIS campaign moment?

3. CORE MESSAGE
   One sentence. The single idea this ad must land. Not a tagline — a clear statement of what the viewer should understand after seeing it.
   (e.g. "Sunhub lets you source 10,000 panels in 48 hours without calling 20 distributors")

4. COPY
   Write the headline and body copy NOW — before thinking about the visual.
   - Headline: 5–8 words. Direct and specific to their pain or the campaign angle. Corporate tone — authoritative, not casual.
   - Body: 1–2 sentences. Formal, professional register. Reads like it came from a serious B2B brand — precise language, no slang, no exclamation marks, no hype.
   - Avoid: punchy consumer-brand energy, rhetorical questions, "stop doing X", informal contractions, or motivational-poster phrasing.
   - Aim for: the tone of a respected industry publication or a senior executive speaking directly to a peer.
   The copy must be a direct expression of the CORE MESSAGE above.

5. VISUAL LOGIC
   Given this exact copy — what single photographic scene would make this specific person stop scrolling?
   The visual should EMOTIONALLY AMPLIFY the copy, not illustrate it literally.
   Ask: "If you removed the headline, would a professional in this persona still feel the same thing?"
   Write ONE sentence describing the scene and WHY it serves the copy's emotional intent.
   (e.g. "A procurement manager staring at a blank spreadsheet at 11pm — the visual panic the copy resolves")

6. IMAGE PROMPT
   Translate the visual logic above into a detailed image generation prompt.
   - 4–6 precise sentences: subject, emotion/body language, environment, lighting, composition, color tone
   - No text, logos, split-screens, or generic solar imagery
   - Matte black monocrystalline panels ONLY if panels appear — never blue
   - End every prompt with exactly: "Hyperrealistic photography, shot on Phase One IQ4 150MP, cinematic color grading, photojournalistic realism, razor-sharp detail."

7. NOTES (goes in "notes" field)
   2–3 sentences explaining: why this copy + visual work together, why this persona responds to it, and how it serves the campaign goal.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VARIETY RULES — across the 10 concepts:
  - Spread across at least 3 of the 4 personas (let the brief guide which ones dominate)
  - Vary the emotional angle: urgency, relief, pride, frustration-solved, aspiration, scale, trust
  - Vary photographic approach: intimate portrait, environmental wide, aerial, dramatic close-up, worksite moment, overhead flat-lay, gritty documentary, clean commercial, moody chiaroscuro
  - Every concept must tie back to the campaign goal — none should feel like a different brief

Return ONLY a valid JSON array of exactly 10 objects. No markdown, no preamble, no explanation:
[
  {
    "concept": "Short evocative concept name (4–6 words)",
    "audience": "Persona name",
    "copy": {
      "headline": "5–8 word headline",
      "body": "1–2 sentence body copy"
    },
    "notes": "Why this copy + visual + persona combination serves this specific campaign",
    "prompt": "Full image generation prompt built from the visual logic above"
  }
]`

      const kimiResponse = await callKimi([{ role: 'user', content: kimiPrompt }])
      const concepts = parseConcepts(kimiResponse)
      if (concepts.length === 0) return NextResponse.json({ error: 'Kimi returned no concepts' }, { status: 500 })
      return NextResponse.json({ concepts, width, height })
    }

    // ── STEP B: Flux — render images, upload, save submission ──────────────
    if (!workflow_id) return NextResponse.json({ error: 'workflow_id is required' }, { status: 400 })

    const concepts: ConceptItem[] = incomingConcepts ?? []
    if (concepts.length === 0) return NextResponse.json({ error: 'No concepts provided for render step' }, { status: 400 })

    const prompts = concepts.map(c => c.prompt)

    // All 10 generated in parallel — each dispatched to its assigned model by index
    const imageBuffers: (Buffer | null)[] = await Promise.all(
      prompts.map(async (prompt, i) => {
        try { return await generateImage(prompt, i, width, height) }
        catch (e) { console.error(`[agent] image ${i} (${MODEL_FOR_INDEX(i)}) failed:`, e); return null }
      })
    )

    const uploadedUrls: string[] = []
    for (let i = 0; i < imageBuffers.length; i++) {
      const buf = imageBuffers[i]
      if (!buf) { uploadedUrls.push(''); continue }
      try {
        const url = await uploadImage(buf, `${randomUUID()}.png`)
        uploadedUrls.push(url)
      } catch (e) {
        console.error('[agent] Upload failed for image', i, e)
        uploadedUrls.push('')
      }
    }

    if (!uploadedUrls.some(u => u)) return NextResponse.json({ error: 'All image uploads failed' }, { status: 500 })

    await ensureAgentUser(orgId)

    const submission = await createSubmission(
      `[AI] ${title}`,
      description || '',
      workflow_id,
      task_id ?? null,
      AGENT_USER_ID,
      tags.length > 0 ? JSON.stringify(tags) : null,
    )

    let orderIndex = 0
    for (let i = 0; i < uploadedUrls.length; i++) {
      const url = uploadedUrls[i]
      if (!url) continue
      const modelName = MODEL_FOR_INDEX(i)
      await addDesign({
        submission_id:   submission.id,
        filename:        url,
        original_name:   `${VARIATION_LABELS[i] ?? i + 1}. ${concepts[i]?.concept ?? `Concept ${i + 1}`}`,
        variation_label: VARIATION_LABELS[i] ?? String(i + 1),
        order_index:     orderIndex++,
        version:         1,
        prompt:          concepts[i]?.prompt ?? null,
        liked:           false,
        model:           modelName,
        concept_notes:   concepts[i]
          ? `${concepts[i].audience ? `Audience: ${concepts[i].audience}. ` : ''}${concepts[i].notes ?? ''}`
          : null,
        copy: concepts[i]?.copy ? JSON.stringify(concepts[i].copy) : null,
      })
    }

    return NextResponse.json({ submissionId: submission.id, designCount: orderIndex })

  } catch (e: any) {
    console.error('[agent/designer]', e)
    return NextResponse.json({ error: e.message ?? 'Agent failed' }, { status: 500 })
  }
}
