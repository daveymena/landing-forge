import { NextResponse } from "next/server";
import { extractFromUrl } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Límite simple por IP: analizar URLs es caro y no queremos que la app
 *  se use como scraper masivo desde fuera. */
const hits = new Map<string, number[]>();
function allowed(ip: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length <= max;
}

/** POST { url } → datos del producto listos para generar la landing */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) {
    return NextResponse.json({ ok: false, error: "Demasiadas peticiones. Espera un minuto." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const url = String(body?.url || "").trim();
  if (!url) return NextResponse.json({ ok: false, error: "Falta la URL." }, { status: 400 });

  const t0 = Date.now();
  try {
    if (body?.mode === "browser") {
      const { extractWithBrowser } = await import("@/lib/extract/browser");
      const result = await extractWithBrowser(url);
      return NextResponse.json({ ok: true, ...result, ms: Date.now() - t0 });
    }
    const result = await extractFromUrl(url);
    return NextResponse.json({ ok: true, ...result, ms: Date.now() - t0 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), ms: Date.now() - t0 },
      { status: 422 },
    );
  }
}
