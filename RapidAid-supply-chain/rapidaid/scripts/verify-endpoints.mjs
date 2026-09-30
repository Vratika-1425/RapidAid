// Usage: node scripts/verify-endpoints.mjs [baseUrl]   (default http://localhost:8080)
// Confirms the frontend bundle and every API route the UI depends on respond correctly.
const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
let fail = 0
const check = async (name, path, opts, test) => {
  try {
    const r = await fetch(base + path, opts)
    const isJson = (r.headers.get('content-type') || '').includes('json')
    const body = isJson ? await r.json() : await r.text()
    const ok = r.ok && (!test || test(body))
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} ${r.status}`)
    if (!ok) fail++
  } catch (e) { console.log(`FAIL  ${name.padEnd(34)} ${e.message}`); fail++ }
}
const post = (b) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
await check('frontend index.html', '/', undefined, (b) => typeof b === 'string' && b.includes('id="root"'))
await check('GET /api/health', '/api/health', undefined, (b) => b.status === 'ok')
await check('GET /api/meta', '/api/meta', undefined, (b) => b.states.length > 0)
await check('GET /api/summary', '/api/summary', undefined, (b) => b.phcs > 0)
await check('GET /api/states', '/api/states', undefined, (b) => b.length > 0)
await check('GET /api/map', '/api/map', undefined, (b) => b.length > 0)
await check('GET /api/phcs', '/api/phcs?limit=5', undefined, (b) => b.items.length === 5)
await check('GET /api/alerts', '/api/alerts', undefined, (b) => Array.isArray(b.items))
await check('GET /api/forecast', '/api/forecast?med=ors', undefined, (b) => b.series.length > 20)
await check('GET /api/redistribution', '/api/redistribution', undefined, (b) => Array.isArray(b.transfers))
await check('GET /api/federated', '/api/federated?rounds=5', undefined, (b) => b.history.length === 6)
await check('GET /api/events', '/api/events', undefined, (b) => Array.isArray(b))
await check('POST /api/ai/brief', '/api/ai/brief', post({}), (b) => !!b.text)
await check('POST /api/ai/assistant', '/api/ai/assistant', post({ message: 'beds free?', lang: 'en' }), (b) => !!b.text)
await check('POST /api/ai/triage', '/api/ai/triage', post({ symptoms: 'chest pain' }), (b) => !!b.priority)
const phc = await (await fetch(base + '/api/phcs?limit=1')).json().catch(() => null)
if (phc) await check('POST /api/emergency/refer', '/api/emergency/refer', post({ phcId: phc.items[0].id, services: ['ICU'], priority: 1 }), (b) => b.options.length > 0)
await check('SPA fallback route', '/some/deep/link', undefined, (b) => typeof b === 'string' && b.includes('id="root"'))
const h = await (await fetch(base + '/api/health')).json().catch(() => ({}))
console.log(`\nGemini: ${h.gemini ? 'LIVE (' + h.model + ')' : 'not configured, offline fallbacks active'}`)
console.log(fail ? `\n${fail} check(s) failed` : '\nAll endpoints healthy')
process.exit(fail ? 1 : 0)
