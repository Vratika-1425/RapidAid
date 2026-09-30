import { motion } from 'framer-motion'
import { Lock, Play, RotateCcw, Server, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CountUp, Reveal, SectionHead, Skeleton, Stat, ease } from '../components/ui'
import { api } from '../lib/api'

export default function Federated() {
  const [rounds, setRounds] = useState(10)
  const [dp, setDp] = useState(0)
  const [res, setRes] = useState<any>(null)
  const [shown, setShown] = useState(0)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const run = async () => {
    clearInterval(timer.current)
    setRunning(true); setShown(0)
    const r = await api(`/federated?rounds=${rounds}&dp=${dp}`)
    setRes(r)
    let i = 0
    timer.current = setInterval(() => { i++; setShown(i); if (i >= r.history.length - 1) { clearInterval(timer.current); setRunning(false) } }, 380)
  }
  useEffect(() => { run(); return () => clearInterval(timer.current) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hist = res ? res.history.slice(0, shown + 1) : []
  const cur = hist[hist.length - 1]

  return (
    <div>
      <Reveal><SectionHead eyebrow="Federated learning across states" title="One national model. Zero raw data shared." sub="Each state trains a demand model on its own PHC records and sends only a 5-number weight vector to be averaged (FedAvg). Small states borrow strength from large ones without their data ever leaving state servers, which fits India's federated health-data structure." /></Reveal>

      <Reveal className="card mb-6 overflow-hidden p-5 md:p-6">
        <div className="grid items-center gap-4 text-sm md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {[['12 state servers', 'Train locally on PHC data', Lock], ['Weights only', '5 numbers per state per round', ShieldCheck], ['Global model', 'Averaged, then sent back', Server]].map(([a, b, Icon]: any, i) => (
            <div key={a} className="contents">
              <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, ease }} className="flex items-center gap-3 rounded-2xl bg-forest-50 p-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-900 text-white"><Icon size={19} /></span><div><div className="font-semibold">{a}</div><div className="text-[13px] text-muted">{b}</div></div></motion.div>
              {i < 2 && <div className="relative hidden h-px w-14 overflow-hidden bg-line md:block"><motion.i className="absolute inset-y-0 w-6 bg-saffron-500" animate={{ x: [-24, 56] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} /></div>}
            </div>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><div className="label">Forecast error (RMSE) per training round</div><div className="mt-1 font-display text-lg font-semibold">Federated model converges to the pooled-data ceiling</div></div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-muted">Rounds <input type="range" min={3} max={20} value={rounds} onChange={(e) => setRounds(+e.target.value)} className="accent-forest-700" /><b className="num w-5 text-ink">{rounds}</b></label>
              <label className="flex items-center gap-2 text-muted">Privacy noise <input type="range" min={0} max={5} step={0.5} value={dp} onChange={(e) => setDp(+e.target.value)} className="accent-saffron-500" /><b className="num w-6 text-ink">{dp}</b></label>
              <button className="btn-primary !py-2" disabled={running} onClick={run}>{running ? <RotateCcw size={15} className="animate-spin" /> : <Play size={15} />} Train</button>
            </div>
          </div>
          <div className="mt-4 h-[320px]">
            {!res ? <Skeleton className="h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hist} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#E3DED1" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="round" type="number" domain={[0, res.rounds]} tick={{ fontSize: 11, fill: '#5E6D69' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0.4, 'auto']} tick={{ fontSize: 11, fill: '#5E6D69' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E3DED1', fontSize: 12 }} />
                  <ReferenceLine y={res.summary.localOnlyRmse} stroke="#D93C3C" strokeDasharray="5 4" />
                  <ReferenceLine y={res.summary.pooledRmse} stroke="#3B82C4" strokeDasharray="5 4" />
                  <Line dataKey="fedRmse" name="Federated (FedAvg)" stroke="#0B3D36" strokeWidth={3} dot={{ r: 3, fill: '#0B3D36' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted"><span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-forest-900" />Federated model</span><span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-coral-500" />Each state training alone</span><span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-sky-500" />Pooled raw data (not permitted)</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Stat label="Federated RMSE" value={cur ? cur.fedRmse.toFixed(3) : '—'} tone="ok" sub={res ? `round ${Math.min(shown, res.rounds)} of ${res.rounds}` : ''} />
          <Stat label="States improved vs training alone" value={res ? <CountUp value={res.summary.statesImproved} suffix={` / ${res.summary.states}`} /> : '—'} tone="ok" sub={res ? `${((1 - res.summary.fedRmse / res.summary.localOnlyRmse) * 100).toFixed(0)}% lower error on average` : ''} />
          <Stat label="Data shared per round" value={res ? `${res.summary.bytesSharedPerRound} B` : '—'} sub="model weights only, no patient or PHC records" />
        </div>
      </div>

      <Reveal className="card mt-6 p-5 md:p-6">
        <div className="label">Per-state test error: alone vs federated</div>
        <div className="mt-4 h-[300px]">
          {res && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={res.perState} margin={{ top: 4, right: 8, left: -14, bottom: 30 }}>
                <CartesianGrid stroke="#E3DED1" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="state" tick={{ fontSize: 10.5, fill: '#5E6D69' }} interval={0} angle={-30} textAnchor="end" height={60} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5E6D69' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(11,61,54,.05)' }} contentStyle={{ borderRadius: 12, border: '1px solid #E3DED1', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="localRmse" name="Trained alone" fill="#EA5B52" radius={[5, 5, 0, 0]} animationDuration={900} />
                <Bar dataKey="fedRmse" name="Federated" fill="#0B3D36" radius={[5, 5, 0, 0]} animationDuration={1300} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-2 text-[13px] text-muted">{res?.note} Features: {res?.features.join(', ')}.</p>
      </Reveal>
    </div>
  )
}
