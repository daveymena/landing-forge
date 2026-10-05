/* ------------------------------------------------------------------ *
 * OJOS del cerebro visual: un modelo con VISION elige la foto que
 * mejor encaja con cada espacio (qwen2.5vl:7b local por defecto;
 * configurable con VISION_MODEL=gemma4:31b-cloud para usar Gemma 4).
 * Si el VL no responde, se usa la primera candidata (sin bloquear).
 * ------------------------------------------------------------------ */

const OLLAMA = (process.env.OLLAMA_URL || "http://tecnoia_ollama:11434").replace(/\/+$/, "");
const MODEL = process.env.VISION_MODEL || "qwen2.5vl:7b";

export function visionOn(): boolean {
  return process.env.VISION_PICK !== "false";
}

async function download(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 2_500_000) return null;
    return buf.toString("base64");
  } catch {
    return null;
  }
}

/**
 * Elige con visión la mejor de las candidatas para `question`.
 * Devuelve la URL elegida, la primera si el VL no responde,
 * o null si el VL dice que NINGUNA sirve (→ generar con OpenAI).
 */
export async function visionPick(candidates: string[], question: string): Promise<string | null> {
  const cands = [...new Set(candidates)].slice(0, 3);
  if (!cands.length) return null;
  if (cands.length === 1 || !visionOn()) return cands[0];
  try {
    const dl = await Promise.all(cands.map(download));
    const imgs: string[] = [];
    const urls: string[] = [];
    dl.forEach((b, i) => {
      if (b) {
        imgs.push(b);
        urls.push(cands[i]);
      }
    });
    if (imgs.length < 2) return cands[0];
    const r = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: `Hay ${imgs.length} fotos en orden del 1 al ${imgs.length}. Cual encaja mejor con esto: ${question}. Responde SOLO con el numero (1-${imgs.length}), o 0 si ninguna sirve.`,
            images: imgs,
          },
        ],
        stream: false,
        options: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return cands[0];
    const j: any = await r.json();
    const n = parseInt(String(j.message?.content || "").match(/\d+/)?.[0] || "0", 10);
    if (n >= 1 && n <= urls.length) return urls[n - 1];
    if (n === 0) return null;
    return cands[0];
  } catch {
    return cands[0];
  }
}
