import { AnimatePresence, motion } from 'framer-motion'
import { Camera, CheckCircle2, Loader2, Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { AiBadge, Bar, Pill, Reveal, SectionHead, Skeleton, ease, sevTone } from '../components/ui'
import { api, refreshAll, useApi, type Phc } from '../lib/api'
import { fmt, pct } from '../lib/format'

export default function Stock({ state }: { state: string | null }) {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const qs = new URLSearchParams({ limit: '60', ...(state ? { state } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}) }).toString()
  const { data } = useApi<{ total: number; items: Phc[] }>(`/phcs?${qs}`, 6000)
  const { data: detail, reload } = useApi<Phc>(sel ? `/phcs/${sel}` : null, 5000)
  const [scan, setScan] = useState<{ busy: boolean; res?: any; err?: string }>({ busy: false })
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (f?: File) => {
    if (!f || !sel) return
    setScan({ busy: true })
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f) })
      const out = await api('/ai/scan', { body: { imageBase64: b64, mimeType: f.type || 'image/jpeg', phcId: sel, apply: true } })
      setScan({ busy: false, res: out }); reload(); refreshAll()
    } catch (e) { setScan({ busy: false, err: (e as Error).message }) }
  }
  const demoScan = async () => {
    if (!sel) return
    setScan({ busy: true })
    try { const out = await api('/ai/scan', { body: { phcId: sel, apply: true } }); setScan({ busy: false, res: out }); reload(); refreshAll() } catch (e) { setScan({ busy: false, err: (e as Error).message }) }
  }

  return (
    <div>
      <Reveal><SectionHead eyebrow="PHC-level visibility" title="Medicines, beds and staff at every centre" sub="Sorted by shortest days-of-cover so the most fragile PHCs surface first. Select one for its full picture, or digitise a paper stock register with Gemini Vision." /></Reveal>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap gap-2.5 border-b border-line p-4">
            <div className="relative min-w-[180px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="field !pl-9" placeholder="Search PHC, district…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="flex gap-1.5">{[['', 'All'], ['critical', 'Critical'], ['low', 'Low'], ['ok', 'Healthy']].map(([v, l]) => <button key={v} onClick={() => setStatus(v)} className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${status === v ? 'border-forest-900 bg-forest-900 text-white' : 'border-line bg-white text-muted hover:border-forest-600'}`}>{l}</button>)}</div>
          </div>
          <div className="scroll-thin max-h-[640px] overflow-y-auto">
            {!data ? <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div> : data.items.length === 0 ? <div className="p-10 text-center text-sm text-muted">No PHCs match these filters.</div> :
              data.items.map((p, i) => (
                <motion.button key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03, ease }} onClick={() => { setSel(p.id); setScan({ busy: false }) }} className={`flex w-full items-center gap-4 border-b border-line/70 px-5 py-3.5 text-left transition hover:bg-forest-50 ${sel === p.id ? 'bg-forest-50' : ''}`}>
                  <span className={`h-9 w-1.5 rounded-full ${p.status === 'critical' ? 'bg-coral-500' : p.status === 'low' ? 'bg-saffron-500' : 'bg-forest-500'}`} />
                  <div className="min-w-0 flex-1"><div className="truncate font-semibold">{p.name}</div><div className="text-[13px] text-muted">{p.district}, {p.state}</div></div>
                  <div className="text-right"><div className="num text-sm font-semibold">{p.minCover.toFixed(1)} d</div><div className="text-[11px] text-muted">min cover</div></div>
                  <Pill tone={sevTone(p.status)}>{p.status}</Pill>
                </motion.button>
              ))}
          </div>
          <div className="border-t border-line bg-stone-50 px-5 py-2.5 font-mono text-[11px] text-muted">Showing {data?.items.length ?? 0} of {fmt(data?.total ?? 0)} PHCs</div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <AnimatePresence mode="wait">
            {!detail ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card flex h-[420px] flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-forest-50 text-forest-600"><Search /></div>
                <div className="font-display text-xl font-semibold">Select a PHC</div><p className="mt-1 max-w-xs text-sm text-muted">See its medicine cover, beds, staff and scan its stock register.</p>
              </motion.div>
            ) : (
              <motion.div key={detail.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.4, ease }} className="card p-6">
                <div className="flex items-start justify-between gap-3"><div><div className="label">{detail.id}</div><h3 className="font-display text-2xl font-semibold leading-tight">{detail.name}</h3><div className="text-sm text-muted">{detail.district}, {detail.state} · catchment {fmt(detail.catchment)}</div></div><Pill tone={sevTone(detail.status)} pulse={detail.status === 'critical'}>{detail.status}</Pill></div>
                <div className="mt-5 grid grid-cols-2 gap-5">
                  <div><div className="mb-1.5 flex justify-between text-[13px]"><span className="text-muted">Beds occupied</span><span className="num font-semibold">{detail.beds.occupied}/{detail.beds.total}</span></div><Bar value={detail.beds.occupied / detail.beds.total} tone={detail.beds.occupied / detail.beds.total > 0.85 ? 'bad' : 'ok'} /></div>
                  <div><div className="mb-1.5 flex justify-between text-[13px]"><span className="text-muted">Staff present</span><span className="num font-semibold">{detail.staff.present}/{detail.staff.sanctioned} · {pct(detail.staff.present / detail.staff.sanctioned)}</span></div><Bar value={detail.staff.present / detail.staff.sanctioned} tone={detail.staff.present / detail.staff.sanctioned < 0.7 ? 'warn' : 'ok'} /></div>
                </div>
                <div className="label mb-2 mt-6">Days of cover by medicine</div>
                <div className="scroll-thin max-h-[300px] space-y-2.5 overflow-y-auto pr-1">
                  {[...detail.stock].sort((a, b) => a.cover - b.cover).map((m) => (
                    <div key={m.medId}><div className="mb-1 flex justify-between text-[13px]"><span className="font-medium">{m.medicine}</span><span className="num text-muted">{fmt(m.qty)} {m.unit} · <b className={m.cover < 3 ? 'text-coral-600' : m.cover < 7 ? 'text-[#C46F0E]' : 'text-ink'}>{m.cover.toFixed(1)} d</b></span></div><Bar value={m.cover / 30} tone={m.cover < 3 ? 'bad' : m.cover < 7 ? 'warn' : 'ok'} /></div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-dashed border-forest-600/40 bg-forest-50/60 p-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-semibold"><Camera size={16} className="text-forest-600" /> Scan stock register</div>{scan.res && <AiBadge source={scan.res.source} />}</div>
                  <p className="mt-1 text-[13px] text-muted">Photograph a handwritten register or shelf. Gemini Vision extracts closing stock and updates this PHC.</p>
                  <div className="mt-3 flex gap-2"><input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} /><button className="btn-primary !py-2" disabled={scan.busy} onClick={() => fileRef.current?.click()}>{scan.busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />} Upload photo</button><button className="btn-ghost !py-2" disabled={scan.busy} onClick={demoScan}>Use sample</button></div>
                  {scan.err && <div className="mt-2 text-sm text-coral-600">{scan.err}</div>}
                  {scan.res && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-1 text-[13px]"><div className="flex items-center gap-1.5 font-semibold text-forest-700"><CheckCircle2 size={14} /> {scan.res.applied} line items updated</div>{scan.res.items.map((i: any) => <div key={i.medId} className="flex justify-between"><span>{i.medicine}</span><span className="num font-semibold">{fmt(i.qty)}</span></div>)}</motion.div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
