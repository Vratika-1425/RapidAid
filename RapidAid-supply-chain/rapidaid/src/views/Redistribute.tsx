import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Loader2, Route, Truck, Zap } from 'lucide-react'
import { useState } from 'react'
import { IndiaMap } from '../components/IndiaMap'
import { CountUp, Pill, Reveal, SectionHead, Skeleton, Stat, ease, sevTone } from '../components/ui'
import { api, refreshAll, useApi, type Transfer } from '../lib/api'
import { fmt } from '../lib/format'
import { useI18n } from '../lib/i18n'

interface Plan { count: number; crossState: number; districtsRescued: number; unitsMoved: number; avgKm: number; transfers: Transfer[] }

export default function Redistribute() {
  const { t } = useI18n()
  const { data, reload } = useApi<Plan>('/redistribution', 8000)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [hi, setHi] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const approve = async (tr: Transfer) => {
    setBusy(tr.id); setErr(null)
    try { await api('/redistribution/execute', { body: { medId: tr.medId, fromId: tr.from.id, toId: tr.to.id, qty: tr.qty } }); setDone((d) => ({ ...d, [tr.id]: true })); await reload(); refreshAll() } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }
  const approveCritical = async () => {
    for (const tr of (data?.transfers ?? []).filter((x) => x.urgency === 'critical').slice(0, 8)) await approve(tr)
  }
  const shown = data?.transfers ?? []
  const mapT = hi ? shown.filter((x) => x.id === hi) : shown.slice(0, 18)

  return (
    <div>
      <Reveal><SectionHead eyebrow="Automated redistribution" title="Move stock from where it sits to where it's needed" sub="For each medicine the engine finds districts holding more than a 28-day reserve and matches them to districts heading for stock-out, nearest first, across state lines. One tap approves a dispatch and the network updates." right={<button className="btn-saffron" onClick={approveCritical} disabled={!data || !!busy}><Zap size={16} /> Approve critical transfers</button>} /></Reveal>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Reveal className="card overflow-hidden p-5">
          <div className="mb-3 grid grid-cols-3 gap-3">
            <Stat label="Transfers" value={data ? <CountUp value={data.count} /> : '—'} sub={data ? `${data.crossState} cross-state` : ''} />
            <Stat label="Districts rescued" value={data ? <CountUp value={data.districtsRescued} /> : '—'} tone="ok" />
            <Stat label="Avg distance" value={data ? <CountUp value={data.avgKm} suffix=" km" /> : '—'} />
          </div>
          <IndiaMap className="mx-auto h-[500px] max-w-[460px]" mode="state" states={[]} transfers={mapT} />
          <div className="flex items-center justify-center gap-5 text-xs text-muted"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border-2 border-forest-600 bg-white" />Donor</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border-2 border-coral-600 bg-white" />Recipient</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-saffron-500" />Shipment</span></div>
        </Reveal>

        <div className="scroll-thin max-h-[760px] space-y-3 overflow-y-auto pr-1">
          {err && <div className="rounded-xl bg-coral-100 p-3 text-sm text-coral-600">{err}</div>}
          {!data && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
          {data && shown.length === 0 && <div className="card p-10 text-center text-muted"><Check className="mx-auto mb-2 text-forest-600" /> All districts are balanced. No transfers needed.</div>}
          <AnimatePresence initial={false}>
            {shown.map((tr, i) => (
              <motion.div layout key={tr.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: Math.min(i, 8) * 0.04, ease }} onMouseEnter={() => setHi(tr.id)} onMouseLeave={() => setHi(null)} className={`card p-4 transition ${hi === tr.id ? 'border-forest-600 shadow-lift' : ''}`}>
                <div className="flex items-center justify-between gap-2"><div className="font-display text-lg font-semibold">{tr.medicine}</div><div className="flex gap-1.5">{tr.crossState && <Pill tone="info">Cross-state</Pill>}<Pill tone={sevTone(tr.urgency)}>{tr.urgency}</Pill></div></div>
                <div className="mt-2 flex items-center gap-2 text-sm"><span className="font-semibold">{tr.from.district}</span><span className="text-muted">({tr.from.state})</span><ArrowRight size={15} className="text-forest-600" /><span className="font-semibold">{tr.to.district}</span><span className="text-muted">({tr.to.state})</span></div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-[13px]">
                  <div><div className="label !text-[9.5px]">Quantity</div><div className="num font-semibold">{fmt(tr.qty)} <span className="font-normal text-muted">{tr.unit}</span></div></div>
                  <div><div className="label !text-[9.5px]">Route</div><div className="num font-semibold"><Route size={12} className="mr-1 inline text-muted" />{tr.km} km · {tr.transitDays} d</div></div>
                  <div><div className="label !text-[9.5px]">Recipient cover</div><div className="num font-semibold"><span className="text-coral-600">{tr.coverBefore}d</span> → <span className="text-forest-600">{tr.coverAfter}d</span></div></div>
                  <div><div className="label !text-[9.5px]">Donor after</div><div className="num font-semibold">{tr.donorCoverAfter}d</div></div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-[12px] ${tr.arrivesBeforeStockout ? 'text-forest-700' : 'text-coral-600'}`}>{tr.arrivesBeforeStockout ? 'Arrives before projected stock-out' : 'Arrives after stock-out. Use air or courier.'}</span>
                  <button className={done[tr.id] ? 'btn-ghost !py-2 !text-forest-700' : 'btn-primary !py-2'} disabled={busy === tr.id || done[tr.id]} onClick={() => approve(tr)}>{busy === tr.id ? <Loader2 size={15} className="animate-spin" /> : done[tr.id] ? <Check size={15} /> : <Truck size={15} />}{done[tr.id] ? 'Dispatched' : t('approve')}</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
