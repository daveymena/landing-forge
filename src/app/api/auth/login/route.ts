import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/* Compat con el bot: POST /api/auth/login
   Valida contra LANDINGFORGE_EMAIL/LANDINGFORGE_PASSWORD (env) o acepta también
   x-api-key y devuelve cookie lf_session dummy para el cliente del bot. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const password = String(body.password || "").trim();

  const wantEmail = String(process.env.LANDINGFORGE_EMAIL || process.env.ADMIN_EMAIL || "").trim();
  const wantPass = String(process.env.LANDINGFORGE_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();

  if (wantEmail && wantPass && (email !== wantEmail || password !== wantPass)) {
    return NextResponse.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = `bot.${Date.now()}.${Math.random().toString(36).slice(2, 12)}`;
  const res = NextResponse.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `lf_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  );
  return res;
}