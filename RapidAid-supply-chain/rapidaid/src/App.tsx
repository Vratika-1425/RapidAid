import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { Activity, ArrowRight, Bot, Boxes, Brain, Globe2, LayoutDashboard, Network, Package, Siren, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CountUp, Pill, Reveal, ease } from './components/ui'
import { useApi, type Meta, type Summary } from './lib/api'
import { LANGS, I18nProvider, useI18n } from './lib/i18n'
import Assistant from './views/Assistant'
import Command from './views/Command'
import Emergency from './views/Emergency'
import Federated from './views/Federated'
import Forecast from './views/Forecast'
import Redistribute from './views/Redistribute'
import Stock from './views/Stock'

const TABS = [
  { id: 'command', icon: LayoutDashboard },
  { id: 'stock', icon: Package },
  { id: 'forecast', icon: Activity },
  { id: 'redistribute', icon: Truck },
  { id: 'federated', icon: Network },
  { id: 'emergency', icon: Siren },
  { id: 'assistant', icon: Bot },
] as const
type TabId = (typeof TABS)[number]['id']

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <a href="#top" className="flex items-center gap-2.5">
      <img src="/rapidaid-mark.svg" alt="" className="h-8 w-8 rounded-xl" />
      <span className={`font-display text-xl font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>RapidAid</span>
    </a>
  )
}

function Shell() {
  const { t, lang, setLang } = useI18n()
  const [tab, setTab] = useState<TabId>(() => (TABS.find((x) => x.id === location.hash.slice(1))?.id ?? 'command'))
  const [state, setState] = useState<string | null>(null)
  const { data: meta } = useApi<Meta>('/meta')
  const { data: sum, error } = useApi<Summary>('/summary', 5000)
  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  useEffect(() => { history.replaceState(null, '', `#${tab}`) }, [tab])
  useEffect(() => {
    const on = () => { const id = TABS.find((x) => x.id === location.hash.slice(1))?.id; if (id) setTab(id) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (id: TabId) => { setTab(id); document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' }) }
  const pickState = (s: string | null) => setState(s)

  return (
    <div id="top" className="min-h-screen">
      <motion.div style={{ scaleX: bar }} className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-saffron-500" />

      {/* hero */}
      <header className="relative overflow-hidden bg-forest-950 text-white">
        <div className="grid-bg absolute inset-0" />
        <motion.div className="absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-forest-500/30 blur-[110px]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute -bottom-40 left-1/4 h-[420px] w-[420px] rounded-full bg-saffron-500/20 blur-[110px]" animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-20 pt-6 md:px-8">
          <div className="flex items-center justify-between">
            <Logo dark />
            <div className="flex items-center gap-3">
              <Pill tone="dark" pulse>{error ? 'Reconnecting' : t('live')}</Pill>
              <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as never)} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white outline-none backdrop-blur [&>option]:text-ink">{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select>
            </div>
          </div>
          <div className="mt-16 grid items-end gap-12 md:mt-24 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] text-white/80 backdrop-blur"><Globe2 size={14} className="text-saffron-400" /> Federated AI for India's Primary Health Centres</motion.div>
              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.08, ease }} className="font-display text-[44px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[76px]">No PHC should run out of medicine <span className="text-saffron-400">when it matters.</span></motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2, ease }} className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/70">Real-time visibility of medicines, beds and staff across every PHC. Gemini-powered forecasts warn of stock-outs days ahead, and the platform recommends cross-district transfers automatically.</motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease }} className="mt-8 flex flex-wrap gap-3">
                <button className="btn-saffron !px-6 !py-3 text-[15px]" onClick={() => go('command')}>Open live console <ArrowRight size={17} /></button>
                <button className="btn border border-white/25 bg-white/5 !px-6 !py-3 text-[15px] text-white backdrop-blur hover:bg-white/10" onClick={() => go('redistribute')}>See auto-redistribution</button>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.35, ease }} className="grid grid-cols-2 gap-3">
              {[['PHCs monitored', sum?.phcs ?? 0, ''], ['States federated', sum?.states ?? 0, ''], ['Critical alerts', sum?.criticalAlerts ?? 0, ''], ['Beds free', sum?.bedsFree ?? 0, '']].map(([l, v, s], i) => (
                <div key={l as string} className={`rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur ${i === 2 ? 'ring-1 ring-coral-500/40' : ''}`}>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/55">{l}</div>
                  <div className={`mt-2 font-display text-[40px] font-semibold leading-none ${i === 2 ? 'text-coral-500' : ''}`}><CountUp value={v as number} suffix={s as string} /></div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </header>

      {/* sticky nav */}
      <nav id="console" className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center gap-1 overflow-x-auto px-3 py-2.5 md:px-8 [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === id ? 'text-white' : 'text-muted hover:text-ink'}`}>
              {tab === id && <motion.span layoutId="tabpill" className="absolute inset-0 rounded-full bg-forest-900" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <Icon size={15} className="relative" /><span className="relative">{t(id)}</span>
            </button>
          ))}
          {state && <button onClick={() => setState(null)} className="ml-auto shrink-0"><Pill tone="info">{state} ✕</Pill></button>}
        </div>
      </nav>

      <main className="mx-auto max-w-[1240px] px-5 py-10 md:px-8 md:py-14">
        {error && !sum && <div className="mb-6 rounded-2xl border border-coral-500/30 bg-coral-100 p-4 text-sm text-coral-600">Cannot reach the RapidAid API. Start it with <code className="font-mono">npm run server</code> or set <code className="font-mono">VITE_API_URL</code>.</div>}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease }}>
            {tab === 'command' && <Command meta={meta} state={state} setState={pickState} />}
            {tab === 'stock' && <Stock state={state} />}
            {tab === 'forecast' && <Forecast meta={meta} state={state} />}
            {tab === 'redistribute' && <Redistribute />}
            {tab === 'federated' && <Federated />}
            {tab === 'emergency' && <Emergency meta={meta} />}
            {tab === 'assistant' && <Assistant state={state} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* architecture */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-16 md:px-8">
          <Reveal><div className="label mb-2 text-forest-600">Built for India, ready to pilot</div><h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">From one district to a national rollout without re-architecture.</h2></Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              [Brain, 'Gemini + Vertex AI', 'Gemini writes situation briefs, triages emergencies, answers in 7 languages and reads stock-register photos. Forecasts are served from Vertex AI.'],
              [Network, 'Federated by design', 'States keep their data. Only model weights travel, matching how India\'s health data is governed.'],
              [Boxes, 'Cloud Run + BigQuery', 'One stateless container scales to zero. Swap the data module for HMIS / e-Aushadhi feeds landing in BigQuery.'],
              [Globe2, 'Multilingual, voice-first', 'Hindi, Tamil, Telugu, Kannada, Bengali, Marathi and English. Speech-to-Text and Translation API ready.'],
            ].map(([Icon, h, p]: any, i) => (
              <Reveal key={h} delay={i * 0.07}><div className="card h-full p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift"><span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-forest-50 text-forest-700"><Icon size={20} /></span><div className="font-display text-lg font-semibold">{h}</div><p className="mt-1.5 text-[14px] leading-relaxed text-muted">{p}</p></div></Reveal>
            ))}
          </div>
        </div>
      </section>
      <footer className="bg-forest-950 py-10 text-white/70">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 text-sm md:px-8">
          <Logo dark />
          <p className="max-w-xl text-[13px] leading-relaxed">Prototype with synthetic, realistic PHC data. Not a certified medical device. In an emergency in India call <b className="text-white">112</b> or <b className="text-white">108</b>.</p>
        </div>
      </footer>
    </div>
  )
}

export default function App() { return <I18nProvider><Shell /></I18nProvider> }
