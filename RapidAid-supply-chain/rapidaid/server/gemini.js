// Thin Google Gemini (Generative Language API) client. Key comes from env; every caller has a graceful fallback.
const KEY = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const geminiEnabled = () => Boolean(KEY());
export const geminiModel = () => MODEL();

export async function gemini({ system, prompt, json = false, image, temperature = 0.4, timeoutMs = 25000 }) {
  if (!KEY()) return null;
  const parts = [{ text: prompt }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.data } });
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY() }, body: JSON.stringify(body), signal: ctl.signal,
    });
    if (!res.ok) { console.warn('[gemini] HTTP', res.status, (await res.text()).slice(0, 200)); return null; }
    const j = await res.json();
    const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text) return null;
    if (!json) return text;
    try { return JSON.parse(text.replace(/^```json\s*|```$/g, '')); } catch { console.warn('[gemini] bad JSON'); return null; }
  } catch (e) {
    console.warn('[gemini] failed:', e.message);
    return null;
  } finally { clearTimeout(t); }
}
