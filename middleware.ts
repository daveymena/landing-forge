import { NextResponse, type NextRequest } from "next/server";

/* Si LANDING_API_KEY está definido, las escrituras y la IA exigen
   header x-api-key (integración bot) o mismo origen (dashboard). */
const WRITE = new Set(["POST", "PUT", "DELETE"]);

export function middleware(req: NextRequest) {
  const key = process.env.LANDING_API_KEY;
  if (!key) return NextResponse.next();
  const { pathname } = req.nextUrl;
  const needsKey =
    pathname.startsWith("/api/ai/") ||
    (pathname.startsWith("/api/") &&
      !pathname.startsWith("/api/public/") &&
      pathname !== "/api/auth/login" &&
      WRITE.has(req.method));
  if (!needsKey) return NextResponse.next();
  if (req.headers.get("x-api-key") === key) return NextResponse.next();
  const cookie = req.headers.get("cookie") || "";
  if (cookie.includes("lf_session=")) return NextResponse.next();
  const ref = req.headers.get("referer") || "";
  try {
    if (ref && new URL(ref).host === req.nextUrl.host) return NextResponse.next();
  } catch { /* noop */ }
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export const config = { matcher: "/api/:path*" };
