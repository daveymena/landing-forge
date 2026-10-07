import { NextResponse } from "next/server";
import { cookieDeSesion, firmar, verificar, DURACION_SESION_S } from "@/lib/auth";

/* GET /api/auth/sso?t=<token>&next=/ruta
   Entrada desde el panel de VentasPro (botón Landing Studio): VentasPro firma
   un token corto con la MISMA LANDING_API_KEY (lib/landingforge-client.ts,
   enlaceDeEntradaForge) y el dueño entra sin escribir otra contraseña. El
   token vence en 2 minutos: un enlace copiado o filtrado no sirve después. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const t = u.searchParams.get("t");
  const next = u.searchParams.get("next") || "/";
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const base = process.env.PUBLIC_APP_URL || u.origin;
  if (!(await verificar(t, "sso"))) {
    return NextResponse.redirect(new URL(`/entrar?error=enlace&next=${encodeURIComponent(destino)}`, base));
  }
  const res = NextResponse.redirect(new URL(destino, base));
  res.headers.append("Set-Cookie", cookieDeSesion(await firmar("s", DURACION_SESION_S)));
  return res;
}
