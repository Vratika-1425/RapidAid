import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

export const ease = [0.22, 1, 0.36, 1] as const

export function Reveal({ children, delay = 0, y = 22, className = '' }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, delay, ease }}>
      {children}
    </motion.div>
  )
}

export function CountUp({ value, decimals = 0, suffix = '', prefix = '', className = '' }: { value: number; decimals?: number; suffix?: string; prefix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => `${prefix}${v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`)
  const started = useRef(false)
  useEffect(() => {
    if (!inView) return
    const c = animate(mv, value, { duration: started.current ? 0.6 : 1.4, ease })
    started.current = true
    return () => c.stop()
  }, [value, inView, mv])
  return <motion.span ref={ref} className={`num ${className}`}>{text}</motion.span>
}

export function Pill({ tone = 'neutral', children, pulse = false }: { tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'dark'; children: ReactNode; pulse?: boolean }) {
  const tones = { neutral: 'bg-stone-100 text-stone-700', ok: 'bg-forest-50 text-forest-700', warn: 'bg-saffron-100 text-[#9A5A0B]', bad: 'bg-coral-100 text-coral-600', info: 'bg-sky-100 text-[#1F5E96]', dark: 'bg-forest-900 text-white' }
  const dot = { neutral: 'bg-stone-400', ok: 'bg-forest-500', warn: 'bg-saffron-500', bad: 'bg-coral-500', info: 'bg-sky-500', dark: 'bg-saffron-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider ${tones[tone]}`}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${dot[tone]}`} />}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot[tone]}`} />
      </span>
      {children}
    </span>
  )
}

export const sevTone = (s: string) => (s === 'critical' ? 'bad' : s === 'high' || s === 'low' ? 'warn' : s === 'ok' ? 'ok' : 'neutral') as 'bad' | 'warn' | 'ok' | 'neutral'

export function SectionHead({ eyebrow, title, sub, right }: { eyebrow: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <div className="label mb-2 text-forest-600">{eyebrow}</div>
        <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight text-ink md:text-4xl">{title}</h2>
        {sub && <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function AiBadge({ source, model }: { source?: string; model?: string }) {
  const live = source === 'gemini'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider ${live ? 'border-sky-500/30 bg-sky-100 text-[#1F5E96]' : 'border-line bg-stone-50 text-stone-600'}`}>
      <Sparkles size={11} /> {live ? `Gemini${model ? ` · ${model}` : ''}` : source === 'demo' ? 'Demo extraction' : 'Offline engine'}
    </span>
  )
}

export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton ${className}`} /> }

export function Stat({ label, value, sub, tone = 'ink', children }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ink' | 'bad' | 'ok' | 'warn'; children?: ReactNode }) {
  const c = { ink: 'text-ink', bad: 'text-coral-600', ok: 'text-forest-600', warn: 'text-[#C46F0E]' }[tone]
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className={`mt-2 font-display text-[34px] font-semibold leading-none tracking-tight ${c}`}>{value}</div>
      {sub && <div className="mt-2 text-[13px] text-muted">{sub}</div>}
      {children}
    </div>
  )
}

export function Bar({ value, tone = 'ok' }: { value: number; tone?: 'ok' | 'warn' | 'bad' }) {
  const c = { ok: 'bg-forest-500', warn: 'bg-saffron-500', bad: 'bg-coral-500' }[tone]
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
      <motion.div className={`h-full rounded-full ${c}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} transition={{ duration: 0.9, ease }} />
    </div>
  )
}
