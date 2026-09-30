import { AnimatePresence, motion } from 'framer-motion'
import { Ambulance, BedDouble, Check, Hospital, Loader2, Siren, Stethoscope } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AiBadge, Pill, Reveal, SectionHead, ease } from '../components/ui'
import { api, useApi, type Meta } from '../lib/api'
import { useI18n } from '../lib/i18n'

const CHIPS = ['Chest pain with sweating, age 58', 'Snake bite on leg, swelling', 'Child with severe diarrhoea, drowsy', 'Pregnant woman, heavy bleeding', 'Road accident, head injury', 'Dog bite, deep wound']
const STEPS = ['SOS raised at PHC', 'AI triage complete', 'Hospital pre-alerted', 'Ambulance dispatched', 'Arrived, care team ready']

function RouteMap({ a, b, go }: { a: { lat: number; lng: number }; b: { lat: number; lng: number }; go: boolean }) {
  const pad = 0.15, minLa = Math.min(a.lat, b.lat), maxLa = Math.max(a.lat, b.lat), minLo = Math.min(a.lng, b.lng), maxLo = Math.max(a.lng, b.lng)
  const sx = (lo: number) => 30 + ((lo - minLo) / Math.max(0.05, maxLo - minLo)) * 340 * (1 - pad)
  const sy = (la: number) => 150 - ((la - minLa) / Math.max(0.05, maxLa - minLa)) * 110 * (1 - pad)
  const x1 = sx(a.lng), y1 = sy(a.lat), x2 = sx(b.lng), y2 = sy(b.lat)
  const d = `M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - 40} ${x2},${y2}`
  return (
    <svg viewBox="0 0 400 190" className="h-44 w-full rounded-2xl bg-forest-950">
      <defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#fff" strokeOpacity=".07" /></pattern></defs>
      <rect width="400" height="190" fill="url(#g)" />
      <path d={d} fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="2" strokeDasharray="4 6" />
      <motion.path d={d} fill="none" stroke="#F29B38" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: go ? 1 : 0 }} transition={{ duration: go ? 6 : 0.3, ease: 'linear' }} />
      <circle cx={x1} cy={y1} r="7" fill="#F7F4EC" /><circle cx={x1} cy={y1} r="14" fill="#EA5B52" className="animate-pulseRing" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} opacity=".5" />
      <circle cx={x2} cy={y2} r="8" fill="#1FA08D" stroke="#fff" strokeWidth="2" />
      <text x={x1} y={y1 + 24} textAnchor="middle" className="fill-white/80 font-mono text-[9px]">PHC</text>
      <text x={x2} y={y2 - 14} textAnchor="middle" className="fill-white/80 font-mono text-[9px]">HOSPITAL</text>
      {go && <motion.circle r="6" fill="#F29B38" stroke="#fff" strokeWidth="2" style={{ offsetPath: `path("${d}")` } as never} initial={{ offsetDistance: '0%' } as never} animate={{ offsetDistance: '100%' } as never} transition={{ duration: 6, ease: 'linear' }} />}
    </svg>
  )
}

export default function Emergency({ meta }: { meta: Meta | null }) {
  const { lang } = useI18n()
  const [state, setState] = useState('Maharashtra')
  const { data: phcs } = useApi<{ items: { id: string; name: string; district: string }[] }>(`/phcs?state=${encodeURIComponent(state)}&limit=40`)
  const [phcId, setPhcId] = useState('')
  const [text, setText] = useState(CHIPS[0])
  const [age, setAge] = useState('58'); const [spo2, setSpo2] = useState('93')
  const [busy, setBusy] = useState(false)
  const [tri, setTri] = useState<any>(null)
  const [ref, setRef] = useState<any>(null)
  const [pick, setPick] = useState(0)
  const [step, setStep] = useState(-1)
  const { data: cases } = useApi<any[]>('/emergency/cases', 10000)
  const list = useMemo(() => phcs?.items ?? [], [phcs])
  useEffect(() => { if (list.length && !list.find((p) => p.id === phcId)) setPhcId(list[0].id) }, [list, phcId])

  const raise = async () => {
    setBusy(true); setTri(null); setRef(null); setStep(0); setPick(0)
    try {
      const t = await api('/ai/triage', { body: { symptoms: text, age: age || undefined, spo2: spo2 || undefined, lang } })
      setTri(t); setStep(1)
      const r = await api('/emergency/refer', { body: { phcId, services: t.requiredServices ?? [], priority: t.priority } })
      setRef(r); setStep(2)
    } catch (e) { setTri({ error: (e as Error).message }) } finally { setBusy(false) }
  }
  const dispatch = () => { setStep(3); setTimeout(() => setStep(4), 6200) }
  const best = ref?.options?.[pick]

  return (
    <div>
      <Reveal><SectionHead eyebrow="Emergency response module" title="When a PHC can't treat, route the patient right" sub="The original RapidAid SOS flow, now wired to the supply chain: Gemini triages the case, then the referral engine ranks hospitals by live ICU beds, required services and distance, not just proximity." /></Reveal>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <Reveal className="card p-5 md:p-6">
            <div className="flex items-center gap-2 font-display text-xl font-semibold"><Siren className="text-coral-500" size={20} /> Raise an SOS</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div><div className="label mb-1.5">State</div><select className="field" value={state} onChange={(e) => setState(e.target.value)}>{meta?.states.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><div className="label mb-1.5">PHC</div><select className="field" value={phcId} onChange={(e) => setPhcId(e.target.value)}>{list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            </div>
            <div className="label mb-1.5 mt-4">Symptoms (any language)</div>
            <textarea className="field min-h-[84px] resize-none" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">{CHIPS.map((c) => <button key={c} onClick={() => setText(c)} className={`rounded-full border px-3 py-1 text-xs transition ${text === c ? 'border-forest-900 bg-forest-900 text-white' : 'border-line bg-white text-muted hover:border-forest-600'}`}>{c.split(',')[0]}</button>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div><div className="label mb-1.5">Age</div><input className="field" value={age} onChange={(e) => setAge(e.target.value)} /></div><div><div className="label mb-1.5">SpO₂ %</div><input className="field" value={spo2} onChange={(e) => setSpo2(e.target.value)} /></div></div>
            <button className="btn-primary mt-5 w-full !bg-coral-600 hover:!bg-coral-500" disabled={busy || !phcId || !text.trim()} onClick={raise}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Siren size={17} />} Triage and find hospital</button>
          </Reveal>
          <Reveal delay={0.05} className="card p-5">
            <div className="label mb-3">Recent SOS cases in the network</div>
            <div className="space-y-2">{(cases ?? []).slice(0, 5).map((c) => <div key={c.id} className="flex items-center gap-3 text-sm"><Pill tone={c.priority === 1 ? 'bad' : 'warn'}>P{c.priority}</Pill><div className="min-w-0 flex-1 truncate"><b>{c.complaint}</b> <span className="text-muted">· {c.phc}</span></div><span className="font-mono text-[11px] text-muted">{c.minutesAgo}m</span></div>)}</div>
          </Reveal>
        </div>

        <div className="space-y-6">
          <div className="card p-5 md:p-6">
            <div className="label mb-3">Case timeline</div>
            <div className="flex items-center">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5"><motion.div animate={{ scale: step === i ? 1.12 : 1, backgroundColor: step >= i ? '#0B3D36' : '#EFE9DA' }} transition={{ ease }} className="grid h-8 w-8 place-items-center rounded-full text-white">{step > i || step === 4 ? <Check size={15} /> : <span className={`text-xs font-semibold ${step >= i ? '' : 'text-muted'}`}>{i + 1}</span>}</motion.div><span className="w-16 text-center text-[10px] leading-tight text-muted">{s}</span></div>
                  {i < 4 && <div className="mx-1 mb-6 h-0.5 flex-1 overflow-hidden rounded bg-stone-200"><motion.div className="h-full bg-forest-900" animate={{ width: step > i ? '100%' : '0%' }} transition={{ duration: 0.6, ease }} /></div>}
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {tri && !tri.error && (
              <motion.div key="tri" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ease }} className="card p-5 md:p-6">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Stethoscope size={18} className="text-forest-600" /><span className="font-display text-lg font-semibold">{tri.careLevel}</span></div><div className="flex items-center gap-2"><AiBadge source={tri.source} model={tri.model} /><Pill tone={tri.priority === 1 ? 'bad' : tri.priority === 2 ? 'warn' : 'ok'} pulse={tri.priority === 1}>Priority {tri.priority}</Pill></div></div>
                <p className="mt-2 text-[14.5px] text-muted">{tri.rationale}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{(tri.requiredServices ?? []).map((s: string) => <Pill key={s} tone="info">{s}</Pill>)}</div>
                <ul className="mt-3 space-y-1 text-sm">{(tri.firstAid ?? []).map((f: string) => <li key={f} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-forest-600" />{f}</li>)}</ul>
                <div className="mt-3 text-[12px] text-muted">Decision support only. A doctor confirms before care decisions.</div>
              </motion.div>
            )}
            {tri?.error && <div className="rounded-xl bg-coral-100 p-3 text-sm text-coral-600">{tri.error}</div>}
          </AnimatePresence>

          {ref && best && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease, delay: 0.1 }} className="card p-5 md:p-6">
              <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 font-display text-lg font-semibold"><Hospital size={18} className="text-forest-600" /> Recommended hospitals</div>{step < 3 && <button className="btn-saffron !py-2" onClick={dispatch}><Ambulance size={16} /> Dispatch ambulance</button>}{step >= 3 && <Pill tone={step === 4 ? 'ok' : 'warn'} pulse={step === 3}>{step === 4 ? 'Arrived' : `En route · ETA ${best.etaMin} min`}</Pill>}</div>
              <RouteMap a={ref.phc} b={best} go={step >= 3} />
              <div className="mt-4 space-y-2">
                {ref.options.map((h: any, i: number) => (
                  <button key={h.id} onClick={() => step < 3 && setPick(i)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${pick === i ? 'border-forest-600 bg-forest-50' : 'border-line hover:border-forest-600/50'}`}>
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white font-display font-semibold text-forest-700 shadow-soft">{i + 1}</span>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{h.name}</div><div className="text-[12px] text-muted"><BedDouble size={11} className="mr-1 inline" />ICU {h.icu.free}/{h.icu.total} free · ER {h.er.free} free · {h.km} km</div>{h.missing.length > 0 && <div className="text-[12px] text-coral-600">Missing: {h.missing.join(', ')}</div>}</div>
                    <div className="text-right"><div className="num font-display text-lg font-semibold">{h.etaMin}<span className="text-xs text-muted"> min</span></div></div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
