/**
 * test-flux.ts — Find the correct Flux model ID and test image generation
 * Run: npx tsx scripts/test-flux.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const FLUX_KEY = process.env.NVIDIA_NIM_FLUX_KEY!
const BASE = 'https://integrate.api.nvidia.com/v1'

// Candidate model IDs to try
const CANDIDATES = [
  'black-forest-labs/flux.1-schnell',
  'black-forest-labs/flux-1-schnell',
  'black-forest-labs/flux2-klein',
  'black-forest-labs/flux-2-klein',
  'black-forest-labs/flux.1-dev',
]

async function tryModel(modelId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FLUX_KEY}`,
      },
      body: JSON.stringify({
        model: modelId,
        prompt: 'A clean minimal logo mark, terracotta orange circle on white background',
        width: 512,
        height: 512,
        num_inference_steps: 4,
        guidance_scale: 0,
        n: 1,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      // 404 = model not found, 422 = model exists but bad params
      return { ok: false, error: `${res.status}: ${body.slice(0, 150)}` }
    }

    const data = await res.json()
    const b64 = data?.data?.[0]?.b64_json
    const url = data?.data?.[0]?.url
    if (b64 || url) return { ok: true, url: url ?? 'base64 returned' }
    return { ok: false, error: `Unexpected response: ${JSON.stringify(data).slice(0, 200)}` }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

async function main() {
  console.log('\n─── Finding Flux model on Nvidia NIM ───\n')

  for (const model of CANDIDATES) {
    process.stdout.write(`  Trying ${model}... `)
    const t = Date.now()
    const result = await tryModel(model)
    const elapsed = `${((Date.now() - t) / 1000).toFixed(1)}s`

    if (result.ok) {
      console.log(`✅  WORKS! (${elapsed})`)
      console.log(`\n  ✔  Correct model ID: "${model}"`)

      // If base64 returned, save a test image
      const res = await fetch(`${BASE}/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FLUX_KEY}` },
        body: JSON.stringify({
          model,
          prompt: 'Minimalist marketing design for a design review SaaS, terracotta orange and dark, geometric shapes, clean, modern',
          width: 1024,
          height: 1024,
          num_inference_steps: 20,
          guidance_scale: 3.5,
          n: 1,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const b64 = data?.data?.[0]?.b64_json
        if (b64) {
          const outDir = path.join(process.cwd(), 'scripts', 'agent-designs')
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
          fs.writeFileSync(path.join(outDir, 'flux-test.png'), Buffer.from(b64, 'base64'))
          console.log(`  💾  Test image saved: scripts/agent-designs/flux-test.png`)
        }
      }
      process.exit(0)
    } else {
      console.log(`❌  ${result.error}`)
    }
  }

  console.log('\n⚠  None of the candidate IDs worked.')
  console.log('   Try listing available models:')

  // Try listing models
  const listRes = await fetch(`${BASE}/models`, {
    headers: { 'Authorization': `Bearer ${FLUX_KEY}` },
  })
  if (listRes.ok) {
    const data = await listRes.json()
    const ids: string[] = (data.data ?? []).map((m: any) => m.id)
    const fluxModels = ids.filter(id => id.toLowerCase().includes('flux') || id.toLowerCase().includes('black-forest'))
    console.log(`\n  Available Flux/image models:\n  ${fluxModels.join('\n  ') || '(none found, check key permissions)'}`)
    console.log(`\n  All available models:\n  ${ids.slice(0, 20).join('\n  ')}`)
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
