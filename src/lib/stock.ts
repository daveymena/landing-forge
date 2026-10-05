import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/* ------------------------------------------------------------------ *
 * Primitivas de imagen. Quien decide QUÉ va en cada espacio es el
 * cerebro visual (lib/visual-brain.ts); acá solo se ejecuta:
 *  - searchStock(query)  → foto real de Pexels/Pixabay (gratis)
 *  - generateImage(p)    → gpt-image-1-mini crea la escena (OpenAI)
 *  - enhanceImage(url,p) → OpenAI re-estiliza una foto existente
 * Las tres devuelven URLs públicas (CDN externo o /api/img/<id>).
 * ------------------------------------------------------------------ */

export type StockKind = "portrait" | "scene";

export interface StockRequest {
  kind: StockKind;
  query?: string;
  keywords?: string[];
  count?: number;
}

const DATA_IMG = path.join(process.cwd(), "data", "img");

function base(): string {
  return (process.env.PUBLIC_APP_URL || "").replace(/\/+$/, "");
}

function stockChain(): string[] {
  const chain = (process.env.IMAGE_STOCK || "pexels,pixabay")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return chain.length ? chain : ["pexels"];
}

async function saveB64(b64: string): Promise<string> {
  await fs.mkdir(DATA_IMG, { recursive: true });
  const id = randomBytes(8).toString("hex");
  await fs.writeFile(path.join(DATA_IMG, `${id}.png`), Buffer.from(b64, "base64"));
  return `${base()}/api/img/${id}`;
}

async function pexels(q: string, kind: StockKind, used: Set<string>): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const ori = kind === "portrait" ? "&orientation=portrait" : "";
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=10${ori}`;
    const r = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const j: any = await r.json();
    const hit = (j.photos || []).find((p: any) => !used.has(p.src?.large2x) && !used.has(p.src?.original));
    return hit?.src?.large2x || hit?.src?.original || null;
  } catch {
    return null;
  }
}

async function pixabay(q: string, used: Set<string>): Promise<string | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const url = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}&image_type=photo&per_page=10&safesearch=true`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const j: any = await r.json();
    const hit = (j.hits || []).find((h: any) => !used.has(h.largeImageURL) && !used.has(h.webformatURL));
    return hit?.largeImageURL || hit?.webformatURL || null;
  } catch {
    return null;
  }
}

/** Busca una foto real con el texto EXACTO que dio el agente. */
export async function searchStock(query: string, kind: StockKind, used = new Set<string>()): Promise<string | null> {
  const q = String(query || "").trim().slice(0, 160);
  if (!q) return null;
  for (const p of stockChain()) {
    const got = p === "pixabay" ? (await pixabay(q, used)) : (await pexels(q, kind, used));
    if (got) return got;
  }
  return null;
}

/** Genera una imagen desde cero con el prompt EXACTO del agente. */
export async function generateImage(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !prompt) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini",
        prompt: String(prompt).slice(0, 900),
        size: "1024x1024",
        n: 1,
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    const b64 = j.data?.[0]?.b64_json;
    return b64 ? await saveB64(b64) : null;
  } catch {
    return null;
  }
}

/** Re-estiliza una foto existente con el prompt EXACTO del agente. */
export async function enhanceImage(url: string, prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !url) return url;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return url;
    const type = resp.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await resp.arrayBuffer());
    const fd = new FormData();
    fd.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini");
    fd.append("image", new Blob([new Uint8Array(buf)], { type }), "photo");
    fd.append("prompt", String(prompt || "Clean premium restyle, natural light, no text").slice(0, 900));
    fd.append("size", "1024x1024");
    fd.append("n", "1");
    const r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
      signal: AbortSignal.timeout(75000),
    });
    if (!r.ok) return url;
    const j: any = await r.json();
    const b64 = j.data?.[0]?.b64_json;
    return b64 ? await saveB64(b64) : url;
  } catch {
    return url;
  }
}

function queries(req: StockRequest): string[] {
  if (req.query) return [req.query];
  const kw = (req.keywords || []).filter(Boolean).slice(0, 4);
  if (req.kind === "portrait") {
    const faces = ["smiling woman portrait", "happy man portrait", "young person smiling face", "customer portrait smiling"];
    return faces.map((f, i) => (kw[i % Math.max(1, kw.length)] ? `${f} ${kw[i % kw.length]}` : f));
  }
  const scenes = ["person using smartphone happy", "lifestyle photo happy customer", "woman using phone indoors", "man smiling with phone"];
  return scenes.map((s, i) => (kw[0] ? `${s} ${kw[0]}` : s));
}

/** Versión automática genérica (fallback si el cerebro visual no responde). */
export async function stockImages(req: StockRequest): Promise<string[]> {
  const count = Math.max(1, Math.min(8, req.count || 1));
  const used = new Set<string>();
  const out: string[] = [];
  const qs = queries(req);
  for (let i = 0; i < count; i++) {
    const got = await searchStock(qs[i % qs.length], req.kind, used);
    if (got && !used.has(got)) {
      used.add(got);
      out.push(got);
    }
  }
  if (out.length && process.env.OPENAI_ENHANCE !== "false" && process.env.OPENAI_API_KEY) {
    const prompt =
      req.kind === "portrait"
        ? "Restyle: clean premium studio portrait of ONE single person, natural realistic skin, soft neutral background, no animals, no products, no text"
        : "Restyle: clean premium lifestyle photo of ONE single person, everyday setting, product NOT visible, soft light, no animals, no text";
    return await Promise.all(out.map((u) => enhanceImage(u, prompt)));
  }
  return out;
}

/** Fallback: rellena avatares/UGC sin pasar por el agente. */
export async function fillSectionImages(spec: any): Promise<void> {
  try {
    const blocks: any[] = Array.isArray(spec?.blocks) ? spec.blocks : [];
    const kw = [spec?.product?.name].filter(Boolean).map((s: string) => String(s).toLowerCase().slice(0, 24));
    const portraits = blocks.filter((b) => b?.type === "testimonials").flatMap((b) => (Array.isArray(b.props?.items) ? b.props.items : []));
    const missingP = portraits.filter((it: any) => it && !it.avatar);
    if (missingP.length) {
      const urls = await stockImages({ kind: "portrait", count: missingP.length, keywords: kw });
      urls.forEach((u, i) => { missingP[i].avatar = u; });
    }
    const ugc = blocks.filter((b) => b?.type === "reviewsUgc").flatMap((b) => (Array.isArray(b.props?.items) ? b.props.items : []));
    const missingS = ugc.filter((it: any) => it && !it.image);
    if (missingS.length) {
      const urls = await stockImages({ kind: "scene", count: missingS.length, keywords: kw });
      urls.forEach((u, i) => { missingS[i].image = u; });
    }
  } catch {
    /* el fallback también es best-effort */
  }
}
