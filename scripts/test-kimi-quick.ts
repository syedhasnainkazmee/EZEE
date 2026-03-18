/**
 * Quick connectivity test for Kimi K2.5 on Nvidia NIM
 * Run: npx tsx scripts/test-kimi-quick.ts
 */
import * as path from 'path'
import * as fs from 'fs'

// Parse .env.local manually (no dotenv dep needed)
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const KEY = process.env.NVIDIA_NIM_API_KEY
const BASE = 'https://integrate.api.nvidia.com/v1'
const MODEL = 'moonshotai/kimi-k2-instruct'

async function main() {
  if (!KEY || KEY === 'your-nvidia-nim-api-key-here') {
    console.error('❌  NVIDIA_NIM_API_KEY not set in .env.local')
    process.exit(1)
  }

  console.log('Testing Kimi K2.5 via Nvidia NIM...')
  const t = Date.now()
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: 'Reply with only: KIMI_ONLINE' }],
      temperature: 0,
      max_tokens: 20,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`❌  API error ${res.status}:`, body.slice(0, 300))
    process.exit(1)
  }

  const data = await res.json()
  const reply = data.choices?.[0]?.message?.content?.trim()
  console.log(`✅  Connected in ${Date.now() - t}ms. Model replied: "${reply}"`)
  console.log(`    Model ID reported: ${data.model}`)
}

main().catch(e => { console.error(e); process.exit(1) })
