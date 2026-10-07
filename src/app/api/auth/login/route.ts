import { NextResponse } from "next/server";
import { claveUtil, cookieDeSesion, firmar, igualesSeguro, secretoDeSesion, DURACION_SESION_S } from "@/lib/auth";

/* POST /api/auth/login { email, password }
   Valida contra LANDINGFORGE_EMAIL/LANDINGFORGE_PASSWORD (o ADMIN_EMAIL/
   ADMIN_PASSWORD) y entrega una sesión FIRMADA (lib/auth.ts).
   Antes: sin credenciales en el entorno aceptaba a cualquiera y la cookie
   era un valor al azar que el middleware tomaba como válido. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Freno simple contra adivinar la clave: 8 intentos fallidos por IP cada 15 min.
const fallos = new Map<string, { n: number; desde: number }>();
const VENTANA = 15 * 60_000;

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  const f = fallos.get(ip);
  if (f && Date.now() - f.desde < VENTANA && f.n >= 8) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera 15 minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const wantEmail = String(process.env.LANDINGFORGE_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  // Contraseña: solo de entorno, larga y no quemada (ver lib/auth.ts).
  const wantPass = (await claveUtil(process.env.LANDINGFORGE_PASSWORD)) || (await claveUtil(process.env.ADMIN_PASSWORD));

  if (!(await secretoDeSesion())) {
    return NextResponse.json({ ok: false, error: "El panel no tiene protección configurada (falta LANDING_API_KEY)." }, { status: 503 });
  }
  if (!wantPass) {
    return NextResponse.json({ ok: false, error: "Entra desde el panel de VentasPro (Landing Studio)." }, { status: 401 });
  }
  const ok = igualesSeguro(password, wantPass) && (!wantEmail || igualesSeguro(email, wantEmail));
  if (!ok) {
    const cur = f && Date.now() - f.desde < VENTANA ? f : { n: 0, desde: Date.now() };
    fallos.set(ip, { n: cur.n + 1, desde: cur.desde });
    return NextResponse.json({ ok: false, error: "Correo o contraseña incorrectos." }, { status: 401 });
  }
  fallos.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", cookieDeSesion(await firmar("s", DURACION_SESION_S)));
  return res;
}
