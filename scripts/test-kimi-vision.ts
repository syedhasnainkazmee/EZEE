/**
 * test-kimi-vision.ts
 * Tests moonshotai/kimi-k2.5 (the multimodal model) with image input.
 * Run: npx tsx scripts/test-kimi-vision.ts
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

const KEY   = process.env.NVIDIA_NIM_API_KEY!
const BASE  = 'https://integrate.api.nvidia.com/v1'
const MODEL = 'moonshotai/kimi-k2.5'   // ← the multimodal model

async function testTextOnly() {
  console.log('\n─── Test 1: Text-only (model connectivity) ───')
  const t = Date.now()
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: 'Reply with exactly: KIMI_K2_5_ONLINE' }],
      temperature: 0,
      max_tokens: 20,
    }),
  })
  if (!res.ok) { console.error('❌', res.status, await res.text()); return false }
  const data = await res.json()
  console.log(`✅ Connected in ${Date.now()-t}ms. Reply: "${data.choices?.[0]?.message?.content?.trim()}"`)
  console.log(`   Model reported: ${data.model}`)
  return true
}

async function testWithImage(imagePath: string, question: string) {
  console.log(`\n─── Test 2: Image input — ${path.basename(imagePath)} ───`)

  if (!fs.existsSync(imagePath)) {
    console.log(`⚠  Image not found at ${imagePath}`)
    console.log('   Using a public URL instead...')
    return testWithImageUrl(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
      question
    )
  }

  const ext    = path.extname(imagePath).slice(1).toLowerCase()
  const mime   = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
  const b64    = fs.readFileSync(imagePath).toString('base64')
  const dataUrl = `data:${mime};base64,${b64}`

  return callWithImageUrl(dataUrl, question)
}

async function testWithImageUrl(imageUrl: string, question: string) {
  return callWithImageUrl(imageUrl, question)
}

async function callWithImageUrl(imageUrl: string, question: string) {
  console.log('Sending image to Kimi K2.5...')
  const t = Date.now()

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: question },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    console.error(`❌ ${res.status}:`, await res.text())
    return false
  }

  const data = await res.json()
  const reply = data.choices?.[0]?.message?.content?.trim()
  const elapsed = ((Date.now() - t) / 1000).toFixed(1)
  console.log(`✅ Got response in ${elapsed}s:\n`)
  console.log(reply)
  return true
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║  Kimi K2.5 Vision Test (moonshotai/kimi-k2.5) ║')
  console.log('╚══════════════════════════════════════════════╝')

  if (!KEY || KEY === 'your-nvidia-nim-api-key-here') {
    console.error('❌ NVIDIA_NIM_API_KEY not set'); process.exit(1)
  }

  const ok = await testTextOnly()
  if (!ok) { console.error('\n⚠ Text test failed — check key'); process.exit(1) }

  // Use our Flux-generated test image if it exists, else a local file
  const testImage = path.join(process.cwd(), 'scripts', 'agent-designs', 'flux-test.png')
  await testWithImage(
    testImage,
    `You are a creative director. Analyse this design image and answer:
1. What visual style, mood, and color palette does it use?
2. What content type (e.g. social post, banner, logo) would this suit?
3. List 3 specific things that work well in this design.
4. Suggest 2 variations with different creative directions.
Be concise and specific.`
  )
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
