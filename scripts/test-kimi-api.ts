/**
 * test-kimi-api.ts
 *
 * Runs three quick checks before you build the full agent:
 *   1. NVIDIA_NIM_API_KEY is set and the Kimi K2.5 model responds
 *   2. Kimi can generate a valid SVG design from a brief
 *   3. BLOB_READ_WRITE_TOKEN is set and a file can be uploaded to Vercel Blob
 *
 * Run with:
 *   npx tsx scripts/test-kimi-api.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const NVIDIA_API_KEY = process.env.NVIDIA_NIM_API_KEY
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
const API_BASE = 'https://integrate.api.nvidia.com/v1'
const MODEL = 'moonshotai/kimi-k2-instruct'

function pass(msg: string) { console.log(`  ✅ ${msg}`) }
function fail(msg: string) { console.error(`  ❌ ${msg}`) }
function info(msg: string) { console.log(`  ℹ  ${msg}`) }

// ─── Test 1: Basic API connectivity ─────────────────────────────────────────

async function testAPIConnectivity() {
  console.log('\n─── Test 1: Kimi K2.5 API connectivity ───')

  if (!NVIDIA_API_KEY || NVIDIA_API_KEY === 'your-nvidia-nim-api-key-here') {
    fail('NVIDIA_NIM_API_KEY is not set in .env.local')
    info('Get your key at https://build.nvidia.com → any model → "Get API Key"')
    return false
  }

  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'Reply with exactly: KIMI_OK' }],
        temperature: 0,
        max_tokens: 20,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      fail(`API returned ${res.status}: ${body.slice(0, 200)}`)
      return false
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content?.trim() ?? ''
    pass(`Connected! Model replied: "${reply}"`)
    info(`Model: ${data.model ?? MODEL}`)
    return true
  } catch (e: any) {
    fail(`Network error: ${e.message}`)
    return false
  }
}

// ─── Test 2: SVG design generation ──────────────────────────────────────────

async function testSVGGeneration() {
  console.log('\n─── Test 2: SVG design generation ───')

  const prompt = `You are an expert graphic designer. Generate a single complete, valid SVG design.

Task: "Summer Campaign — Social Media Post"
Content Type: Instagram Post
Canvas: 1080x1080px
Design Direction: Bold and energetic with large typography
Brand: Use #D4512E (terracotta) as the accent color, #100F0D as dark, #F4F2EE as background

Requirements:
- Return ONLY the SVG code, nothing else
- Start with <svg and end with </svg>
- Use viewBox="0 0 1080 1080" width="1080" height="1080"
- Include text, shapes, and visual elements
- Make it look like a real Instagram post design

Generate the SVG:`

  try {
    console.log('  Calling Kimi K2.5 to generate a sample design SVG...')
    const start = Date.now()

    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 4096,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      fail(`API returned ${res.status}: ${body.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim() ?? ''
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    // Extract SVG
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i)
    if (!svgMatch) {
      fail('Response did not contain a valid <svg>...</svg> block')
      info(`Raw response (first 500 chars):\n${content.slice(0, 500)}`)
      return null
    }

    const svgContent = svgMatch[0]
    pass(`SVG generated in ${elapsed}s (${svgContent.length} chars)`)

    // Save locally for inspection
    const outPath = path.join(process.cwd(), 'scripts', 'test-output.svg')
    fs.writeFileSync(outPath, svgContent, 'utf-8')
    pass(`Saved to scripts/test-output.svg — open in a browser to inspect`)

    return svgContent
  } catch (e: any) {
    fail(`Error: ${e.message}`)
    return null
  }
}

// ─── Test 3: Vercel Blob upload ──────────────────────────────────────────────

async function testBlobUpload(svgContent: string) {
  console.log('\n─── Test 3: Vercel Blob upload ───')

  if (!BLOB_TOKEN || BLOB_TOKEN === 'your-vercel-blob-token-here') {
    fail('BLOB_READ_WRITE_TOKEN is not set in .env.local')
    info('Get it from: Vercel dashboard → Storage → your Blob store → .env.local tab')
    info('If you have not created a Blob store yet: vercel.com/dashboard → Storage → Create → Blob')
    return false
  }

  try {
    // Dynamically import @vercel/blob (needs the token in env)
    const { put } = await import('@vercel/blob')

    const buffer = Buffer.from(svgContent, 'utf-8')
    const blob = await put(`agent-test/test-design-${Date.now()}.svg`, buffer, {
      access: 'public',
      contentType: 'image/svg+xml',
      token: BLOB_TOKEN,
    })

    pass(`Uploaded! Public URL: ${blob.url}`)
    return true
  } catch (e: any) {
    fail(`Blob upload failed: ${e.message}`)
    return false
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   EZEE Designer Agent — API Test Suite   ║')
  console.log('╚══════════════════════════════════════════╝')

  const apiOk = await testAPIConnectivity()
  if (!apiOk) {
    console.log('\n⚠  Fix NVIDIA_NIM_API_KEY first, then re-run.')
    process.exit(1)
  }

  const svgContent = await testSVGGeneration()
  if (!svgContent) {
    console.log('\n⚠  SVG generation failed. Check the prompt or API limits.')
    process.exit(1)
  }

  await testBlobUpload(svgContent)

  console.log('\n══════════════════════════════════════════')
  console.log('All checks done. If all ✅, you are ready to use the Designer Agent.')
  console.log('══════════════════════════════════════════\n')
}

main().catch(e => { console.error(e); process.exit(1) })
