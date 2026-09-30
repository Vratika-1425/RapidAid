import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, BedDouble, CloudRain, Flame, Loader2, Sparkles, Thermometer, UserCheck, Users, Bug } from 'lucide-react'
import { useState } from 'react'
import { IndiaMap } from '../components/IndiaMap'
import { AiBadge, CountUp, Pill, Reveal, SectionHead, Skeleton, Stat, ease } from '../components/ui'
import { api, refreshAll, useApi, type EventItem, type MapPoint, type Meta, type StateRow, type Summary } from '../lib/api'
import { ago, pct } from '../lib/format'
import { useI18n } from '../lib/i18n'

const SCEN_ICON: Record<string, typeof Flame> = { dengue: Bug, flood: CloudRain, heatwave: Thermometer, malaria: Bug }

export default function Command({ meta, state, setState }: { meta: Meta | null; state: string | null; setState: (s: string | null) => void }) {
  const { t, lang } = useI18n()
  const { data: sum } = useApi<Summary>(`/summary${state ? `?state=${encodeURIComponent(state)}` : ''}`, 5000)
  const { data: states } = useApi<StateRow[]>('/states', 5000)
  const { data: pts } = useApi<MapPoint[]>('/map', 6000)
  const { data: events } = useApi<EventItem[]>('/events', 4000)
  const [mode, setMode] = useState<'phc' | 'state'>('state')
  const [scen, setScen] = useState({ type: 'dengue', state: 'Bihar' })
  const [busy, setBusy] = useState(false)
  const [brief, setBrief] = useState<{ text: string; source: string; model?: string } | null>(null)
  const [briefBusy, setBriefBusy] = useState(false)

  const runScenario = async (clear = false) => {
    setBusy(true)
    try { await api('/scenario', { body: clear ? { clear: true } : scen }); refreshAll(); setBrief(null) } finally { setBusy(false) }
  }
  const runBrief = async () => {
    setBriefBusy(true)
    try { setBrief(await api('/ai/brief', { body: { state, lang } })) } finally { setBriefBusy(false) }
  }

  const ranked = [...(states ?? [])].sort((a, b) => b.critical + b.criticalAlerts - (a.critical + a.criticalAlerts))

  return (
    <div className="space-y-8">
      <Reveal>
        <SectionHead eyebrow="National command centre" title={state ? `${state} — live PHC network` : 'Every PHC. One live picture.'} sub="Medicine stocks, bed availability and staff attendance from each Primary Health Centre, rolled up by district, state and nation. Updates every few seconds." right={state ? <button className="btn-ghost" onClick={() => setState(null)}>← All India</button> : undefined} />
      </Reveal>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {sum ? (
          <>
            <Stat label={t('phcs')} value={<CountUp value={sum.phcs} />} sub={`${sum.states} states · ${sum.districts} districts`} />
            <Stat label="Footfall today" value={<CountUp value={sum.footfallToday} />} sub="patients registered" />
            <Stat label={t('bedsFree')} value={<CountUp value={sum.bedsFree} />} sub={<span className="flex items-center gap-1"><BedDouble size={13} /> {pct(sum.bedOccupancy)} occupied</span>} />
            <Stat label={t('attendance')} value={<CountUp value={sum.attendance * 100} decimals={0} suffix="%" />} tone={sum.attendance < 0.75 ? 'warn' : 'ok'} sub={<span className="flex items-center gap-1"><UserCheck size={13} /> {sum.staffPresent.toLocaleString('en-IN')} of {sum.staffSanctioned.toLocaleString('en-IN')}</span>} />
            <Stat label={t('alerts')} value={<CountUp value={sum.criticalAlerts} />} tone="bad" sub={<span className="flex items-center gap-1"><AlertTriangle size={13} /> {sum.critical} PHCs critical · {sum.activeAlerts} total</span>} />
          </>
        ) : Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[124px]" />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Reveal className="card relative overflow-hidden p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="label">Stock status map</div>
              <div className="mt-1 font-display text-lg font-semibold">{mode === 'state' ? 'State risk · click to drill in' : `${pts?.length ?? '—'} Primary Health Centres`}</div>
            </div>
            <div className="flex rounded-full border border-line bg-stone-50 p-1 text-xs font-semibold">
              {(['state', 'phc'] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`relative rounded-full px-3.5 py-1.5 transition ${mode === m ? 'text-white' : 'text-muted hover:text-ink'}`}>
                  {mode === m && <motion.span layoutId="mapmode" className="absolute inset-0 rounded-full bg-forest-900" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                  <span className="relative">{m === 'state' ? 'States' : 'PHCs'}</span>
                </button>
              ))}
            </div>
          </div>
          <IndiaMap className="mx-auto h-[540px] max-w-[500px]" mode={mode} points={pts ?? []} states={states ?? []} onState={(s) => setState(s)} activeState={state} />
          <div className="absolute bottom-5 left-5 flex flex-col gap-1.5 rounded-xl border border-line bg-white/85 p-3 text-xs backdrop-blur">
            {[['#1FA08D', 'Healthy'], ['#F29B38', 'Low (<7 d)'], ['#D93C3C', 'Critical (<3 d)']].map(([c, l]) => (
              <span key={l} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </Reveal>

        <div className="space-y-6">
          <Reveal delay={0.05} className="card p-5">
            <div className="flex items-center justify-between"><div className="label">Emergency scenario simulator</div>{sum?.scenarios.length ? <Pill tone="bad" pulse>{sum.scenarios.length} active</Pill> : <Pill>Baseline</Pill>}</div>
            <p className="mt-2 text-sm text-muted">Declare an outbreak and watch demand forecasts, alerts and redistribution plans re-compute end to end.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <select className="field" value={scen.type} onChange={(e) => setScen({ ...scen, type: e.target.value })}>{meta?.scenarios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
              <select className="field" value={scen.state} onChange={(e) => setScen({ ...scen, state: e.target.value })}>{meta?.states.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <div className="mt-3 flex gap-2.5">
              <button className="btn-primary flex-1" disabled={busy || !meta} onClick={() => runScenario()}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Flame size={16} />} Declare scenario</button>
              <button className="btn-ghost" disabled={busy || !sum?.scenarios.length} onClick={() => runScenario(true)}>Clear</button>
            </div>
            <AnimatePresence>
              {sum?.scenarios.map((s) => {
                const Icon = SCEN_ICON[s.type] ?? Flame
                return <motion.div key={s.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex items-center gap-2 overflow-hidden rounded-xl bg-coral-100 px-3 py-2 text-sm font-medium text-coral-600"><Icon size={15} /> {s.label} · {s.state}</motion.div>
              })}
            </AnimatePresence>
          </Reveal>

          <Reveal delay={0.1} className="card p-5">
            <div className="flex items-center justify-between"><div className="label">{t('brief')}</div>{brief && <AiBadge source={brief.source} model={brief.model} />}</div>
            <div className="mt-3 min-h-[92px] whitespace-pre-line text-[14.5px] leading-relaxed text-ink">
              {briefBusy ? <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-4/6" /></div> : brief ? <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }}>{brief.text}</motion.div> : <span className="text-muted">Gemini reads the live alerts, forecasts and proposed transfers and writes a briefing for {state ?? 'the national'} control room, in your language.</span>}
            </div>
            <button className="btn-saffron mt-3" onClick={runBrief} disabled={briefBusy}><Sparkles size={16} /> Generate brief</button>
          </Reveal>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Reveal className="card p-5">
          <div className="label mb-3">Live event stream</div>
          <div className="scroll-thin max-h-[330px] space-y-1 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {(events ?? []).slice(0, 12).map((e) => (
                <motion.div key={e.id} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease }} className="flex gap-3 rounded-xl px-2 py-2.5 hover:bg-stone-50">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.level === 'critical' ? 'bg-coral-500' : e.level === 'warn' ? 'bg-saffron-500' : e.level === 'ok' ? 'bg-forest-500' : 'bg-sky-500'}`} />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{e.title}</div><div className="text-[13px] leading-snug text-muted">{e.detail}</div></div>
                  <span className="shrink-0 font-mono text-[10.5px] text-muted">{ago(e.t)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Reveal>

        <Reveal delay={0.05} className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5"><div className="label">State leaderboard · highest risk first</div><Users size={15} className="text-muted" /></div>
          <div className="scroll-thin mt-3 max-h-[330px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white font-mono text-[10.5px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-2 font-medium">State</th><th className="px-2 font-medium">Critical</th><th className="px-2 font-medium">Alerts</th><th className="px-2 font-medium">Beds</th><th className="px-5 font-medium">Staff</th></tr></thead>
              <tbody>
                {ranked.map((s) => (
                  <motion.tr layout key={s.name} onClick={() => setState(s.name)} className={`cursor-pointer border-t border-line/70 transition hover:bg-forest-50 ${state === s.name ? 'bg-forest-50' : ''}`}>
                    <td className="px-5 py-2.5 font-semibold">{s.name}{s.scenario && <span className="ml-2 align-middle"><Pill tone="bad" pulse>{s.scenario}</Pill></span>}</td>
                    <td className="num px-2">{s.critical ? <span className="font-semibold text-coral-600">{s.critical}</span> : <span className="text-muted">0</span>}</td>
                    <td className="num px-2">{s.alerts}</td>
                    <td className="num px-2">{pct(s.bedOccupancy)}</td>
                    <td className="num px-5">{pct(s.attendance)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
