/* ------------------------------------------------------------------ *
 *  Sesión del panel de Landing Forge.
 *
 *  Auditoría 07-10: en producción cualquiera podía leer, descargar y borrar
 *  TODAS las landings, cambiar la IA y su clave y gastar créditos generando
 *  (POST /api/settings sin credenciales → 200). El control viejo confiaba en
 *  el encabezado Origin (lo manda el propio navegador de cualquier visitante)
 *  y aceptaba CUALQUIER cookie lf_session.
 *
 *  Ahora la sesión es un token FIRMADO con HMAC-SHA256 que solo el servidor
 *  puede emitir. Funciona igual en el middleware (edge) y en las rutas (node):
 *  los dos tienen Web Crypto.
 * ------------------------------------------------------------------ */

const enc = new TextEncoder();

/* Ninguna clave vive en el código (pedido del dueño 07-10: "que no quede
   escritas en el repo"): solo en las variables de entorno de EasyPanel.
   Las que alguna vez se subieron al repo quedan QUEMADAS: aunque alguien las
   configure, se ignoran, porque cualquiera con el historial las conoce. Se
   guardan como huella SHA-256, no en claro. */
const QUEMADAS = new Set([
  "d27a3e4f3f32f509b8c31607d48ae08f7b2244f7712b8bf38d166988b4037c06", // clave API genérica (5902b6f)
  "49b330b0b095b785d9010bf2c9ea22ae2040cb590f4ef34c72ba00751a7a3069", // contraseña genérica (5902b6f)
]);

async function huella(v: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(v));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Una clave de entorno sirve si existe, es larga y no está quemada. */
export async function claveUtil(v: string | undefined): Promise<string> {
  const c = String(v || "").trim();
  if (c.length < 16) return "";
  return QUEMADAS.has(await huella(c)) ? "" : c;
}

export async function claveApi(): Promise<string> {
  return claveUtil(process.env.LANDING_API_KEY);
}

/** Secreto de firma de las sesiones. Sin él, el panel queda en modo abierto
 *  (como antes del 07-10) y el proxy lo avisa en cada respuesta. */
export async function secretoDeSesion(): Promise<string> {
  return (await claveUtil(process.env.LF_SESSION_SECRET)) || (await claveApi());
}

async function hmacHex(secreto: string, dato: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign("HMAC", key, enc.encode(dato));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparación en tiempo constante (no revela cuántos caracteres coinciden). */
export function igualesSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const COOKIE = "lf_session";
export const DURACION_SESION_S = 60 * 60 * 24 * 14; // 14 días

/** prefijo "s" = sesión del panel; "sso" = enlace de un solo uso desde VentasPro. */
export async function firmar(tipo: "s" | "sso", segundos: number, secretoDado?: string): Promise<string> {
  const secreto = secretoDado ?? (await secretoDeSesion());
  const exp = Math.floor(Date.now() / 1000) + segundos;
  return `${tipo}.${exp}.${await hmacHex(secreto, `${tipo}.${exp}`)}`;
}

export async function verificar(token: string | undefined | null, tipo: "s" | "sso", secretoDado?: string): Promise<boolean> {
  const secreto = secretoDado ?? (await secretoDeSesion());
  if (!token || !secreto) return false;
  const [t, expS, firma] = String(token).split(".");
  if (t !== tipo || !/^\d{9,12}$/.test(expS || "") || !/^[0-9a-f]{64}$/.test(firma || "")) return false;
  if (Number(expS) < Math.floor(Date.now() / 1000)) return false;
  return igualesSeguro(firma, await hmacHex(secreto, `${tipo}.${expS}`));
}

export function cookieDeSesion(token: string, maxAge = DURACION_SESION_S): string {
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${seguro}`;
}
