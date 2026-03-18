/**
 * test-designer-agent.ts
 *
 * Gives Kimi K2.5 the EZEE landing page context + Awwwards-style inspiration
 * and asks it to produce 3 completely different HTML redesign variations.
 *
 * Run: npx tsx scripts/test-designer-agent.ts
 * Output: scripts/agent-designs/  (open the HTML files in a browser)
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Parse .env.local ──────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const KEY   = process.env.NVIDIA_NIM_API_KEY!
const BASE  = 'https://integrate.api.nvidia.com/v1'
const MODEL = 'moonshotai/kimi-k2-instruct'

// ── Landing page content snapshot ────────────────────────────────────────────

const LANDING_CONTENT = `
PRODUCT: EZEE — Design Review Platform for Creative Teams

BRAND:
- Logo: "EZEE" (wordmark)
- Primary accent: #D4512E (deep terracotta / burnt orange)
- Dark: #100F0D (near-black, used for nav + dark CTA section)
- Background: #F4F2EE (warm parchment)
- Surface: #FDFCFB (off-white cards)
- Text: #1C1917 (warm near-black)
- Secondary text: #6B6560
- Success: #0EA572 (emerald green)
- Heading font: Fraunces (optical-size serif, high contrast)
- Body font: DM Sans (clean, modern sans-serif)

HERO HEADLINE (current): "Design review, finally done right."
HERO SUBTEXT: "EZEE gives your design team a structured review workflow — submit, review, annotate, approve, and deliver. One place. Zero chaos."
PRIMARY CTA: "Start for free"
SECONDARY CTA: "See how it works"

HOW IT WORKS (3 steps):
1. "Designer submits." — Upload designs, pick a workflow, link a task. Done in under a minute.
2. "Team reviews — their way." — Reviewers get a magic link. No login. Annotate with pins, approve or request changes.
3. "Approved. Delivered automatically." — Final approval triggers Drive upload and notifies everyone.

KEY FEATURES:
- Real-time status: Live updates push the moment a reviewer acts. No refresh, no chasing.
- Background uploads: Files upload as you add them. Hit submit in seconds, not minutes.
- Annotation pins: Click on any pixel. Leave a pinned comment. Designers know exactly what to fix.
- Version tracking: Every revision stored. Compare V1 to V4 side by side with full context.
- Smart notifications: Reviewers emailed when it's their turn. Magic links — no login required.
- Role-based access: Admins configure workflows. Members submit. Reviewers get magic links.

SECTION HEADER: "Built for teams who ship."
SECTION SUBTEXT: "Everything you need, nothing you don't."

CTA SECTION (dark bg):
- Headline: "Stop losing designs in Slack threads."
- Subtext: "Get your whole team reviewing faster."

STATS: Designs reviewed, time saved, teams using it.

FOOTER: Simple. Logo + copyright.
`

// ── Awwwards design inspiration ───────────────────────────────────────────────

const AWWWARDS_INSPIRATION = `
AWWWARDS-STYLE DESIGN INSPIRATION (current top trends, 2024-2025):

TYPOGRAPHY TRENDS:
- Ultra-large display type (100-200px headlines) as a design element in itself
- Tight negative letter-spacing (-0.04em to -0.06em on headings)
- Mixed serif + grotesque — contrast between editorial serif and modern sans
- Text as texture: large background watermark text
- Stacked variable-weight type transitions
- Animated text reveal on scroll (character by character or line by line)
- Super condensed typefaces for headers

LAYOUT PATTERNS:
- Asymmetric grid breaks — content that deliberately bleeds outside the grid
- Bento grid / mosaic feature cards (unequal sized tiles)
- Full-bleed hero with content layered over a dark/image background
- Horizontal scroll sections as featured elements
- Pinned/sticky sections with scroll-triggered panel reveals
- Split hero: text left, oversized UI mockup right, overlapping the fold
- Magazine-style editorial layout with pull quotes

VISUAL STYLE:
- Glassmorphism: frosted glass cards with backdrop-blur + subtle border
- Grainy/noise texture overlays on gradients (adds depth)
- Gradient mesh backgrounds (multiple radial gradients blending)
- Dark mode as the default for "premium" feel
- Neon glow effects on key UI elements
- Monochrome color scheme with single vibrant accent
- Brutalist grid with thick borders and raw typography
- Soft clay / 3D inflated icon style

HERO SECTION PATTERNS:
- Floating UI element mockups that scroll/parallax independently
- Animated counter/statistics in the hero
- Company logo marquee ("trusted by") immediately under hero text
- Single massive keyword as the hero: just the word "REVIEW." in 200px type
- Two-tone split background: dark left half, light right half
- Video loop in background (desaturated, low opacity)

CTA DESIGN:
- Pill-shaped buttons with very round corners
- Arrow icons animate right on hover
- Gradient borders on buttons
- "No credit card required" micro-copy below primary CTA
- Two-option hero: "Try free" (filled) + "See demo →" (ghost)

FEATURE SECTION PATTERNS:
- Bento box: asymmetric grid of feature cards, some spanning 2 columns
- Each card has a mini animated UI preview
- Dark feature cards with colored icon + white text (inverted from page bg)
- Numbered steps with very large (80px+) numerals as background decoration

SCROLL ANIMATION STYLE:
- Elements fade+translate up as they enter viewport
- Staggered delays on sibling elements (0.1s apart)
- Text lines reveal with clip-path: inset(0 0 100% 0) → inset(0 0 0% 0)
- Scale from 0.94 to 1.0 on section entry
- Progress bar at top of page showing scroll depth
`

// ── The 3 design directions ───────────────────────────────────────────────────

const DIRECTIONS = [
  {
    name: 'dark-editorial',
    label: 'Dark Editorial',
    brief: `
DIRECTION: Dark editorial — Think Linear.app meets Stripe.
Dark near-black background (#0D0C0A) as the global base.
Hero: Massive Fraunces serif headline spanning full width,
single terracotta accent word. UI mockup floats right with
subtle glow. Bento grid for features. Glassmorphism cards.
Noise texture throughout. Minimal color — almost monochrome
with terracotta as the only accent. Very typographically driven.
Feel: Premium, focused, confident. Like a tool used by serious teams.
`,
  },
  {
    name: 'warm-gradient-mesh',
    label: 'Warm Gradient Mesh',
    brief: `
DIRECTION: Warm gradient mesh — Think Notion meets Framer.
Light background (#FDFAF7) with soft multi-color radial gradient mesh
behind hero (terracotta, amber, warm cream blending).
Hero: Centered layout. Ultra-tight headline. Floating pill badges
animated around the headline ("✓ Approved", "📌 2 pins", "Step 2 of 3").
Feature section: Bento grid with warm-toned cards.
Asymmetric layout breaks. Very playful but still professional.
Feel: Friendly, innovative, modern — for forward-thinking creative teams.
`,
  },
  {
    name: 'brutalist-clean',
    label: 'Brutalist Clean',
    brief: `
DIRECTION: Brutalist clean — Think Are.na meets Vercel.
Pure white (#FFFFFF) background. Heavy black borders (2-4px)
on all elements. Bold condensed sans-serif system font stack
for ALL headings (Helvetica Neue Condensed, Impact fallback).
Giant step numbers (300px+, very light gray) as background
decoration. Monospace code-style labels above sections.
Terracotta used sparingly — only for the primary CTA button
and one accent element. No gradients. Grid is strict and rigid.
Feel: Raw, direct, no-nonsense. "This tool means business."
`,
  },
]

// ── Kimi call ─────────────────────────────────────────────────────────────────

async function generateDesign(direction: typeof DIRECTIONS[0], index: number): Promise<string> {
  const prompt = `You are a world-class frontend designer and developer.
Your task is to redesign the EZEE landing page in a specific style.

━━━ PRODUCT CONTEXT ━━━
${LANDING_CONTENT}

━━━ DESIGN INSPIRATION ━━━
${AWWWARDS_INSPIRATION}

━━━ YOUR SPECIFIC DIRECTION: ${direction.label.toUpperCase()} ━━━
${direction.brief}

━━━ OUTPUT REQUIREMENTS ━━━
Generate a COMPLETE, self-contained HTML file for this landing page redesign.

Rules:
1. Output ONLY valid HTML — start with <!DOCTYPE html>, end with </html>. Zero markdown, zero explanation.
2. All CSS must be in a <style> tag in <head> — no external stylesheets needed except Google Fonts (you may use a <link> tag)
3. Include ALL sections: nav, hero, how-it-works (3 steps), features (bento or grid), stats, CTA section, footer
4. Use the exact copy from the product context — do not invent new text
5. The design must strongly reflect the "${direction.label}" direction described above
6. Include scroll-triggered fade animations using IntersectionObserver + CSS classes
7. The layout must be fully responsive (use CSS Grid / Flexbox with clamp() for fluid type)
8. Make the hero section fill 100vh minimum
9. Include hover states on all interactive elements
10. This is variation ${index + 1} of 3 — it must look completely different from the other variations

Generate the full HTML now:`

  console.log(`  [${index + 1}/3] Calling Kimi for "${direction.label}" direction...`)
  const t = Date.now()

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 8192,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content?.trim() ?? ''
  const elapsed = ((Date.now() - t) / 1000).toFixed(1)

  // Extract HTML (strip any markdown fences)
  let html = content
  const fenceMatch = content.match(/```(?:html)?\s*([\s\S]*?)```/i)
  if (fenceMatch) html = fenceMatch[1].trim()

  // Ensure it starts with <!DOCTYPE
  if (!html.toLowerCase().startsWith('<!doctype')) {
    const doctypeIdx = html.toLowerCase().indexOf('<!doctype')
    if (doctypeIdx > -1) html = html.slice(doctypeIdx)
  }

  const tokens = data.usage?.completion_tokens ?? '?'
  console.log(`  ✅ "${direction.label}" done in ${elapsed}s (${tokens} tokens, ${html.length} chars)`)

  return html
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║   EZEE Designer Agent — Landing Page Redesign Test       ║')
  console.log('║   3 Awwwards-inspired variations via Kimi K2.5           ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')

  if (!KEY || KEY === 'your-nvidia-nim-api-key-here') {
    console.error('❌  NVIDIA_NIM_API_KEY not set in .env.local')
    process.exit(1)
  }

  const outDir = path.join(process.cwd(), 'scripts', 'agent-designs')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  console.log('Generating 3 redesign variations in parallel...\n')
  const start = Date.now()

  // Run all 3 in parallel
  const results = await Promise.allSettled(
    DIRECTIONS.map((dir, i) => generateDesign(dir, i))
  )

  console.log('\nSaving files...')

  const successFiles: string[] = []

  results.forEach((result, i) => {
    const dir = DIRECTIONS[i]
    if (result.status === 'fulfilled') {
      const filePath = path.join(outDir, `${dir.name}.html`)
      fs.writeFileSync(filePath, result.value, 'utf-8')
      console.log(`  ✅ Saved: scripts/agent-designs/${dir.name}.html`)
      successFiles.push(dir.name)
    } else {
      console.error(`  ❌ "${dir.label}" failed: ${result.reason?.message}`)
    }
  })

  const totalTime = ((Date.now() - start) / 1000).toFixed(1)

  console.log(`\n══════════════════════════════════════════════════════════`)
  console.log(`Done in ${totalTime}s. ${successFiles.length}/3 variations generated.`)
  if (successFiles.length > 0) {
    console.log('\nOpen in your browser:')
    successFiles.forEach(name => {
      console.log(`  scripts/agent-designs/${name}.html`)
    })
  }
  console.log('══════════════════════════════════════════════════════════\n')
}

main().catch(e => { console.error(e); process.exit(1) })
