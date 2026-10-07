import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, claveApi, igualesSeguro, secretoDeSesion, verificar } from "./lib/auth";

/* Todo el panel y su API exigen sesión firmada (lib/auth.ts) o la x-api-key
   del bot de VentasPro. Lo único público es lo que ve el CLIENTE FINAL: la
   landing (/l/:slug), sus fotos (/api/img), el formulario de pedido
   (/api/public/*) y la salud del servicio.

   Antes (auditoría 07-10): sin LANDING_API_KEY todo quedaba abierto, y con
   ella se entraba igual mandando Origin del propio sitio o cualquier cookie
   lf_session. Leer /api/sites y /api/export permitía duplicar TODAS las
   landings. */

const PUBLICO = [
  /^\/l\//,
  /^\/api\/public\//,
  /^\/api\/img\//,
  /^\/api\/health$/,
  /^\/api\/auth\//,
  /^\/entrar$/,
  // archivos de /public (fotos de ejemplo que una landing puede usar)
  /^\/[\w./-]+\.(png|jpe?g|webp|gif|svg|ico|mp4|webm|woff2?)$/i,
];

// Next 16 llama "proxy" a lo que antes era middleware, y con carpeta src/ el
// archivo va en src/proxy.ts. El middleware.ts de la raiz NUNCA se ejecuto:
// la proteccion vieja no estuvo activa ni un dia (verificado 07-10 en local).
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLICO.some((re) => re.test(pathname))) return NextResponse.next();

  const secreto = secretoDeSesion();
  // Sin secreto no hay con qué firmar: modo abierto, como antes del cambio.
  // Se avisa en cada respuesta para que se note en los registros.
  if (!secreto) {
    const r = NextResponse.next();
    r.headers.set("x-lf-aviso", "panel-sin-proteccion: configura LANDING_API_KEY");
    return r;
  }

  const clave = req.headers.get("x-api-key") || "";
  const apiKey = claveApi();
  if (apiKey && clave && igualesSeguro(clave, apiKey)) return NextResponse.next();
  if (await verificar(req.cookies.get(COOKIE)?.value, "s", secreto)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado: inicia sesión en el panel." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Todo menos los archivos estáticos del propio Next y los íconos.
  matcher: ["/((?!_next/|favicon|icon\\.svg|manifest\\.json|robots\\.txt).*)"],
};
