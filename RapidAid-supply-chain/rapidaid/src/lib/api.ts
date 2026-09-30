import { useCallback, useEffect, useRef, useState } from 'react'

export const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export async function api<T = any>(path: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: opts?.method ?? (opts?.body ? 'POST' : 'GET'),
    headers: opts?.body ? { 'content-type': 'application/json' } : undefined,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data as T
}

/** Fetch + optional polling. Keeps last good data while refreshing so the UI never flashes. */
export function useApi<T = any>(path: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const alive = useRef(true)
  const load = useCallback(async () => {
    if (!path) return
    try {
      const d = await api<T>(path)
      if (alive.current) { setData(d); setError(null) }
    } catch (e) {
      if (alive.current) setError((e as Error).message)
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [path])
  useEffect(() => {
    alive.current = true
    setLoading(true)
    load()
    const t = intervalMs ? setInterval(load, intervalMs) : undefined
    const onRefresh = () => load()
    window.addEventListener('rapidaid:refresh', onRefresh)
    return () => { alive.current = false; if (t) clearInterval(t); window.removeEventListener('rapidaid:refresh', onRefresh) }
  }, [load, intervalMs])
  return { data, error, loading, reload: load }
}

export interface Summary {
  phcs: number; states: number; districts: number; footfallToday: number
  bedsTotal: number; bedsFree: number; bedOccupancy: number
  staffSanctioned: number; staffPresent: number; attendance: number
  critical: number; low: number; healthy: number; activeAlerts: number; criticalAlerts: number
  scenarios: { id: string; type: string; state: string; label: string }[]
}
export interface StateRow { name: string; code: string; lat: number; lng: number; phcs: number; critical: number; low: number; bedOccupancy: number; attendance: number; alerts: number; criticalAlerts: number; scenario: string | null }
export interface Alert { id: string; districtId: string; district: string; state: string; medId: string; medicine: string; unit: string; severity: 'critical' | 'high' | 'medium'; coverDays: number; stock: number; dailyDemand: number; shortfall21: number; phcsAtZero: number; phcsTotal: number; stockoutDate: string; lat: number; lng: number }
export interface Transfer { id: string; medId: string; medicine: string; unit: string; qty: number; from: Loc; to: Loc; km: number; transitDays: number; crossState: boolean; coverBefore: number; coverAfter: number; urgency: 'critical' | 'high' | 'medium'; arrivesBeforeStockout: boolean; donorCoverAfter: number }
export interface Loc { id: string; district: string; state: string; lat: number; lng: number }
export interface Meta { states: string[]; districts: { id: string; name: string; state: string }[]; medicines: { id: string; name: string; unit: string; category: string; crit: boolean }[]; scenarios: { id: string; label: string }[] }
export interface MapPoint { id: string; lat: number; lng: number; s: 'ok' | 'low' | 'critical'; n: string; st: string }
export interface Phc { id: string; name: string; state: string; district: string; districtId: string; lat: number; lng: number; catchment: number; beds: { total: number; occupied: number }; staff: { sanctioned: number; present: number }; footfall: number; status: 'ok' | 'low' | 'critical'; minCover: number; stock: { medId: string; medicine: string; unit: string; qty: number; daily: number; cover: number }[] }
export interface EventItem { id: number; t: number; level: 'info' | 'warn' | 'critical' | 'ok'; title: string; detail: string }

export const refreshAll = () => window.dispatchEvent(new Event('rapidaid:refresh'))
