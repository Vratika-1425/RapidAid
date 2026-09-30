// Synthetic-but-realistic national PHC network. Deterministic (seeded) so demos are repeatable.
// Schema mirrors what HMIS / e-Aushadhi / NHM dashboards expose, so real feeds can replace this module.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MEDICINES = [
  { id: 'ors', name: 'ORS sachets', unit: 'sachets', category: 'Diarrhoeal', base: 46, crit: true },
  { id: 'para', name: 'Paracetamol 500mg', unit: 'tablets', category: 'Fever', base: 420, crit: true },
  { id: 'amox', name: 'Amoxicillin 500mg', unit: 'capsules', category: 'Antibiotic', base: 160, crit: true },
  { id: 'metf', name: 'Metformin 500mg', unit: 'tablets', category: 'NCD', base: 260, crit: false },
  { id: 'amlo', name: 'Amlodipine 5mg', unit: 'tablets', category: 'NCD', base: 220, crit: false },
  { id: 'ifa', name: 'Iron-Folic Acid', unit: 'tablets', category: 'Maternal', base: 300, crit: false },
  { id: 'arte', name: 'Artesunate (anti-malarial)', unit: 'doses', category: 'Vector-borne', base: 22, crit: true },
  { id: 'doxy', name: 'Doxycycline 100mg', unit: 'capsules', category: 'Antibiotic', base: 70, crit: false },
  { id: 'asv', name: 'Anti-Snake Venom', unit: 'vials', category: 'Emergency', base: 2.4, crit: true },
  { id: 'arv', name: 'Anti-Rabies Vaccine', unit: 'vials', category: 'Emergency', base: 5.5, crit: true },
];

// [state, code, lat, lng, [ [district, lat, lng, popWeight] ... ]]
export const GEO = [
  ['Maharashtra', 'MH', 19.6, 75.7, [['Pune', 18.52, 73.86, 1.3], ['Nagpur', 21.15, 79.09, 1.0], ['Nashik', 20.0, 73.79, 0.9], ['Thane', 19.2, 72.97, 1.2]]],
  ['Uttar Pradesh', 'UP', 26.8, 80.9, [['Lucknow', 26.85, 80.95, 1.2], ['Varanasi', 25.32, 82.97, 1.1], ['Gorakhpur', 26.76, 83.37, 1.2], ['Agra', 27.18, 78.01, 1.1]]],
  ['Bihar', 'BR', 25.6, 85.6, [['Patna', 25.59, 85.14, 1.3], ['Gaya', 24.8, 85.0, 1.0], ['Muzaffarpur', 26.12, 85.39, 1.2], ['Darbhanga', 26.16, 85.9, 1.1]]],
  ['Tamil Nadu', 'TN', 11.1, 78.6, [['Chennai', 13.08, 80.27, 1.3], ['Madurai', 9.92, 78.12, 1.0], ['Coimbatore', 11.0, 76.96, 1.0], ['Tiruchirappalli', 10.79, 78.7, 0.9]]],
  ['Karnataka', 'KA', 14.8, 75.7, [['Bengaluru Rural', 13.23, 77.57, 0.9], ['Mysuru', 12.3, 76.64, 0.9], ['Belagavi', 15.85, 74.5, 1.0], ['Kalaburagi', 17.33, 76.83, 1.0]]],
  ['West Bengal', 'WB', 23.0, 87.9, [['Howrah', 22.59, 88.31, 1.2], ['Darjeeling', 27.04, 88.26, 0.8], ['Murshidabad', 24.18, 88.27, 1.2], ['Bankura', 23.23, 87.07, 0.9]]],
  ['Rajasthan', 'RJ', 26.9, 74.2, [['Jaipur', 26.91, 75.79, 1.2], ['Jodhpur', 26.29, 73.02, 1.0], ['Udaipur', 24.59, 73.71, 0.9], ['Bikaner', 28.02, 73.31, 0.8]]],
  ['Gujarat', 'GJ', 22.3, 71.6, [['Ahmedabad', 23.02, 72.57, 1.3], ['Surat', 21.17, 72.83, 1.2], ['Rajkot', 22.3, 70.8, 1.0], ['Dahod', 22.83, 74.26, 0.8]]],
  ['Madhya Pradesh', 'MP', 23.5, 78.0, [['Bhopal', 23.26, 77.41, 1.1], ['Indore', 22.72, 75.86, 1.2], ['Rewa', 24.53, 81.3, 0.9], ['Mandla', 22.6, 80.37, 0.7]]],
  ['Odisha', 'OD', 20.5, 84.4, [['Khordha', 20.18, 85.62, 1.0], ['Ganjam', 19.39, 84.68, 1.0], ['Koraput', 18.81, 82.71, 0.8], ['Sundargarh', 22.12, 84.03, 0.8]]],
  ['Assam', 'AS', 26.2, 92.9, [['Kamrup', 26.14, 91.74, 1.1], ['Dibrugarh', 27.47, 94.91, 0.9], ['Cachar', 24.83, 92.78, 0.9], ['Barpeta', 26.32, 91.0, 0.9]]],
  ['Kerala', 'KL', 10.5, 76.3, [['Thiruvananthapuram', 8.52, 76.94, 1.1], ['Ernakulam', 9.98, 76.28, 1.1], ['Kozhikode', 11.25, 75.78, 1.0], ['Wayanad', 11.69, 76.08, 0.6]]],
];

const PHC_SUFFIX = ['Rural', 'Central', 'North', 'East', 'Block', 'Tribal', 'Urban', 'Hill'];
const PHCS_PER_DISTRICT = 5;

export function haversine(a, b) {
  const R = 6371, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function buildNetwork(seed = 2026) {
  const rnd = mulberry32(seed);
  const phcs = [];
  const districts = [];
  const states = [];
  for (const [sName, code, sLat, sLng, dList] of GEO) {
    states.push({ name: sName, code, lat: sLat, lng: sLng });
    for (const [dName, dLat, dLng, w] of dList) {
      const did = `${code}-${dName.replace(/\s+/g, '').slice(0, 4).toUpperCase()}`;
      // Each district has a "supply health" persona so the network has realistic surplus + shortage pockets.
      const persona = rnd();
      const cover = persona < 0.12 ? 0.09 : persona < 0.26 ? 0.3 : persona < 0.55 ? 0.8 : persona < 0.82 ? 1.25 : 2.6; // stress → surplus
      districts.push({ id: did, name: dName, state: sName, code, lat: dLat, lng: dLng, weight: w, persona: cover });
      for (let i = 0; i < PHCS_PER_DISTRICT; i++) {
        const catchment = Math.round((18000 + rnd() * 26000) * w);
        const lat = dLat + (rnd() - 0.5) * 0.7;
        const lng = dLng + (rnd() - 0.5) * 0.7;
        const scale = catchment / 30000;
        const dailyUse = {}, stock = {}, reorder = {};
        for (const m of MEDICINES) {
          const use = Math.max(0.3, m.base * scale * (0.75 + rnd() * 0.5));
          dailyUse[m.id] = use;
          const coverDays = Math.max(0, (18 + rnd() * 26) * cover * (0.6 + rnd() * 0.9));
          stock[m.id] = Math.round(use * coverDays);
          reorder[m.id] = Math.round(use * 14);
        }
        const bedsTotal = 6 + Math.floor(rnd() * 20);
        const sanctioned = 8 + Math.floor(rnd() * 8);
        phcs.push({
          id: `${did}-${String(i + 1).padStart(2, '0')}`,
          name: `${dName} ${PHC_SUFFIX[Math.floor(rnd() * PHC_SUFFIX.length)]} PHC`,
          state: sName, code, district: dName, districtId: did,
          lat: +lat.toFixed(4), lng: +lng.toFixed(4), catchment,
          beds: { total: bedsTotal, occupied: Math.min(bedsTotal, Math.round(bedsTotal * (0.35 + rnd() * 0.6 * (cover < 1 ? 1.25 : 0.8)))) },
          staff: { sanctioned, present: Math.max(2, Math.round(sanctioned * (0.55 + rnd() * 0.45))) },
          footfall: Math.round(catchment / 260 * (0.7 + rnd() * 0.6)),
          lastSync: Date.now(),
          stock, dailyUse, reorder,
        });
      }
    }
  }
  return { phcs, districts, states };
}

const HOSP_KIND = [
  { suffix: 'District Hospital', icu: [4, 14], er: [8, 30], services: ['ICU', 'Trauma', 'Obstetrics', 'Paediatrics'] },
  { suffix: 'Medical College Hospital', icu: [10, 40], er: [20, 60], services: ['ICU', 'Cath Lab', 'Trauma', 'Neurology', 'Obstetrics', 'Paediatrics', 'Burns'] },
];

export function buildHospitals(districts, seed = 77) {
  const rnd = mulberry32(seed);
  const out = [];
  for (const d of districts) {
    HOSP_KIND.forEach((k, idx) => {
      if (idx === 1 && rnd() < 0.35) return;
      const icuTotal = k.icu[0] + Math.floor(rnd() * (k.icu[1] - k.icu[0]));
      const erTotal = k.er[0] + Math.floor(rnd() * (k.er[1] - k.er[0]));
      out.push({
        id: `H-${d.id}-${idx}`, name: `${d.name} ${k.suffix}`, state: d.state, district: d.name,
        lat: +(d.lat + (rnd() - 0.5) * 0.12).toFixed(4), lng: +(d.lng + (rnd() - 0.5) * 0.12).toFixed(4),
        icu: { total: icuTotal, free: Math.floor(icuTotal * rnd() * 0.7) },
        er: { total: erTotal, free: Math.floor(erTotal * rnd() * 0.8) },
        services: k.services.filter(() => rnd() > 0.08), tier: idx === 0 ? 'District' : 'Tertiary',
      });
    });
  }
  return out;
}

export function makeSeedCases(phcs, seed = 5) {
  const rnd = mulberry32(seed);
  const complaints = ['Chest pain, sweating', 'Snake bite, right leg', 'Severe dehydration in child', 'Obstructed labour', 'Road traffic accident', 'High fever with seizures', 'Dog bite, category III'];
  return Array.from({ length: 6 }, (_, i) => {
    const p = phcs[Math.floor(rnd() * phcs.length)];
    return { id: `CASE-${1040 + i}`, phcId: p.id, phc: p.name, state: p.state, complaint: complaints[Math.floor(rnd() * complaints.length)], priority: 1 + Math.floor(rnd() * 3), minutesAgo: 2 + Math.floor(rnd() * 40) };
  });
}
