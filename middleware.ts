import { NextResponse, type NextRequest } from "next/server";

/* Si LANDING_API_KEY esta definido, las escrituras y la IA exigen
   header x-api-key (integracion bot), cookie de sesion o mismo origen
   (dashboard en el navegador: Origin/Referer contra el Host recibido). */
const WRITE = new Set(["POST", "PUT", "DELETE"]);

function hostOf(value: string): string {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return "";
  }
}

function sameOrigin(req: NextRequest): boolean {
  // Host tal como lo ve la app (respeta X-Forwarded-Host de Traefik).
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase() ||
    req.headers.get("host")?.split(",")[0]?.trim().toLowerCase() ||
    "";
  if (!host) return false;
  const bare = host.split(":")[0];
  for (const c of [req.headers.get("origin") || "", req.headers.get("referer") || ""]) {
    if (!c) continue;
    const h = hostOf(c);
    if (!h) continue;
    if (h === host || h.split(":")[0] === bare) return true;
  }
  // Respaldo: dominio publico configurado (por si un proxy limpia headers).
  const pub = (process.env.PUBLIC_APP_URL || "").trim();
  if (pub) {
    const ph = hostOf(pub);
    if (ph && (ph === host || ph.split(":")[0] === bare)) return true;
  }
  return false;
}

export function middleware(req: NextRequest) {
  const key = process.env.LANDING_API_KEY;
  if (!key) return NextResponse.next();
  const { pathname } = req.nextUrl;
  // /api/extract es de solo lectura (analiza una URL publica) y ya tiene su
  // propio limitador por IP; pedirle auth lo rompia en el editor al pegar una URL.
  const needsKey =
    pathname.startsWith("/api/ai/") ||
    (pathname.startsWith("/api/") &&
      !pathname.startsWith("/api/public/") &&
      pathname !== "/api/auth/login" &&
      pathname !== "/api/extract" &&
      WRITE.has(req.method));
  if (!needsKey) return NextResponse.next();
  if (req.headers.get("x-api-key") === key) return NextResponse.next();
  const cookie = req.headers.get("cookie") || "";
  if (cookie.includes("lf_session=")) return NextResponse.next();
  if (sameOrigin(req)) return NextResponse.next();
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export const config = { matcher: "/api/:path*" };
