import { motion } from 'framer-motion'
import { CalendarClock, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Pill, Reveal, SectionHead, Skeleton, Stat, ease, sevTone } from '../components/ui'
import { useApi, type Alert, type Meta } from '../lib/api'
import { compact, days, fmt } from '../lib/format'

export default function Forecast({ meta, state }: { meta: Meta | null; state: string | null }) {
  const [med, setMed] = useState('para')
  const [scope, setScope] = useState<'national' | 'state' | 'district'>(state ? 'state' : 'national')
  const [district, setDistrict] = useState('')
  const q = new URLSearchParams({ med, ...(scope !== 'national' && state ? { state } : {}), ...(scope === 'district' && district ? { district } : {}) }).toString()
  const { data: f } = useApi<any>(`/forecast?${q}`, 8000)
  const { data: al } = useApi<{ total: number; items: Alert[] }>(`/alerts?limit=14${state ? `&state=${encodeURIComponent(state)}` : ''}`, 6000)
  const dists = meta?.districts.filter((d) => !state || d.state === state) ?? []
  const todayIdx = f?.series.findIndex((s: any) => s.forecast !== undefined)
  const vals: number[] = f?.series.flatMap((s: any) => [s.actual, s.lo].filter((v) => typeof v === 'number')) ?? []
  const yMin = vals.length ? Math.floor((Math.min(...vals) * 0.8) / 100) * 100 : 0
  const rows = f?.series.map((s: any) => ({ ...s, band: s.lo !== undefined ? [s.lo, s.hi] : undefined })) ?? []

  return (
    <div>
      <Reveal><SectionHead eyebrow="Predictive modelling" title="See the stock-out before it happens" sub="A damped-trend, weekly-seasonal demand model runs per district and medicine. Declared outbreaks add an early-warning uplift, so shortages surface days before shelves empty. On Google Cloud this model is served from Vertex AI." /></Reveal>
      <div className="card p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <select className="field !w-auto" value={med} onChange={(e) => setMed(e.target.value)}>{meta?.medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <div className="flex rounded-full border border-line bg-stone-50 p-1 text-xs font-semibold">
            {(['national', 'state', 'district'] as const).map((s) => <button key={s} disabled={s !== 'national' && !state} onClick={() => setScope(s)} className={`rounded-full px-3.5 py-1.5 capitalize transition disabled:opacity-40 ${scope === s ? 'bg-forest-900 text-white' : 'text-muted hover:text-ink'}`}>{s}</button>)}
          </div>
          {scope === 'district' && <select className="field !w-auto" value={district} onChange={(e) => setDistrict(e.target.value)}><option value="">Choose district</option>{dists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
          {!state && <span className="text-[13px] text-muted">Tip: click a state on the Command map to unlock state and district scopes.</span>}
          {f?.activeScenario && <Pill tone="bad" pulse>{f.activeScenario}</Pill>}
        </div>
        {!f ? <Skeleton className="mt-5 h-[340px]" /> : (
          <motion.div key={q} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="On-hand stock" value={compact(f.stock)} sub={f.unit} />
              <Stat label="Days of cover" value={days(f.coverDays)} tone={f.coverDays < 7 ? 'bad' : f.coverDays < 14 ? 'warn' : 'ok'} sub={`${f.scope}`} />
              <Stat label="Forecast demand / day" value={compact(f.avgForecast)} sub="next 14 days avg" />
              <Stat label="PHCs in scope" value={fmt(f.phcs)} sub="aggregated" />
            </div>
            <div className="mt-5 h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <defs><linearGradient id="bandg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F29B38" stopOpacity=".35" /><stop offset="1" stopColor="#F29B38" stopOpacity=".08" /></linearGradient></defs>
                  <CartesianGrid stroke="#E3DED1" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5E6D69' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis domain={[yMin, 'auto']} tick={{ fontSize: 11, fill: '#5E6D69' }} tickLine={false} axisLine={false} tickFormatter={compact} width={52} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E3DED1', boxShadow: '0 12px 30px -12px rgba(16,32,29,.25)', fontSize: 12 }} formatter={(v: any) => (Array.isArray(v) ? `${fmt(v[0])} – ${fmt(v[1])}` : fmt(Number(v)))} />
                  <Area dataKey="band" name="80% band" stroke="none" fill="url(#bandg)" isAnimationActive animationDuration={1200} />
                  <Line dataKey="actual" name="Actual demand" stroke="#0B3D36" strokeWidth={2.5} dot={false} animationDuration={1200} />
                  <Line dataKey="forecast" name="AI forecast" stroke="#F29B38" strokeWidth={2.5} strokeDasharray="6 4" dot={false} animationDuration={1600} />
                  {todayIdx > 0 && <ReferenceLine x={rows[todayIdx]?.day} stroke="#10201D" strokeDasharray="2 4" label={{ value: 'today', position: 'insideTopRight', fontSize: 11, fill: '#10201D' }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      <Reveal className="mt-8">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-2xl font-semibold">Early warnings</h3><span className="label">{al?.total ?? '—'} open · ranked by days-to-stock-out</span></div>
        <div className="grid gap-3 md:grid-cols-2">
          {(al?.items ?? []).map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04, ease }} className="card flex items-center gap-4 p-4">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-semibold ${a.severity === 'critical' ? 'bg-coral-100 text-coral-600' : a.severity === 'high' ? 'bg-saffron-100 text-[#9A5A0B]' : 'bg-stone-100 text-stone-600'}`}><span className="num">{a.coverDays.toFixed(0)}<span className="text-xs">d</span></span></div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{a.medicine}</div><div className="truncate text-[13px] text-muted">{a.district}, {a.state} · {a.phcsAtZero}/{a.phcsTotal} PHCs at zero</div><div className="mt-0.5 flex items-center gap-1 text-[12px] text-muted"><CalendarClock size={12} /> runs out {new Date(a.stockoutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · needs <b className="num text-ink">{fmt(a.shortfall21)}</b> {a.unit}</div></div>
              <Pill tone={sevTone(a.severity)}>{a.severity}</Pill>
            </motion.div>
          ))}
          {al && al.items.length === 0 && <div className="card col-span-full p-8 text-center text-muted"><TrendingUp className="mx-auto mb-2" /> No projected stock-outs right now.</div>}
        </div>
      </Reveal>
    </div>
  )
}
