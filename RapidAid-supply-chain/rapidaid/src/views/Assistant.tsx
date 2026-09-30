import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Mic, MicOff, Send, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AiBadge, Reveal, SectionHead, ease } from '../components/ui'
import { api } from '../lib/api'
import { LANGS, useI18n } from '../lib/i18n'

interface Msg { role: 'user' | 'ai'; text: string; source?: string; model?: string }
const SUGGEST = ['Which district will run out of ORS first?', 'How many beds are free nationally?', 'What transfers do you recommend right now?', 'Which states have the lowest staff attendance?']

export default function Assistant({ state }: { state: string | null }) {
  const { t, lang, setLang, speech } = useI18n()
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'ai', text: 'Namaste. Ask me about medicine stock, beds, staff attendance or recommended transfers. I answer from the live network data, in your language.' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [speak, setSpeak] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const rec = useRef<any>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, busy])
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  const say = (text: string) => { if (!speak || !('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(text); u.lang = speech; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u) }
  const send = async (q = input) => {
    if (!q.trim() || busy) return
    setInput(''); setMsgs((m) => [...m, { role: 'user', text: q }]); setBusy(true)
    try { const r = await api('/ai/assistant', { body: { message: q, lang, state } }); setMsgs((m) => [...m, { role: 'ai', text: r.text, source: r.source, model: r.model }]); say(r.text) }
    catch (e) { setMsgs((m) => [...m, { role: 'ai', text: `Sorry, ${(e as Error).message}` }]) } finally { setBusy(false) }
  }
  const mic = () => {
    if (!SR) return
    if (listening) { rec.current?.stop(); return }
    const r = new SR(); r.lang = speech; r.interimResults = false
    r.onresult = (e: any) => { const tx = e.results[0][0].transcript; setInput(tx); send(tx) }
    r.onend = () => setListening(false); r.onerror = () => setListening(false)
    rec.current = r; setListening(true); r.start()
  }

  return (
    <div>
      <Reveal><SectionHead eyebrow="Multilingual and voice" title="Ask the network in your own language" sub="Health workers and officials can type or speak in Hindi, Tamil, Telugu, Kannada, Bengali, Marathi or English. Gemini answers only from live data. On Google Cloud, voice runs through Speech-to-Text, Text-to-Speech and the Translation API; this demo uses the browser's speech engines." /></Reveal>
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {LANGS.map((l) => <button key={l.code} onClick={() => setLang(l.code)} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${lang === l.code ? 'border-forest-900 bg-forest-900 text-white' : 'border-line bg-white text-muted hover:border-forest-600'}`}>{l.name}</button>)}
          <button onClick={() => setSpeak((s) => !s)} className={`ml-auto flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${speak ? 'border-saffron-500 bg-saffron-100 text-[#9A5A0B]' : 'border-line bg-white text-muted'}`}><Volume2 size={14} /> Read aloud</button>
        </div>
        <div className="card flex h-[520px] flex-col overflow-hidden">
          <div className="scroll-thin flex-1 space-y-4 overflow-y-auto p-5">
            <AnimatePresence initial={false}>
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ease, duration: 0.4 }} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'ai' && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest-900 text-white"><Bot size={16} /></span>}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${m.role === 'user' ? 'bg-forest-900 text-white' : 'bg-stone-100 text-ink'}`}>{m.text}{m.source && <div className="mt-2"><AiBadge source={m.source} model={m.model} /></div>}</div>
                </motion.div>
              ))}
              {busy && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-forest-900 text-white"><Bot size={16} /></span><div className="flex items-center gap-1 rounded-2xl bg-stone-100 px-4 py-3">{[0, 1, 2].map((d) => <motion.i key={d} className="h-1.5 w-1.5 rounded-full bg-stone-400" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }} />)}</div></motion.div>}
            </AnimatePresence>
            <div ref={end} />
          </div>
          <div className="border-t border-line p-3">
            <div className="scroll-thin mb-2 flex gap-1.5 overflow-x-auto pb-1">{SUGGEST.map((s) => <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-xs text-muted transition hover:border-forest-600 hover:text-forest-700">{s}</button>)}</div>
            <div className="flex gap-2">
              <input className="field" placeholder={t('ask')} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
              <button className={`btn ${listening ? 'bg-coral-500 text-white' : 'border border-line bg-white text-ink hover:border-forest-600'}`} onClick={mic} disabled={!SR} title={SR ? t('speak') : 'Voice input needs Chrome or Edge'}>{listening ? <MicOff size={17} /> : <Mic size={17} />}</button>
              <button className="btn-primary" onClick={() => send()} disabled={busy || !input.trim()}><Send size={16} /> {t('send')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
