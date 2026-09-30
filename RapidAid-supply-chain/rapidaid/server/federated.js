// Real federated averaging (FedAvg) over per-state demand models. Raw PHC records never leave a state:
// each state trains locally and only shares a 5-number weight vector. Data is synthetic + non-IID.
import { mulberry32, GEO } from './data.js';

const FEATURES = ['Rainfall anomaly', 'Temperature anomaly', 'Last-week demand', 'Outbreak signal'];
const TRUE_W = [0.42, 0.25, 0.55, 0.9]; // shared underlying dynamics; states differ in noise, size & distribution
const dot = (w, x) => w[0] * x[0] + w[1] * x[1] + w[2] * x[2] + w[3] * x[3] + w[4];

function gauss(r) { return Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()); }

function makeStateData(idx, name) {
  const r = mulberry32(1000 + idx * 31);
  const nTrain = 7 + Math.floor(r() * 16); // small, uneven local datasets (some states have few reporting PHCs)
  const nTest = 60;
  const shift = (r() - 0.5) * 1.4, noise = 0.35 + r() * 0.5;
  const mk = (n) => Array.from({ length: n }, () => {
    const x = [gauss(r) * 0.8 + shift * (idx % 2 ? 1 : -1), gauss(r) * 0.7 + shift * 0.4, gauss(r) * 0.9 + 0.5, r() < 0.15 ? 1.5 + r() : r() * 0.3];
    const y = dot(TRUE_W.concat([0.1 + shift * 0.15]), x) + gauss(r) * noise;
    return { x, y };
  });
  return { name, train: mk(nTrain), test: mk(nTest) };
}

function localTrain(w0, data, epochs, lr) {
  const w = w0.slice();
  const n = data.length;
  for (let e = 0; e < epochs; e++) {
    const g = [0, 0, 0, 0, 0];
    for (const { x, y } of data) {
      const err = dot(w, x) - y;
      for (let j = 0; j < 4; j++) g[j] += err * x[j];
      g[4] += err;
    }
    for (let j = 0; j < 5; j++) w[j] -= (lr * g[j]) / n + lr * 0.002 * w[j]; // tiny L2
  }
  return w;
}
const rmse = (w, data) => Math.sqrt(data.reduce((s, { x, y }) => s + (dot(w, x) - y) ** 2, 0) / data.length);
const varY = (data) => { const m = data.reduce((s, d) => s + d.y, 0) / data.length; return data.reduce((s, d) => s + (d.y - m) ** 2, 0) / data.length; };
const r2 = (w, data) => 1 - rmse(w, data) ** 2 / varY(data);

export function runFederated({ rounds = 10, localEpochs = 5, dpNoise = 0 } = {}) {
  const R = Math.min(30, Math.max(1, rounds));
  const states = GEO.map((g, i) => makeStateData(i, g[0]));
  const rnd = mulberry32(42);
  let global = [0, 0, 0, 0, 0];
  const history = [];
  const totalN = states.reduce((s, x) => s + x.train.length, 0);

  const local = states.map((s) => localTrain([0, 0, 0, 0, 0], s.train, 400, 0.08)); // isolated baseline, same compute
  const pooled = localTrain([0, 0, 0, 0, 0], states.flatMap((s) => s.train), 400, 0.08); // centralised upper bound (would need raw data pooling)

  const evalAll = (w) => states.reduce((s, st) => s + rmse(w, st.test), 0) / states.length;
  history.push({ round: 0, fedRmse: +evalAll(global).toFixed(4) });
  for (let r = 1; r <= R; r++) {
    const updates = states.map((s) => {
      const w = localTrain(global, s.train, localEpochs, 0.08);
      return dpNoise > 0 ? w.map((v) => v + gauss(rnd) * dpNoise * 0.05) : w; // gaussian noise on shared weights (DP-style)
    });
    global = global.map((_, j) => updates.reduce((s, w, i) => s + w[j] * (states[i].train.length / totalN), 0));
    history.push({ round: r, fedRmse: +evalAll(global).toFixed(4) });
  }
  const localMean = states.reduce((s, st, i) => s + rmse(local[i], st.test), 0) / states.length;
  const pooledMean = evalAll(pooled);
  const per = states.map((s, i) => ({
    state: s.name, samples: s.train.length,
    localRmse: +rmse(local[i], s.test).toFixed(3), fedRmse: +rmse(global, s.test).toFixed(3),
    localR2: +r2(local[i], s.test).toFixed(3), fedR2: +r2(global, s.test).toFixed(3),
  }));
  const improved = per.filter((p) => p.fedRmse < p.localRmse).length;
  return {
    features: FEATURES, rounds: R, localEpochs, dpNoise, algorithm: 'FedAvg (sample-weighted)',
    globalWeights: global.map((v) => +v.toFixed(3)), trueWeights: TRUE_W,
    history: history.map((h) => ({ ...h, localOnly: +localMean.toFixed(4), pooled: +pooledMean.toFixed(4) })),
    perState: per, summary: { fedRmse: history[history.length - 1].fedRmse, localOnlyRmse: +localMean.toFixed(4), pooledRmse: +pooledMean.toFixed(4), statesImproved: improved, states: per.length, bytesSharedPerRound: 5 * 8 * per.length },
    note: 'Simulation on synthetic non-IID data. Only weight vectors are exchanged; in production this runs on Vertex AI with each state\'s data in its own project.',
  };
}
