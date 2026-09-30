import { MEDICINES, buildNetwork, buildHospitals, makeSeedCases, haversine, mulberry32 } from './data.js';

const MED = Object.fromEntries(MEDICINES.map((m) => [m.id, m]));
const SEAS = [1.06, 1.12, 1.02, 0.98, 1.0, 0.94, 0.88];

export const SCENARIOS = {
  dengue: { label: 'Dengue surge', mult: { para: 2.6, ors: 1.5, amox: 1.1 } },
  flood: { label: 'Monsoon flooding', mult: { ors: 2.8, doxy: 3.0, amox: 1.7, asv: 2.2, para: 1.4 } },
  heatwave: { label: 'Heatwave', mult: { ors: 3.0, para: 1.5 } },
  malaria: { label: 'Malaria outbreak', mult: { arte: 3.4, para: 1.8 } },
};

let net, hospitals, cases, scenarios, events, tickCount;

export function resetWorld() {
  net = buildNetwork();
  hospitals = buildHospitals(net.districts);
  cases = makeSeedCases(net.phcs);
  scenarios = [];
  events = [];
  tickCount = 0;
  pushEvent('info', 'Network online', `${net.phcs.length} PHCs across ${net.states.length} states synced.`);
}
resetWorld();

export const world = () => ({ net, hospitals, cases, scenarios, events });

export function pushEvent(level, title, detail) {
  events.unshift({ id: Date.now() + Math.random(), t: Date.now(), level, title, detail });
  events.length = Math.min(events.length, 60);
}

function rampOf(s) { return Math.min(1, (s.headStart + tickCount * 0.012) / 5); }
export function effUse(phc, medId) {
  let m = 1;
  for (const s of scenarios) {
    if (s.state !== phc.state) continue;
    const full = SCENARIOS[s.type].mult[medId];
    if (full) m *= 1 + (full - 1) * rampOf(s);
  }
  return phc.dailyUse[medId] * m;
}

// Live simulation tick: consumption + footfall + occasional supply arrivals.
export function tick() {
  tickCount++;
  const rnd = mulberry32(tickCount * 9973);
  for (const p of net.phcs) {
    for (const m of MEDICINES) {
      const use = effUse(p, m.id) * 0.012 * (0.6 + rnd() * 0.8);
      p.stock[m.id] = Math.max(0, p.stock[m.id] - use);
    }
    if (rnd() < 0.5) p.footfall += Math.floor(rnd() * 3);
    if (rnd() < 0.04) p.beds.occupied = Math.max(0, Math.min(p.beds.total, p.beds.occupied + (rnd() < 0.5 ? -1 : 1)));
    if (rnd() < 0.03) p.staff.present = Math.max(1, Math.min(p.staff.sanctioned, p.staff.present + (rnd() < 0.5 ? -1 : 1)));
    p.lastSync = Date.now();
  }
  if (tickCount % 6 === 0) {
    const a = alerts().filter((x) => x.severity === 'critical')[0];
    if (a && !events.some((e) => e.key === a.id && Date.now() - e.t < 60000)) {
      events.unshift({ id: Date.now(), key: a.id, t: Date.now(), level: 'critical', title: `Stock-out risk: ${a.medicine}`, detail: `${a.district}, ${a.state} — ${a.coverDays.toFixed(1)} days of cover left.` });
    }
  }
}

export function startScenario(type, state) {
  if (!SCENARIOS[type]) throw new Error('unknown scenario');
  if (!net.states.find((s) => s.name === state)) throw new Error('unknown state');
  scenarios = scenarios.filter((s) => !(s.type === type && s.state === state));
  scenarios.push({ id: `${type}-${state}`, type, state, label: SCENARIOS[type].label, startedAt: Date.now(), headStart: 1.5 });
  pushEvent('warn', `${SCENARIOS[type].label} declared in ${state}`, 'Demand model re-weighted; forecasts and alerts recomputed.');
}
export function clearScenarios() { scenarios = []; pushEvent('info', 'Scenarios cleared', 'Demand reverted to baseline.'); }

// ---------- aggregation ----------
const sum = (a) => a.reduce((x, y) => x + y, 0);
const groupBy = (arr, f) => arr.reduce((m, x) => ((m[f(x)] ||= []).push(x), m), {});

export function phcStatus(p) {
  let worst = 99;
  for (const m of MEDICINES) if (m.crit) worst = Math.min(worst, p.stock[m.id] / Math.max(0.1, effUse(p, m.id)));
  return worst < 3 ? 'critical' : worst < 7 ? 'low' : 'ok';
}

export function summary(stateFilter) {
  const list = stateFilter ? net.phcs.filter((p) => p.state === stateFilter) : net.phcs;
  const statuses = list.map(phcStatus);
  const beds = sum(list.map((p) => p.beds.total)), occ = sum(list.map((p) => p.beds.occupied));
  const sanc = sum(list.map((p) => p.staff.sanctioned)), pres = sum(list.map((p) => p.staff.present));
  const al = alerts().filter((a) => !stateFilter || a.state === stateFilter);
  return {
    phcs: list.length, states: stateFilter ? 1 : net.states.length, districts: new Set(list.map((p) => p.districtId)).size,
    footfallToday: sum(list.map((p) => p.footfall)),
    bedsTotal: beds, bedsFree: beds - occ, bedOccupancy: beds ? occ / beds : 0,
    staffSanctioned: sanc, staffPresent: pres, attendance: sanc ? pres / sanc : 0,
    critical: statuses.filter((s) => s === 'critical').length, low: statuses.filter((s) => s === 'low').length, healthy: statuses.filter((s) => s === 'ok').length,
    activeAlerts: al.length, criticalAlerts: al.filter((a) => a.severity === 'critical').length,
    scenarios: scenarios.map((s) => ({ id: s.id, type: s.type, state: s.state, label: s.label })),
  };
}

export function stateRollup() {
  return net.states.map((s) => {
    const list = net.phcs.filter((p) => p.state === s.name);
    const st = list.map(phcStatus);
    const al = alerts().filter((a) => a.state === s.name);
    return {
      ...s, phcs: list.length,
      critical: st.filter((x) => x === 'critical').length, low: st.filter((x) => x === 'low').length,
      bedOccupancy: sum(list.map((p) => p.beds.occupied)) / sum(list.map((p) => p.beds.total)),
      attendance: sum(list.map((p) => p.staff.present)) / sum(list.map((p) => p.staff.sanctioned)),
      alerts: al.length, criticalAlerts: al.filter((a) => a.severity === 'critical').length,
      scenario: scenarios.find((x) => x.state === s.name)?.label || null,
    };
  });
}

// ---------- forecasting ----------
function hashSeed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// 28-day history (deterministic) + 14-day forecast using damped-trend + weekly seasonality (Holt-Winters style).
export function forecastSeries(phcs, medId, key) {
  const rnd = mulberry32(hashSeed(key + medId));
  const baseNow = sum(phcs.map((p) => p.dailyUse[medId]));
  const scen = scenarios.filter((s) => phcs[0] && s.state === phcs[0].state && SCENARIOS[s.type].mult[medId]);
  const scenFull = scen.reduce((m, s) => m * SCENARIOS[s.type].mult[medId], 1);
  const ramp = scen.length ? Math.max(...scen.map(rampOf)) : 0;
  const HIST = 28, H = 14;
  const hist = [];
  for (let d = 0; d < HIST; d++) {
    const age = HIST - 1 - d; // days ago
    let f = 1 + 0.0025 * (d - HIST);
    // outbreak signal appears in the last ~5 days of history
    if (scen.length && age < 6) f *= 1 + (scenFull - 1) * ramp * (1 - age / 6) * 0.85;
    const v = baseNow * f * SEAS[d % 7] * (0.94 + rnd() * 0.12);
    hist.push(Math.max(0, v));
  }
  // deseasonalise and fit
  const des = hist.map((v, i) => v / SEAS[i % 7]);
  const level = sum(des.slice(-7)) / 7;
  const slope = (sum(des.slice(-7)) / 7 - sum(des.slice(-14, -7)) / 7) / 7;
  const resid = hist.slice(-14).map((v, i) => v - (level - slope * (14 - i)) * SEAS[(HIST - 14 + i) % 7]);
  const sigma = Math.sqrt(sum(resid.map((r) => r * r)) / resid.length);
  const fc = [];
  const phi = 0.9;
  let damp = 0;
  for (let h = 1; h <= H; h++) {
    damp += Math.pow(phi, h);
    // Early-warning uplift: forward-looking outbreak trajectory (what the emergency signal adds beyond raw history)
    const uplift = scen.length ? (1 + (scenFull - 1) * Math.min(1, ramp + h * 0.06) * 0.85) / (1 + (scenFull - 1) * ramp * 0.85) : 1;
    const v = Math.max(0, (level + slope * damp) * SEAS[(HIST + h - 1) % 7] * Math.max(1, uplift));
    const band = 1.28 * sigma * Math.sqrt(h) * 0.5;
    fc.push({ value: v, lo: Math.max(0, v - band), hi: v + band });
  }
  return { history: hist, forecast: fc, sigma };
}

function stockOutDay(stock, fc) {
  let cum = 0;
  for (let i = 0; i < fc.length; i++) { cum += fc[i].value; if (cum >= stock) return i + (stock - (cum - fc[i].value)) / Math.max(1e-6, fc[i].value); }
  const avg = fc.slice(-4).reduce((a, b) => a + b.value, 0) / 4;
  return fc.length + (stock - cum) / Math.max(1e-6, avg);
}

export function districtList() {
  const g = groupBy(net.phcs, (p) => p.districtId);
  return net.districts.map((d) => ({ ...d, phcs: g[d.id] }));
}

let alertCache = { tick: -1, data: [] };
export function alerts() {
  if (alertCache.tick === tickCount && alertCache.n === scenarios.length) return alertCache.data;
  const out = [];
  for (const d of districtList()) {
    for (const m of MEDICINES) {
      const stock = sum(d.phcs.map((p) => p.stock[m.id]));
      const { forecast } = forecastSeries(d.phcs, m.id, d.id);
      const cover = stockOutDay(stock, forecast);
      const avg = sum(forecast.map((f) => f.value)) / forecast.length;
      const sev = cover < 3 ? 'critical' : cover < 7 ? 'high' : cover < 14 ? 'medium' : null;
      if (!sev) continue;
      const zero = d.phcs.filter((p) => p.stock[m.id] < 1).length;
      out.push({
        id: `${d.id}:${m.id}`, districtId: d.id, district: d.name, state: d.state, medId: m.id, medicine: m.name, unit: m.unit,
        severity: sev, coverDays: cover, stock: Math.round(stock), dailyDemand: Math.round(avg * 10) / 10,
        shortfall21: Math.max(0, Math.round(avg * 21 - stock)), phcsAtZero: zero, phcsTotal: d.phcs.length,
        critical: m.crit, stockoutDate: new Date(Date.now() + cover * 86400000).toISOString(),
        lat: d.lat, lng: d.lng,
      });
    }
  }
  const rank = { critical: 0, high: 1, medium: 2 };
  out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.coverDays - b.coverDays);
  alertCache = { tick: tickCount, n: scenarios.length, data: out };
  return out;
}

export function forecastFor({ medId, state, districtId }) {
  const m = MED[medId];
  if (!m) throw new Error('unknown medicine');
  let list = net.phcs, key = 'IN', label = 'India';
  if (districtId) { list = net.phcs.filter((p) => p.districtId === districtId); key = districtId; label = list[0]?.district; }
  else if (state) { list = net.phcs.filter((p) => p.state === state); key = state; label = state; }
  if (!list.length) throw new Error('no phcs');
  // national view forecasts each state and sums for coherence
  let history, forecast;
  if (key === 'IN') {
    const parts = net.states.map((s) => forecastSeries(net.phcs.filter((p) => p.state === s.name), medId, s.name));
    history = parts[0].history.map((_, i) => sum(parts.map((p) => p.history[i])));
    forecast = parts[0].forecast.map((_, i) => ({ value: sum(parts.map((p) => p.forecast[i].value)), lo: sum(parts.map((p) => p.forecast[i].lo)), hi: sum(parts.map((p) => p.forecast[i].hi)) }));
  } else ({ history, forecast } = forecastSeries(list, medId, key));
  const stock = sum(list.map((p) => p.stock[medId]));
  const cover = stockOutDay(stock, forecast);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const series = [
    ...history.map((v, i) => ({ day: new Date(+today - (history.length - i) * 86400000).toISOString().slice(5, 10), actual: Math.round(v) })),
    ...forecast.map((f, i) => ({ day: new Date(+today + i * 86400000).toISOString().slice(5, 10), forecast: Math.round(f.value), lo: Math.round(f.lo), hi: Math.round(f.hi) })),
  ];
  return { medId, medicine: m.name, unit: m.unit, scope: label, stock: Math.round(stock), coverDays: cover, avgForecast: Math.round(sum(forecast.map((f) => f.value)) / forecast.length), series, phcs: list.length,
    activeScenario: scenarios.find((s) => (!state && !districtId) || s.state === (state || list[0].state))?.label || null };
}

// ---------- redistribution ----------
export function redistribution() {
  const plans = [];
  const al = alerts();
  const dl = districtList();
  const dMap = Object.fromEntries(dl.map((d) => [d.id, d]));
  for (const m of MEDICINES) {
    const info = dl.map((d) => {
      const stock = sum(d.phcs.map((p) => p.stock[m.id]));
      const { forecast } = forecastSeries(d.phcs, m.id, d.id);
      const dem = sum(forecast.map((f) => f.value)) / forecast.length;
      return { d, stock, dem, cover: stockOutDay(stock, forecast) };
    });
    const surplus = info.filter((x) => x.cover > 32).map((x) => ({ ...x, avail: Math.floor(x.stock - x.dem * 28) })).filter((x) => x.avail > 0);
    const deficit = info.filter((x) => x.cover < 10).sort((a, b) => a.cover - b.cover);
    for (const need of deficit) {
      let remaining = Math.ceil(need.dem * 21 - need.stock);
      const cands = surplus.map((s) => ({ s, km: haversine(s.d, need.d) })).filter((c) => c.s.avail > 0).sort((a, b) => a.km - b.km);
      for (const { s, km } of cands) {
        if (remaining <= 0) break;
        const qty = Math.min(remaining, s.avail);
        if (qty < Math.max(5, need.dem * 1.5)) continue;
        s.avail -= qty; remaining -= qty;
        const transit = Math.max(0.5, km / 450 + 0.5);
        plans.push({
          id: `${s.d.id}>${need.d.id}:${m.id}`, medId: m.id, medicine: m.name, unit: m.unit, qty,
          from: { id: s.d.id, district: s.d.name, state: s.d.state, lat: s.d.lat, lng: s.d.lng },
          to: { id: need.d.id, district: need.d.name, state: need.d.state, lat: need.d.lat, lng: need.d.lng },
          km: Math.round(km), transitDays: +transit.toFixed(1), crossState: s.d.state !== need.d.state,
          coverBefore: +need.cover.toFixed(1), coverAfter: +((need.stock + qty) / Math.max(0.01, need.dem)).toFixed(1),
          urgency: need.cover < 3 ? 'critical' : need.cover < 7 ? 'high' : 'medium', arrivesBeforeStockout: transit < need.cover,
          donorCoverAfter: +((s.stock - qty) / Math.max(0.01, s.dem)).toFixed(1),
        });
      }
    }
  }
  const rank = { critical: 0, high: 1, medium: 2 };
  plans.sort((a, b) => rank[a.urgency] - rank[b.urgency] || a.coverBefore - b.coverBefore);
  const top = plans.slice(0, 40);
  return {
    generatedAt: Date.now(), count: top.length, crossState: top.filter((p) => p.crossState).length,
    districtsRescued: new Set(top.map((p) => p.to.id)).size, alertsOpen: al.length, transfers: top,
    unitsMoved: sum(top.map((p) => p.qty)), avgKm: top.length ? Math.round(sum(top.map((p) => p.km)) / top.length) : 0, dMapSize: Object.keys(dMap).length,
  };
}

export function executeTransfer({ medId, fromId, toId, qty }) {
  const src = net.phcs.filter((p) => p.districtId === fromId);
  const dst = net.phcs.filter((p) => p.districtId === toId);
  if (!src.length || !dst.length || !MED[medId]) throw new Error('invalid transfer');
  const have = sum(src.map((p) => p.stock[medId]));
  if (qty > have) throw new Error('donor district lacks stock');
  const tot = have || 1;
  for (const p of src) p.stock[medId] -= qty * (p.stock[medId] / tot);
  const need = sum(dst.map((p) => 1 / (1 + p.stock[medId] / Math.max(0.1, effUse(p, medId)))));
  for (const p of dst) p.stock[medId] += qty * ((1 / (1 + p.stock[medId] / Math.max(0.1, effUse(p, medId)))) / need);
  alertCache = { tick: -1, data: [] };
  const a = net.districts.find((d) => d.id === fromId), b = net.districts.find((d) => d.id === toId);
  pushEvent('ok', `Transfer dispatched: ${MED[medId].name}`, `${qty.toLocaleString('en-IN')} ${MED[medId].unit} ${a.name} → ${b.name}.`);
  return { ok: true };
}

// ---------- PHC detail ----------
export function phcList({ state, districtId, status, q, limit = 60 } = {}) {
  let list = net.phcs;
  if (state) list = list.filter((p) => p.state === state);
  if (districtId) list = list.filter((p) => p.districtId === districtId);
  if (q) list = list.filter((p) => (p.name + p.district + p.state).toLowerCase().includes(q.toLowerCase()));
  const mapped = list.map((p) => ({ ...p, status: phcStatus(p), minCover: Math.min(...MEDICINES.filter((m) => m.crit).map((m) => p.stock[m.id] / Math.max(0.1, effUse(p, m.id)))) }));
  const f = status ? mapped.filter((p) => p.status === status) : mapped;
  f.sort((a, b) => a.minCover - b.minCover);
  return { total: f.length, items: f.slice(0, limit).map(shapePhc) };
}
export function shapePhc(p) {
  return {
    id: p.id, name: p.name, state: p.state, district: p.district, districtId: p.districtId, lat: p.lat, lng: p.lng, catchment: p.catchment,
    beds: p.beds, staff: p.staff, footfall: p.footfall, status: p.status || phcStatus(p), minCover: p.minCover,
    stock: MEDICINES.map((m) => ({ medId: m.id, medicine: m.name, unit: m.unit, qty: Math.round(p.stock[m.id]), daily: +effUse(p, m.id).toFixed(1), cover: +(p.stock[m.id] / Math.max(0.1, effUse(p, m.id))).toFixed(1) })),
  };
}
export function mapPoints() {
  return net.phcs.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, s: phcStatus(p), n: p.name, st: p.code }));
}
export function applyScan(phcId, items) {
  const p = net.phcs.find((x) => x.id === phcId);
  if (!p) throw new Error('unknown PHC');
  let n = 0;
  for (const it of items) { if (MED[it.medId] && Number.isFinite(it.qty)) { p.stock[it.medId] = Math.max(0, it.qty); n++; } }
  alertCache = { tick: -1, data: [] };
  pushEvent('ok', 'Stock register digitised', `${n} line items updated at ${p.name}.`);
  return n;
}
export { MEDICINES };
