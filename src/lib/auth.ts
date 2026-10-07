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

/** Valores GENÉRICOS (pedido del dueño 07-10: "colócalas genéricas y luego
 *  las cambio"). Con ellos el panel queda protegido desde el primer deploy;
 *  las variables de entorno, cuando existan, mandan. La MISMA clave por
 *  defecto está en VentasPro (lib/landingforge-client.ts). CAMBIARLAS en
 *  EasyPanel: LANDING_API_KEY (igual en los dos) y LANDINGFORGE_PASSWORD. */
export const CLAVE_API_GENERICA = "vpf-generica-cambiar-7Qk2Lm9Xz4Rt";
export const CLAVE_PANEL_GENERICA = "VentasPro-Forge-2026";

export function claveApi(): string {
  return String(process.env.LANDING_API_KEY || CLAVE_API_GENERICA).trim();
}

/** Secreto de firma de las sesiones. */
export function secretoDeSesion(): string {
  return String(process.env.LF_SESSION_SECRET || claveApi()).trim();
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
export async function firmar(tipo: "s" | "sso", segundos: number, secreto = secretoDeSesion()): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + segundos;
  return `${tipo}.${exp}.${await hmacHex(secreto, `${tipo}.${exp}`)}`;
}

export async function verificar(token: string | undefined | null, tipo: "s" | "sso", secreto = secretoDeSesion()): Promise<boolean> {
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
