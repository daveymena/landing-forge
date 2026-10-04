import { NextResponse } from "next/server";

/* Compat con el bot: GET /api/landingforge/status */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { resolveProvider } = await import("@/lib/ai/provider");
  const p = await resolveProvider();
  return NextResponse.json({
    ok: true,
    health: { ok: true, db: true, ai: { mock: false, text: p.id, image: "pexels" } },
    url: process.env.PUBLIC_APP_URL || new URL(req.url).origin,
    ai: { provider: p.id, model: p.model, source: p.source },
  });
}