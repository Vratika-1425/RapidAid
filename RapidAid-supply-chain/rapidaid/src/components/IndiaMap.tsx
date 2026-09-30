import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { MapPoint, StateRow, Transfer } from '../lib/api'
import { ease } from './ui'

const OUTLINE: [number, number][] = [[34.6,74.3],[35.5,76.7],[35.0,78.0],[32.5,78.4],[30.9,79.0],[30.2,80.2],[28.9,80.5],[27.8,81.9],[26.4,84.0],[26.4,87.5],[27.3,88.9],[27.1,89.9],[26.9,92.0],[28.2,93.5],[29.3,95.3],[28.0,96.9],[27.0,97.2],[25.5,97.3],[24.0,95.0],[22.3,93.3],[23.0,92.4],[24.8,92.2],[25.2,90.5],[25.2,89.0],[24.2,88.9],[22.1,89.0],[21.7,88.0],[20.3,86.8],[19.3,85.0],[17.0,82.3],[15.7,80.2],[13.4,80.3],[11.4,79.8],[9.2,79.3],[8.1,77.5],[8.9,76.6],[10.6,75.9],[12.9,74.8],[15.0,74.0],[17.5,73.2],[19.0,72.8],[21.0,72.6],[22.4,72.5],[22.2,69.6],[22.8,69.1],[23.9,68.3],[24.6,71.0],[26.0,70.0],[27.4,70.3],[28.6,72.0],[30.0,73.8],[31.3,74.5],[32.6,74.8],[33.8,74.2]]
const W = 560, H = 620
export const project = (lat: number, lng: number): [number, number] => [((lng - 67.5) / 31) * W, ((36.5 - lat) / 31.5) * H]
const path = 'M' + OUTLINE.map(([la, lo]) => project(la, lo).join(',')).join('L') + 'Z'
const COL = { ok: '#1FA08D', low: '#F29B38', critical: '#D93C3C' }

export function IndiaMap({ points = [], states = [], transfers = [], mode = 'phc', onState, activeState, className = '' }: { points?: MapPoint[]; states?: StateRow[]; transfers?: Transfer[]; mode?: 'phc' | 'state'; onState?: (s: string) => void; activeState?: string | null; className?: string }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)
  const pts = useMemo(() => points.map((p) => ({ ...p, xy: project(p.lat, p.lng) })), [points])
  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Map of India showing PHC stock status">
        <defs>
          <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#0B3D36" opacity=".08" /></pattern>
          <linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EAF7F3" /><stop offset="1" stopColor="#F4EEDD" /></linearGradient>
        </defs>
        <motion.path d={path} fill="url(#land)" stroke="#0B3D36" strokeOpacity=".35" strokeWidth="1.4" strokeLinejoin="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.8, ease }} />
        <path d={path} fill="url(#dots)" />
        {transfers.map((t, i) => {
          const [x1, y1] = project(t.from.lat, t.from.lng), [x2, y2] = project(t.to.lat, t.to.lng)
          const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.22
          const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`
          return (
            <g key={t.id}>
              <motion.path d={d} fill="none" stroke={t.urgency === 'critical' ? '#D93C3C' : '#13675B'} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 5" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.85 }} transition={{ duration: 1.1, delay: 0.3 + i * 0.05, ease }} />
              <motion.circle r="3" fill="#F29B38" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], offsetDistance: ['0%', '100%'] } as never} style={{ offsetPath: `path("${d}")` } as never} transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.25, ease: 'linear' }} />
              <circle cx={x1} cy={y1} r="3.5" fill="#fff" stroke="#13675B" strokeWidth="2" />
              <circle cx={x2} cy={y2} r="3.5" fill="#fff" stroke="#D93C3C" strokeWidth="2" />
            </g>
          )
        })}
        {mode === 'phc' && pts.map((p, i) => (
          <g key={p.id} onMouseEnter={() => setHover({ x: p.xy[0], y: p.xy[1], text: `${p.n} · ${p.s === 'ok' ? 'Stocked' : p.s === 'low' ? 'Low stock' : 'Critical'}` })} onMouseLeave={() => setHover(null)}>
            {p.s === 'critical' && <circle cx={p.xy[0]} cy={p.xy[1]} r="4" fill={COL.critical} className="origin-center animate-pulseRing" style={{ transformBox: 'fill-box' }} />}
            <motion.circle cx={p.xy[0]} cy={p.xy[1]} fill={COL[p.s]} stroke="#fff" strokeWidth=".8" initial={{ r: 0 }} animate={{ r: p.s === 'critical' ? 4 : 3 }} transition={{ delay: 0.6 + (i % 60) * 0.012, duration: 0.5, ease }} className="cursor-pointer" />
          </g>
        ))}
        {mode === 'state' && states.map((s, i) => {
          const [x, y] = project(s.lat, s.lng)
          const risk = s.criticalAlerts + s.critical
          const r = 11 + Math.min(16, risk * 0.9)
          const active = activeState === s.name
          return (
            <g key={s.name} className="cursor-pointer" onClick={() => onState?.(s.name)} onMouseEnter={() => setHover({ x, y: y - r, text: `${s.name} · ${s.critical} critical PHCs · ${s.alerts} alerts` })} onMouseLeave={() => setHover(null)}>
              <motion.circle cx={x} cy={y} fill={risk > 8 ? '#D93C3C' : risk > 3 ? '#F29B38' : '#1FA08D'} fillOpacity={active ? 0.5 : 0.22} stroke={active ? '#10201D' : risk > 8 ? '#D93C3C' : '#13675B'} strokeWidth={active ? 2 : 1.2} initial={{ r: 0 }} animate={{ r }} transition={{ delay: 0.5 + i * 0.05, duration: 0.7, ease }} />
              <text x={x} y={y + 3.5} textAnchor="middle" className="pointer-events-none fill-[#10201D] font-mono text-[9.5px] font-semibold">{s.code}</text>
              {s.scenario && <circle cx={x + r * 0.7} cy={y - r * 0.7} r="3.5" fill="#D93C3C" className="animate-pulse" />}
            </g>
          )
        })}
        {hover && (
          <g pointerEvents="none">
            <rect x={Math.min(W - 250, Math.max(4, hover.x - 100))} y={hover.y - 34} width="240" height="24" rx="8" fill="#10201D" />
            <text x={Math.min(W - 250, Math.max(4, hover.x - 100)) + 10} y={hover.y - 18} className="fill-white font-sans text-[11px] font-medium">{hover.text.length > 40 ? hover.text.slice(0, 39) + '…' : hover.text}</text>
          </g>
        )}
      </svg>
    </div>
  )
}
