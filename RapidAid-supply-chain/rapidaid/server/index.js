import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from './engine.js';
import { runFederated } from './federated.js';
import { gemini, geminiEnabled, geminiModel } from './gemini.js';
import { haversine } from './data.js';

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(req)); } catch (e) { res.status(400).json({ error: e.message }); }
};

setInterval(() => E.tick(), 3000).unref();

// ---------- core ----------
app.get('/api/health', (_req, res) => {
  const w = E.world();
  res.json({ status: 'ok', time: new Date().toISOString(), phcs: w.net.phcs.length, gemini: geminiEnabled(), model: geminiEnabled() ? geminiModel() : null, uptimeSec: Math.round(process.uptime()) });
});
app.get('/api/meta', wrap(() => ({ states: E.world().net.states.map((s) => s.name), districts: E.world().net.districts.map((d) => ({ id: d.id, name: d.name, state: d.state })), medicines: E.MEDICINES.map(({ id, name, unit, category, crit }) => ({ id, name, unit, category, crit })), scenarios: Object.entries(E.SCENARIOS).map(([id, s]) => ({ id, label: s.label })) })));
app.get('/api/summary', wrap((r) => E.summary(r.query.state || undefined)));
app.get('/api/states', wrap(() => E.stateRollup()));
app.get('/api/map', wrap(() => E.mapPoints()));
app.get('/api/phcs', wrap((r) => E.phcList({ state: r.query.state, districtId: r.query.district, status: r.query.status, q: r.query.q, limit: Math.min(200, +r.query.limit || 40) })));
app.get('/api/phcs/:id', wrap((r) => { const p = E.world().net.phcs.find((x) => x.id === r.params.id); if (!p) throw new Error('not found'); return E.shapePhc(p); }));
app.get('/api/events', wrap(() => E.world().events.slice(0, 25)));
app.get('/api/alerts', wrap((r) => { let a = E.alerts(); if (r.query.state) a = a.filter((x) => x.state === r.query.state); if (r.query.severity) a = a.filter((x) => x.severity === r.query.severity); return { total: a.length, items: a.slice(0, Math.min(200, +r.query.limit || 30)) }; }));
app.get('/api/forecast', wrap((r) => E.forecastFor({ medId: r.query.med || 'para', state: r.query.state || undefined, districtId: r.query.district || undefined })));
app.get('/api/redistribution', wrap(() => E.redistribution()));
app.post('/api/redistribution/execute', wrap((r) => E.executeTransfer(r.body)));
app.post('/api/scenario', wrap((r) => { if (r.body.clear) E.clearScenarios(); else E.startScenario(r.body.type, r.body.state); return E.summary(); }));
app.post('/api/reset', wrap(() => { E.resetWorld(); return { ok: true }; }));
app.get('/api/federated', wrap((r) => runFederated({ rounds: +r.query.rounds || 10, localEpochs: +r.query.epochs || 5, dpNoise: +r.query.dp || 0 })));

// ---------- Google AI ----------
const LANGS = { en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', bn: 'Bengali', mr: 'Marathi' };

function contextDigest(state) {
  const s = E.summary(state);
  const al = E.alerts().filter((a) => !state || a.state === state).slice(0, 8);
  const red = E.redistribution().transfers.filter((t) => !state || t.to.state === state || t.from.state === state).slice(0, 5);
  return { s, al, red };
}

app.post('/api/ai/brief', wrap(async (r) => {
  const state = r.body.state || undefined, lang = LANGS[r.body.lang] ? r.body.lang : 'en';
  const { s, al, red } = contextDigest(state);
  const data = { scope: state || 'India', network: s, topAlerts: al.map((a) => ({ medicine: a.medicine, district: a.district, state: a.state, coverDays: +a.coverDays.toFixed(1), severity: a.severity, shortfall21d: a.shortfall21 })), proposedTransfers: red.map((t) => ({ medicine: t.medicine, qty: t.qty, from: t.from.district, to: t.to.district, km: t.km, transitDays: t.transitDays })) };
  const text = await gemini({
    system: 'You are the national health supply-chain analyst for India\'s PHC network. Write a crisp situation brief for a state health secretary. Use ONLY the JSON data given. No invented numbers. Format: one-sentence headline, then 3 short bullet actions starting with "•". Max 110 words.',
    prompt: `Respond in ${LANGS[lang]}.\nDATA:\n${JSON.stringify(data)}`,
  });
  if (text) return { source: 'gemini', model: geminiModel(), text };
  const top = al[0];
  const lines = [top ? `${data.scope}: ${s.criticalAlerts} critical stock-out alerts; most urgent is ${top.medicine} in ${top.district} (${top.coverDays.toFixed(1)} days of cover).` : `${data.scope}: no active stock-out alerts.`];
  for (const t of red.slice(0, 3)) lines.push(`• Move ${t.qty.toLocaleString('en-IN')} ${t.unit} of ${t.medicine} from ${t.from.district} to ${t.to.district} (${t.km} km, ~${t.transitDays} days).`);
  if (!red.length) lines.push('• No redistribution needed; continue monitoring.');
  return { source: 'fallback', text: lines.join('\n') };
}));

app.post('/api/ai/assistant', wrap(async (r) => {
  const q = String(r.body.message || '').slice(0, 600);
  const lang = LANGS[r.body.lang] ? r.body.lang : 'en';
  const state = r.body.state || undefined;
  if (!q.trim()) throw new Error('empty message');
  const { s, al, red } = contextDigest(state);
  const stateRoll = E.stateRollup().map((x) => ({ state: x.name, critical: x.critical, alerts: x.alerts, bedOcc: +x.bedOccupancy.toFixed(2), attendance: +x.attendance.toFixed(2) }));
  const ctx = { network: s, states: stateRoll, topAlerts: al.map((a) => ({ medicine: a.medicine, district: a.district, state: a.state, coverDays: +a.coverDays.toFixed(1), stock: a.stock, unit: a.unit })), transfers: red.map((t) => ({ medicine: t.medicine, qty: t.qty, from: `${t.from.district}, ${t.from.state}`, to: `${t.to.district}, ${t.to.state}`, transitDays: t.transitDays })) };
  const text = await gemini({
    system: `You are RapidAid Assistant for Indian health officials and PHC staff. Answer questions about medicine stock, beds, staff attendance, forecasts and redistribution using ONLY the live data provided. If the data doesn't contain the answer, say so. Be concise (max 90 words), plain language. Reply in ${LANGS[lang]}. You provide operational supply-chain help, not medical diagnosis.`,
    prompt: `LIVE DATA:\n${JSON.stringify(ctx)}\n\nQUESTION: ${q}`,
  });
  if (text) return { source: 'gemini', model: geminiModel(), text };
  const ql = q.toLowerCase();
  let out;
  const match = al.find((a) => ql.includes(a.medicine.split(' ')[0].toLowerCase()) || ql.includes(a.district.toLowerCase()));
  if (/bed/.test(ql)) out = `Network bed occupancy is ${(s.bedOccupancy * 100).toFixed(0)}% with ${s.bedsFree.toLocaleString('en-IN')} beds free.`;
  else if (/staff|attend|doctor/.test(ql)) out = `Staff attendance is ${(s.attendance * 100).toFixed(0)}% (${s.staffPresent.toLocaleString('en-IN')} of ${s.staffSanctioned.toLocaleString('en-IN')} sanctioned posts present).`;
  else if (/move|transfer|redistribut|send/.test(ql) && red[0]) out = `Top recommendation: move ${red[0].qty.toLocaleString('en-IN')} ${red[0].unit} of ${red[0].medicine} from ${red[0].from.district} to ${red[0].to.district} (${red[0].km} km, ~${red[0].transitDays} days).`;
  else if (match) out = `${match.medicine} in ${match.district}, ${match.state}: ${match.stock.toLocaleString('en-IN')} ${match.unit} left, about ${match.coverDays.toFixed(1)} days of cover.`;
  else out = al[0] ? `There are ${s.activeAlerts} active alerts. Most urgent: ${al[0].medicine} in ${al[0].district} (${al[0].coverDays.toFixed(1)} days).` : 'No active stock-out alerts right now.';
  return { source: 'fallback', text: out + (lang !== 'en' ? ' (Live translation needs a Gemini API key.)' : '') };
}));

const TRIAGE_FALLBACK = (t) => {
  const s = t.toLowerCase();
  const rules = [
    [/chest|heart|cardiac|पेट दर्द छाती/, { p: 1, care: 'Cardiac emergency', needs: ['ICU', 'Cath Lab'], why: 'Chest pain can indicate an acute coronary event.', aid: ['Keep patient seated and calm', 'Loosen tight clothing', 'Give aspirin only if a doctor advises'] }],
    [/snake|bite.*snake/, { p: 1, care: 'Envenomation', needs: ['ICU', 'Trauma'], why: 'Snakebite needs anti-venom and monitoring.', aid: ['Immobilise the limb', 'Do not cut or suck the wound', 'Move to a facility with ASV immediately'] }],
    [/labou?r|pregnan|bleeding|delivery/, { p: 1, care: 'Obstetric emergency', needs: ['Obstetrics', 'ICU'], why: 'Obstructed labour or haemorrhage is life-threatening.', aid: ['Lie on left side', 'Keep warm', 'Call ambulance now'] }],
    [/accident|crash|fracture|trauma|head injury/, { p: 1, care: 'Trauma', needs: ['Trauma', 'ICU'], why: 'Possible major injury.', aid: ['Do not move the neck', 'Apply pressure to bleeding', 'Keep patient warm'] }],
    [/seizure|convuls|unconscious|stroke/, { p: 1, care: 'Neurological emergency', needs: ['Neurology', 'ICU'], why: 'Altered consciousness or seizure needs urgent assessment.', aid: ['Place on side', 'Nothing by mouth', 'Note time of onset'] }],
    [/dehydrat|diarrh|vomit/, { p: 2, care: 'Dehydration', needs: ['Paediatrics'], why: 'Rapid fluid loss, especially in children.', aid: ['Start ORS sips', 'Continue breastfeeding', 'Refer if lethargic'] }],
    [/fever|dengue|malaria/, { p: 2, care: 'Febrile illness', needs: [], why: 'Fever needs evaluation for vector-borne disease.', aid: ['Fluids and rest', 'Paracetamol as advised', 'Test for malaria/dengue'] }],
    [/dog|rabies/, { p: 2, care: 'Animal bite', needs: [], why: 'Rabies post-exposure prophylaxis is time-critical.', aid: ['Wash wound 15 min with soap', 'Get ARV and RIG'] }],
  ];
  const hit = rules.find(([re]) => re.test(s));
  const h = hit ? hit[1] : { p: 3, care: 'General assessment', needs: [], why: 'No red-flag keywords found.', aid: ['Monitor vitals', 'Refer if symptoms worsen'] };
  return { priority: h.p, careLevel: h.care, requiredServices: h.needs, rationale: h.why, firstAid: h.aid };
};

app.post('/api/ai/triage', wrap(async (r) => {
  const { symptoms = '', age, spo2, hr, lang = 'en' } = r.body;
  if (!String(symptoms).trim()) throw new Error('describe the symptoms');
  const l = LANGS[lang] ? lang : 'en';
  const out = await gemini({
    json: true, temperature: 0.2,
    system: 'You are an emergency triage decision-support tool for Indian PHC staff. You do NOT diagnose; a doctor confirms. Return JSON only: {"priority":1|2|3 (1=immediate),"careLevel":string,"requiredServices":string[] chosen from ["ICU","Cath Lab","Trauma","Neurology","Obstetrics","Paediatrics","Burns"],"rationale":string (max 25 words),"firstAid":string[] (max 3 short steps)}. Write string values in ' + LANGS[l] + '. Keep requiredServices values in English exactly as listed.',
    prompt: `Symptoms: ${String(symptoms).slice(0, 500)}\nAge: ${age ?? 'unknown'}\nSpO2: ${spo2 ?? 'unknown'}\nHeart rate: ${hr ?? 'unknown'}`,
  });
  if (out && out.priority) return { source: 'gemini', model: geminiModel(), ...out };
  return { source: 'fallback', ...TRIAGE_FALLBACK(symptoms) };
}));

// Multimodal: photo of a handwritten/printed stock register → structured stock lines (Gemini Vision).
app.post('/api/ai/scan', wrap(async (r) => {
  const { imageBase64, mimeType = 'image/jpeg', phcId, apply } = r.body;
  const list = E.MEDICINES.map((m) => `${m.id} = ${m.name}`).join('; ');
  let items = null, source = 'fallback';
  if (imageBase64) {
    const out = await gemini({
      json: true, temperature: 0,
      system: 'Extract medicine stock counts from the photographed PHC stock register or shelf. Return JSON {"items":[{"medId":string,"qty":number}]}. Only use these medId values: ' + list + '. Skip anything unreadable.',
      prompt: 'Read the current closing stock for each medicine visible.',
      image: { mime: mimeType, data: imageBase64.replace(/^data:[^,]+,/, '') },
    });
    if (out?.items?.length) { items = out.items.filter((i) => E.MEDICINES.some((m) => m.id === i.medId)); source = 'gemini'; }
  }
  if (!items) {
    const p = E.world().net.phcs.find((x) => x.id === phcId) || E.world().net.phcs[0];
    items = ['para', 'ors', 'amox', 'arte'].map((id) => ({ medId: id, qty: Math.round(p.stock[id] * (0.6 + Math.random() * 0.2)) }));
    source = 'demo';
  }
  const applied = apply && phcId ? E.applyScan(phcId, items) : 0;
  return { source, items: items.map((i) => ({ ...i, medicine: E.MEDICINES.find((m) => m.id === i.medId).name })), applied };
}));

// ---------- emergency referral (kept from the original RapidAid SOS flow) ----------
app.get('/api/emergency/cases', wrap(() => E.world().cases));
app.post('/api/emergency/refer', wrap((r) => {
  const { phcId, services = [], priority = 1 } = r.body;
  const w = E.world();
  const phc = w.net.phcs.find((p) => p.id === phcId);
  if (!phc) throw new Error('unknown PHC');
  const ranked = w.hospitals.map((h) => {
    const km = haversine(phc, h);
    const missing = services.filter((s) => !h.services.includes(s));
    const load = 1 - h.icu.free / Math.max(1, h.icu.total);
    const eta = Math.round(km / (priority === 1 ? 0.9 : 0.6) + 4);
    const score = km * 1.0 + missing.length * 120 + load * 30 + (h.icu.free === 0 && services.includes('ICU') ? 150 : 0) + (h.er.free === 0 ? 60 : 0);
    return { ...h, km: Math.round(km), etaMin: eta, missing, score };
  }).sort((a, b) => a.score - b.score);
  return { phc: { id: phc.id, name: phc.name, lat: phc.lat, lng: phc.lng, state: phc.state }, options: ranked.slice(0, 4) };
}));

// ---------- static frontend (single container on Cloud Run) ----------
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`RapidAid API on :${port}  gemini=${geminiEnabled() ? geminiModel() : 'off (fallbacks active)'}`));
