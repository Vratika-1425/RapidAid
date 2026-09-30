export const fmt = (n: number, d = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: d })
export const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`
export const compact = (n: number) => (n >= 1e7 ? `${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${Math.round(n)}`)
export const days = (n: number) => (n > 60 ? '60+ d' : `${n.toFixed(1)} d`)
export const sevColor = { critical: '#D93C3C', high: '#E8792F', medium: '#D9A21B', low: '#E8792F', ok: '#1FA08D' } as const
export const ago = (t: number) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago` }
