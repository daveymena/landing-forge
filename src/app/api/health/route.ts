import { NextResponse } from "next/server";

/* Compat con el bot: el cliente viejo consulta GET /api/health
   y espera { ok: true, db: true, ai: {...}, storage: {...} }. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let db = true;
  let dbError: string | null = null;
  try {
    const { listSites } = await import("@/lib/db");
    await listSites();
  } catch (e: any) {
    db = false;
    dbError = String(e?.message || e);
  }

  let provider = { id: "none" };
  try {
    const { resolveProvider } = await import("@/lib/ai/provider");
    provider = await resolveProvider();
  } catch { /* noop */ }

  return NextResponse.json({
    ok: true,
    db,
    dbError,
    ai: {
      mock: false,
      image: "pexels",
      text: provider.id,
      keys: { groq: !!process.env.GROQ_API_KEY, deepseek: !!process.env.DEEPSEEK_API_KEY },
    },
    storage: { driver: "db", path: "/app/data" },
    url: process.env.PUBLIC_APP_URL || "",
    time: new Date().toISOString(),
  });
}