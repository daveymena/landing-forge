/* ------------------------------------------------------------------ *
 *  Extracción de producto a partir de una URL.
 *
 *  Estrategia en cascada, de más fiable a más adivinatoria:
 *    1. JSON-LD (schema.org/Product)  ← lo usan Shopify, WooCommerce, IKEA…
 *    2. Microdata itemprop
 *    3. Open Graph / Twitter / meta estándar
 *    4. Heurísticas sobre el HTML (h1, regex de precio, <img> grandes)
 *
 *  Cada campo recuerda de dónde salió (`sources`), para que la UI pueda
 *  avisar «esto lo adiviné» y el usuario lo corrija antes de generar.
 *
 *  Sin dependencias: nada de cheerio ni jsdom.
 * ------------------------------------------------------------------ */

export interface ExtractedProduct {
  name: string;
  description: string;
  price: number;
  compareAtPrice: number;
  currency: string;
  images: string[];
  /** videos directos (.mp4, og:video, <source>) para hero VSL / bloque video */
  videos: string[];
  bullets: string[];
  brand: string;
  sku: string;
  rating: number;
  ratingCount: number;
  availability: string;
  /** de dónde salió cada campo: "json-ld" | "microdata" | "meta" | "html" */
  sources: Record<string, string>;
  url: string;
  host: string;
}

export interface ExtractResult {
  product: ExtractedProduct;
  warnings: string[];
  /** confianza 0-1, para decidir si pedirle al usuario que revise */
  confidence: number;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MAX_BYTES = 4_000_000;
const TIMEOUT_MS = 20_000;

/* ----------------------------- utilidades ----------------------------- */

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  hellip: "…", eacute: "é", aacute: "á", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü", euro: "€",
};

export function decodeEntities(s: string): string {
  const once = (t: string) =>
    t
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);
  // algunas tiendas escapan dos veces dentro del JSON-LD: "&amp;amp;"
  let out = once(String(s || ""));
  if (/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(out)) out = once(out);
  return out;
}

function clean(s: unknown): string {
  return decodeEntities(String(s ?? ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convierte "1.234,56", "1,234.56", "$189.000 COP" o 189000 en número. */
export function toNumber(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  let s = String(raw ?? "").replace(/[^\d.,]/g, "");
  if (!s) return 0;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot >= 0 && lastComma >= 0) {
    // el separador decimal es el que aparece más a la derecha
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // "189,00" → decimal ; "189,000" → millar
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (lastDot >= 0) {
    // "189.000" con 3 decimales es casi siempre separador de millar (LATAM)
    if (/\.\d{3}$/.test(s) && !/\.\d{3}\./.test(s)) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function absolute(src: string, base: string): string {
  try {
    return new URL(src, base).href;
  } catch {
    return "";
  }
}

/* ------------------------------- descarga ------------------------------- */

/** Rechaza destinos internos: la app corre en la máquina del usuario y no
 *  debe convertirse en un proxy hacia su red local. */
function assertPublicUrl(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("Solo se admiten URLs http(s).");
  const h = u.hostname.toLowerCase();
  const isLocal =
    h === "localhost" ||
    h === "0.0.0.0" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === "[::1]" ||
    h === "::1";
  if (isLocal) throw new Error("Esa dirección es de tu red local, no una tienda pública.");
}

export async function fetchHtml(rawUrl: string): Promise<{ html: string; finalUrl: string }> {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    throw new Error("La URL no es válida.");
  }
  assertPublicUrl(u);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(u.href, {
      redirect: "follow",
      signal: ctl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      const hint =
        res.status === 403 || res.status === 503
          ? " La tienda bloquea el acceso automático (Cloudflare o similar). Copia los datos a mano o prueba otra URL."
          : "";
      throw new Error(`La página respondió ${res.status}.${hint}`);
    }
    const type = res.headers.get("content-type") || "";
    if (!/html|xml|text/i.test(type)) throw new Error(`Esa URL no es una página web (${type || "desconocido"}).`);

    // leemos acotado para no comernos la RAM con páginas gigantes
    const reader = res.body?.getReader();
    if (!reader) return { html: await res.text(), finalUrl: res.url || u.href };
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    reader.cancel().catch(() => {});
    const buf = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      buf.set(c.subarray(0, Math.min(c.length, total - at)), at);
      at += c.length;
      if (at >= total) break;
    }
    return { html: new TextDecoder("utf-8").decode(buf), finalUrl: res.url || u.href };
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("La página tardó demasiado en responder.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------- parseo ------------------------------- */

function metaContent(html: string, keys: string[]): string {
  for (const k of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)\\s*=\\s*["']${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
      "i",
    );
    const tag = html.match(re)?.[0];
    if (tag) {
      const c = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
      if (c && c.trim()) return decodeEntities(c.trim());
    }
  }
  return "";
}

function jsonLdBlocks(html: string): any[] {
  const out: any[] = [];
  const re = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim().replace(/^\uFEFF/, "");
    try {
      out.push(JSON.parse(raw));
    } catch {
      // algunos CMS meten comentarios o comas colgantes
      try {
        out.push(JSON.parse(raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/,\s*([}\]])/g, "$1")));
      } catch {
        /* se ignora el bloque roto */
      }
    }
  }
  return out;
}

function findProductNode(nodes: any[]): any | null {
  const queue = [...nodes];
  const isProduct = (t: any) =>
    (Array.isArray(t) ? t : [t]).some((x) => /^(product|productgroup|book|vehicle|offer)$/i.test(String(x || "")));
  while (queue.length) {
    const n = queue.shift();
    if (!n || typeof n !== "object") continue;
    if (Array.isArray(n)) {
      queue.push(...n);
      continue;
    }
    if (n["@type"] && isProduct(n["@type"])) return n;
    if (n["@graph"]) queue.push(n["@graph"]);
    for (const v of Object.values(n)) if (v && typeof v === "object") queue.push(v);
  }
  return null;
}

function offersOf(node: any): any {
  const o = node?.offers;
  if (!o) return null;
  if (Array.isArray(o)) return o[0] || null;
  if (o["@type"] === "AggregateOffer") return { ...o, price: o.lowPrice ?? o.price ?? o.highPrice };
  return o;
}

/** Descarta logos, iconos, sprites, píxeles de tracking y placeholders. */
function usableImage(src: string): boolean {
  if (!src || src.startsWith("data:")) return false;
  if (/\.svg($|\?)/i.test(src)) return false;
  return !/(sprite|logo|icon|favicon|placeholder|pixel|blank|loader|spinner|badge|payment|visa|mastercard|paypal|flag|avatar|1x1)/i.test(
    src,
  );
}

/**
 * Recorta el HTML justo antes de secciones de "otros productos"
 * (related / upsells / recomendaciones): esas fotos NO son del producto.
 */
function productScope(html: string): string {
  const re = new RegExp(
    String.raw`<(?:section|div|ul|aside)\b[^>]*(?:class|id)\s*=\s*["'][^"']*(?:related|upsell|cross-?sell|recommend|also-viewed|also-bought|otros-productos|productos-relacionados)[^"']*["']|<(?:h2|h3)\b[^>]*>\s*(?:Related|You may also|Otros productos|Productos relacionados|Tambi[eé]n te|Tambien te|Customers also)`,
    "i",
  );
  const m = re.exec(html);
  return m && m.index > 800 ? html.slice(0, m.index) : html;
}

function collectImages(html: string, base: string, fromLd: string[]): string[] {
  // Prioridad: ficha estructurada (0) > OpenGraph (1) > <img> de la ficha (2).
  const cands: Array<{ url: string; pri: number; w: number; gal: number; slug: number }> = [];
  const seen = new Set<string>();
  const push = (s: string, pri: number, w = 0, gal = 0) => {
    const abs = absolute(decodeEntities(s).trim(), base);
    if (!abs || !usableImage(abs) || seen.has(abs)) return;
    seen.add(abs);
    cands.push({ url: abs, pri, w, gal, slug: 0 });
  };

  fromLd.forEach((s) => push(s, 0));

  const og = html.matchAll(/<meta[^>]+property\s*=\s*["']og:image(?::secure_url)?["'][^>]*>/gi);
  for (const t of og) {
    const c = t[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (c) push(c, 1);
  }

  // <img>: SOLO dentro de la ficha (corta antes de relacionados/upsells).
  const scoped = productScope(html);
  const galRanges = [...scoped.matchAll(/woocommerce-product-gallery|product-gallery|product__media|gallery-main|product-media|zoomWrapper/ig)].map((m) => m.index);
  const imgs = scoped.matchAll(/<img\b[^>]*>/gi);
  for (const t of imgs) {
    const tag = t[0];
    const pos = t.index || 0;
    const w = Number(tag.match(/\bwidth\s*=\s*["']?(\d+)/i)?.[1] || 0);
    const h = Number(tag.match(/\bheight\s*=\s*["']?(\d+)/i)?.[1] || 0);
    if ((w && w < 200) || (h && h < 200)) continue;
    const gal = galRanges.some((g) => g <= pos && pos - g < 4000) ? 1 : 0;
    const srcset = tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) {
      const parts = srcset.split(",").map((p) => p.trim().split(/\s+/));
      const withW = parts.map(([u, d]) => ({ u, w: parseInt(d || "0") || 0 })).filter((x) => x.u);
      withW.sort((a, b) => b.w - a.w);
      if (withW[0]) push(withW[0].u, 2, withW[0].w, gal);
    }
    const src =
      tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bdata-src\s*=\s*["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bdata-lazy-src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) push(src, 2, w, gal);
    if (cands.length > 40) break;
  }

  // Bonus: el archivo contiene el slug del producto → es foto de ESTE producto.
  const slug = base.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() || "";
  if (slug.length >= 4) {
    const s = slug.toLowerCase();
    for (const c of cands) if (c.url.toLowerCase().includes(s)) c.slug = 1;
  }

  cands.sort((a, b) => a.pri - b.pri || b.gal - a.gal || b.slug - a.slug || b.w - a.w);

  // Deduplica la MISMA foto en varias resoluciones (-350x350, -1024x1024...):
  // por clave base nos quedamos con la version original/grande.
  const best = new Map<string, { url: string; size: number }>();
  for (const c of cands) {
    const k = c.url.replace(/[-_]\d+x\d+(?=\.\w+$)/i, "");
    const size = /[-_]\d+x\d+(?=\.\w+$)/i.test(c.url) ? 1 : 0;
    const cur = best.get(k);
    if (!cur || size < cur.size) best.set(k, { url: c.url, size });
  }
  return [...best.values()].slice(0, 12).map((c) => c.url);
}
/** Videos utilizables: og:video, twitter player/stream, <video>/<source>, .mp4 sueltos. */
function collectVideos(html: string, base: string): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    const abs = absolute(decodeEntities(s).trim(), base);
    if (abs && /^https?:/i.test(abs) && !out.includes(abs)) out.push(abs);
  };
  for (const re of [
    /<meta[^>]+property\s*=\s*["']og:video(?::secure_url)?["'][^>]*>/gi,
    /<meta[^>]+(?:name|property)\s*=\s*["']twitter:player:stream["'][^>]*>/gi,
  ]) {
    for (const t of html.matchAll(re)) {
      const c = t[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
      if (c) push(c);
    }
  }
  for (const t of html.matchAll(/<(?:video|source)\b[^>]*>/gi)) {
    const c = t[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (c && /\.(mp4|webm|mov)(\?|$)/i.test(c)) push(c);
  }
  for (const m of html.matchAll(/["'](https?:[^"']+\.(?:mp4|webm)(?:\?[^"']*)?)["']/gi)) {
    if (/player|embed|ads|promo/i.test(m[1])) continue;
    push(m[1]);
    if (out.length >= 6) break;
  }
  return out.slice(0, 3);
}

/** Precio por heurística: busca símbolo de moneda + número en el HTML visible. */
function guessPrice(html: string): { price: number; currency: string } {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(body).replace(/\s+/g, " ");
  const re = /(US\$|COP|MXN|ARS|CLP|PEN|EUR|USD|R\$|\$|€|£)\s?([\d][\d.,]{1,12})/gi;
  const found: { n: number; cur: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && found.length < 40) {
    const n = toNumber(m[2]);
    if (n > 0) found.push({ n, cur: m[1].toUpperCase().replace("R$", "BRL").replace("US$", "USD") });
  }
  if (!found.length) return { price: 0, currency: "" };
  // el precio de venta suele ser el valor más repetido; si hay empate, el mayor
  const counts = new Map<number, number>();
  found.forEach((f) => counts.set(f.n, (counts.get(f.n) || 0) + 1));
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const cur = found.find((f) => f.n === best)?.cur || "";
  const symbol: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP" };
  return { price: best, currency: symbol[cur] || cur };
}

const TLD_CURRENCY: Record<string, string> = {
  co: "COP", mx: "MXN", ar: "ARS", cl: "CLP", pe: "PEN", br: "BRL", uy: "UYU", ec: "USD",
  es: "EUR", de: "EUR", fr: "EUR", it: "EUR", pt: "EUR", uk: "GBP", us: "USD", ca: "CAD",
};

/** Si el precio vino sin moneda, miramos qué símbolo lo acompaña en el texto
 *  y, como último recurso, deducimos por el dominio. */
function guessCurrency(html: string, price: number, host: string): string {
  const text = decodeEntities(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");

  const codes = text.match(/\b(COP|MXN|ARS|CLP|PEN|BRL|USD|EUR|GBP|CAD)\b/);
  const near = new RegExp(
    `(US\\$|R\\$|COP|MXN|ARS|CLP|PEN|USD|EUR|GBP|\\$|€|£)\\s?${String(price).replace(".", "[.,]")}`,
    "i",
  );
  const hit = text.match(near)?.[1]?.toUpperCase();
  const symbol: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "US$": "USD", "R$": "BRL" };
  if (hit) return symbol[hit] || hit;
  if (codes) return codes[1].toUpperCase();

  const tld = host.split(".").pop() || "";
  const sub = host.split(".").slice(-2)[0];
  return TLD_CURRENCY[tld] || (tld === "com" && TLD_CURRENCY[sub] ? TLD_CURRENCY[sub] : "") || "";
}

function guessBullets(html: string): string[] {
  const out: string[] = [];
  const NOISE =
    /cookie|iniciar sesi|crear cuenta|carrito|pol[ií]tica|t[ée]rminos|privacidad|env[ií]os? y devoluc|sign in|log in|cart|newsletter|suscr[ií]b|men[uú]|idioma|moneda|copyright|todos los derechos/i;

  const take = (chunk: string) => {
    for (const li of chunk.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
      if (/<(?:ul|ol|nav|form)\b/i.test(li[1])) continue; // listas anidadas = navegación
      const t = clean(li[1]);
      if (t.length >= 12 && t.length <= 180 && !NOISE.test(t) && /[a-záéíóúñ]{4}/i.test(t) && !out.includes(t)) {
        out.push(t);
      }
      if (out.length >= 8) return;
    }
  };

  // 1) listas que se declaran de descripción/características
  const zones = html.match(
    /<(?:ul|ol)\b[^>]*(?:class|id)\s*=\s*["'][^"']*(desc|feature|caracter|benef|spec|detail|highlight|bullet|atribut)[^"']*["'][\s\S]{0,6000}?<\/(?:ul|ol)>/gi,
  );
  if (zones) take(zones.join("\n"));

  // 2) si no hubo suerte, cualquier <ul> del cuerpo que parezca contenido
  if (out.length < 3) {
    const body = html.replace(/<(?:nav|header|footer|script|style)[\s\S]*?<\/(?:nav|header|footer|script|style)>/gi, " ");
    for (const ul of body.matchAll(/<ul\b[^>]*>[\s\S]{0,6000}?<\/ul>/gi)) {
      const items = ul[0].match(/<li\b/gi)?.length || 0;
      if (items >= 3 && items <= 12) take(ul[0]);
      if (out.length >= 5) break;
    }
  }
  return out.slice(0, 8);
}

export function parseProduct(html: string, url: string): ExtractResult {
  const warnings: string[] = [];
  const sources: Record<string, string> = {};
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  const ld = findProductNode(jsonLdBlocks(html));
  const offer = offersOf(ld);

  /* --- nombre --- */
  let name = "";
  if (ld?.name) (name = clean(ld.name)), (sources.name = "json-ld");
  if (!name) {
    const og = metaContent(html, ["og:title", "twitter:title"]);
    if (og) (name = clean(og)), (sources.name = "meta");
  }
  if (!name) {
    const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    if (h1) (name = clean(h1)), (sources.name = "html");
  }
  if (!name) {
    const t = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    if (t) (name = clean(t).split(/\s[|–—-]\s/)[0], (sources.name = "html"));
  }
  // los <title> suelen traer " | Tienda" pegado
  name = name.replace(/\s*[|–—]\s*[^|–—]{0,40}$/, "").trim().slice(0, 120);

  /* --- descripción --- */
  let description = "";
  if (ld?.description) (description = clean(ld.description)), (sources.description = "json-ld");
  if (!description) {
    const d = metaContent(html, ["og:description", "description", "twitter:description"]);
    if (d) (description = clean(d)), (sources.description = "meta");
  }
  description = description.slice(0, 600);

  /* --- precio --- */
  let price = 0;
  let currency = "";
  let compareAtPrice = 0;
  if (offer) {
    price = toNumber(offer.price ?? offer.lowPrice);
    currency = String(offer.priceCurrency || offer.currency || "").toUpperCase();
    if (price) sources.price = "json-ld";
  }
  if (!price) {
    const mp = metaContent(html, ["product:price:amount", "og:price:amount", "twitter:data1"]);
    const mc = metaContent(html, ["product:price:currency", "og:price:currency"]);
    if (mp) {
      price = toNumber(mp);
      currency = currency || mc.toUpperCase();
      if (price) sources.price = "meta";
    }
  }
  if (!price) {
    const g = guessPrice(html);
    price = g.price;
    currency = currency || g.currency;
    if (price) {
      sources.price = "html";
      warnings.push("El precio lo deduje del texto de la página: confírmalo antes de publicar.");
    }
  }
  // precio tachado: debe ser mayor que el precio pero dentro de un rango creíble,
  // si no acabamos metiendo un id de producto o un precio en centavos (IKEA: 16213)
  const cmp = html.match(
    /(?:compare[_-]?at|list[_-]?price|was|antes|precio[_\s-]?normal|regular[_-]?price)[^\d]{0,40}([\d][\d.,]{2,12})/i,
  );
  if (cmp && price) {
    const n = toNumber(cmp[1]);
    if (n > price && n <= price * 5) (compareAtPrice = n), (sources.compareAtPrice = "html");
  }

  if (!currency && price) currency = guessCurrency(html, price, host);

  /* --- imágenes --- */
  const ldImgs: string[] = [];
  const im = ld?.image;
  if (typeof im === "string") ldImgs.push(im);
  else if (Array.isArray(im)) im.forEach((x: any) => ldImgs.push(typeof x === "string" ? x : x?.url || ""));
  else if (im?.url) ldImgs.push(im.url);
  const images = collectImages(html, url, ldImgs.filter(Boolean));
  if (images.length) sources.images = ldImgs.length ? "json-ld" : "html";
  if (!images.length) warnings.push("No encontré imágenes utilizables; tendrás que subirlas o pegar sus URLs.");

  const videos = collectVideos(html, url);
  if (videos.length) sources.videos = "html";
  if (/aliexpress|alibaba|1688/.test(host)) {
    warnings.push("AliExpress/Alibaba bloquea la descarga directa (anti-bot): si faltan fotos o el video, pega las URLs de imagen a mano o importa desde la página del proveedor en Dropi.");
  }

  /* --- extras --- */
  const brand = clean(typeof ld?.brand === "string" ? ld.brand : ld?.brand?.name || "") || host.split(".")[0];
  const sku = clean(ld?.sku || ld?.mpn || ld?.gtin13 || "");
  const rating = Number(ld?.aggregateRating?.ratingValue || 0) || 0;
  const ratingCount = Number(ld?.aggregateRating?.reviewCount || ld?.aggregateRating?.ratingCount || 0) || 0;
  const availability = String(offer?.availability || "").replace(/^https?:\/\/schema\.org\//, "");

  let bullets: string[] = [];
  if (Array.isArray(ld?.additionalProperty)) {
    bullets = ld.additionalProperty
      .map((p: any) => clean([p?.name, p?.value].filter(Boolean).join(": ")))
      .filter(Boolean)
      .slice(0, 8);
    if (bullets.length) sources.bullets = "json-ld";
  }
  if (!bullets.length) {
    bullets = guessBullets(html);
    if (bullets.length) sources.bullets = "html";
  }

  if (!name) warnings.push("No pude identificar el nombre del producto.");
  if (!price) warnings.push("No encontré el precio: ponlo a mano antes de generar.");

  // confianza: cuánto vino de fuentes fiables
  const weights: Record<string, number> = { "json-ld": 1, microdata: 0.9, meta: 0.75, html: 0.4 };
  const keys = ["name", "price", "images", "description"];
  const confidence =
    keys.reduce((a, k) => a + (weights[sources[k]] ?? 0), 0) / keys.length;

  return {
    product: {
      name,
      description,
      price,
      compareAtPrice,
      currency: currency || "",
      images,
      videos,
      bullets,
      brand,
      sku,
      rating,
      ratingCount,
      availability,
      sources,
      url,
      host,
    },
    warnings,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/** Descarga y analiza en un paso. */
export async function extractFromUrl(url: string): Promise<ExtractResult> {
  const { html, finalUrl } = await fetchHtml(url);
  return parseProduct(html, finalUrl);
}
