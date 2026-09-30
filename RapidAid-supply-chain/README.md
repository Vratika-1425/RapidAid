# RapidAid — Federated AI for India's PHC Supply Chain

Real-time visibility of **medicine stock, bed availability and staff attendance** across Primary Health Centres, with **Gemini-powered** demand forecasting, stock-out early warnings, and **automated cross-district redistribution**. Includes the original RapidAid emergency-response (SOS) flow as a module.

## What the prototype does (end to end)

| Track requirement | Where it lives |
|---|---|
| Real-time stock / beds / staff across PHCs | **Command** and **Stock** tabs (240 PHCs, 12 states, 48 districts, live-updating) |
| Forecast demand | **Forecast** tab: damped-trend + weekly-seasonal model per district and medicine, with 80% band |
| Early warnings for health emergencies | Scenario simulator (dengue, flood, heatwave, malaria) reshapes forecasts; **Early warnings** list ranks stock-outs by days of cover |
| Recommend cross-district redistribution | **Redistribute** tab: donor/recipient matching by distance, arrival-before-stock-out check, one-tap dispatch that updates the network |
| Shared predictive modelling across states | **Federated AI** tab: real FedAvg over 12 state models; only weights are shared |
| Google AI | Gemini: situation briefs, multilingual assistant, emergency triage, stock-register photo extraction (vision) |
| Multilingual / voice | English, Hindi, Tamil, Telugu, Kannada, Bengali, Marathi; browser speech in/out (Cloud STT/TTS ready) |

## Run locally

```bash
cd rapidaid
pnpm install
cp .env.example .env        # add GEMINI_API_KEY (optional; fallbacks work without it)
pnpm run server &           # API on :8080 (needs the env var exported, e.g. GEMINI_API_KEY=... pnpm run server)
pnpm run dev                # UI on :3000, proxies /api to :8080
```

Or one process: `pnpm run build && pnpm start` then open http://localhost:8080.

## Verify frontend ↔ backend wiring

```bash
node scripts/verify-endpoints.mjs                       # local
node scripts/verify-endpoints.mjs https://YOUR-CLOUD-RUN-URL
```

It checks the bundle, every API route the UI calls, Gemini status, and SPA routing.

## Deploy to Cloud Run (one container serves UI + API)

```bash
cd rapidaid
gcloud run deploy rapidaid --source . --region asia-south1 --allow-unauthenticated \
  --set-env-vars GEMINI_MODEL=gemini-2.5-flash \
  --set-secrets GEMINI_API_KEY=gemini-key:latest
node scripts/verify-endpoints.mjs $(gcloud run services describe rapidaid --region asia-south1 --format='value(status.url)')
```

Store the key with `gcloud secrets create gemini-key --data-file=-`. For Firebase Hosting in front, add a rewrite `"/api/**"` → Cloud Run service `rapidaid`, so the frontend and backend stay same-origin.

## Honest notes for judges

- Data is **synthetic but realistic** (seeded, deterministic) in the shape of HMIS / e-Aushadhi feeds; `server/data.js` is the single module to replace with real feeds (BigQuery).
- Federated learning runs on synthetic non-IID state data; the algorithm (FedAvg) is real, and states never exchange records.
- Without a Gemini key, every AI feature falls back to a rule-based engine and is labelled "Offline engine" in the UI; with a key it is labelled "Gemini".
- Not a medical device. In an emergency in India call 112 / 108.

## Structure

```
rapidaid/
├── server/    Express API: data.js, engine.js (forecast, alerts, redistribution), federated.js, gemini.js, index.js
├── src/       React + Tailwind + Framer Motion + Recharts UI (views/ per tab)
├── scripts/   verify-endpoints.mjs
└── Dockerfile
```
