import type { PageSpec, Block } from "../schema";
import { money } from "./blocks";

/* ------------------------------------------------------------------ *
 *  Pulido antes de pintar: lo que una landing de contraentrega NO puede
 *  llevar al aire, venga del LLM, del extractor o de una edicion vieja.
 *  Corre en cada render (editor y /l/:slug), asi que arregla tambien las
 *  landings ya publicadas sin regenerarlas. Casos reales que lo motivan
 *  (06-10, auditoria en movil):
 *   - corrector-zxf-25: galeria con src "," -> imagen rota + hueco blanco.
 *   - almohadacabezabebe: la galeria era la MISMA foto en _1083x, _1024x1024,
 *     http y https; dos contadores con relojes y stock distintos; anuncio
 *     con "84900 COP" crudo; paquetes a $144.330 / $216.495.
 *   - las dos: boton pastel (#f5b68a, #dbc59a) con texto negro, el CTA no
 *     se distingue del fondo.
 * ------------------------------------------------------------------ */

const IMG_OK = /^(https?:\/\/[^\s,"'<>]+\.[^\s,"'<>]+|data:image\/[a-z+]+;base64,|\/api\/img\/[\w-]+)/i;

export function imagenValida(u: unknown): u is string {
  return typeof u === "string" && IMG_OK.test(u.trim());
}

/** Misma foto aunque cambie el tamano, el protocolo, la consulta o el
 *  formato: Shopify (_1024x1024, _1083x), WordPress (-300x300), CDNs (?w=). */
export function claveImagen(u: string): string {
  let k = u.trim().toLowerCase();
  if (k.startsWith("data:")) return k.slice(0, 120) + k.length;
  k = k.replace(/^https?:\/\//, "").replace(/[?#].*$/, "");
  k = k.replace(/\.(jpe?g|png|webp|gif|avif)$/, "");
  k = k.replace(/(_\d+x\d*|_\d*x\d+|-\d+x\d+|@\dx)$/, "");
  return k.replace(/\.(jpe?g|png|webp|gif|avif)$/, "");
}

function unicas(urls: unknown[], excluir = new Set<string>()): string[] {
  const vistas = new Set(excluir);
  const out: string[] = [];
  for (const u of urls) {
    if (!imagenValida(u)) continue;
    const k = claveImagen(u);
    if (vistas.has(k)) continue;
    vistas.add(k);
    out.push(u.trim());
  }
  return out;
}

/* ------------------------------ color ------------------------------ */

function hexRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminancia([r, g, b]: [number, number, number]): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function rgbHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

/** El boton de compra tiene que leerse con texto blanco (contraste AA 4.5:1).
 *  Un acento pastel se oscurece conservando el tono de la marca. */
export function acentoQueVende(accent: string): { accent: string; accentFg: string } | null {
  const rgb = hexRgb(accent);
  if (!rgb) return null;
  if ((1.05) / (luminancia(rgb) + 0.05) >= 4.5) return null; // ya contrasta con blanco
  const [h, s0] = rgbHsl(rgb);
  const s = s0 < 0.08 ? s0 : Math.max(s0, 0.55); // un gris sigue gris
  for (let l = 0.5; l >= 0.18; l -= 0.02) {
    const hex = hslHex(h, s, l);
    if (1.05 / (luminancia(hexRgb(hex)!) + 0.05) >= 4.5) return { accent: hex, accentFg: "#ffffff" };
  }
  return { accent: hslHex(h, s, 0.18), accentFg: "#ffffff" };
}

/* ------------------------------ precio ----------------------------- */

const SIN_DECIMALES = new Set(["COP", "CLP", "PYG", "GTQ", "ARS"]);

/** $144.330 -> $144.900: precio de vitrina, sin pasarse del precio sin descuento. */
function precioRedondo(v: number, techo: number, cur: string): number {
  if (!SIN_DECIMALES.has(cur) || v < 10000) return v;
  const r = Math.ceil(v / 1000) * 1000 - 100;
  if (r < techo) return r;
  const abajo = Math.floor(v / 1000) * 1000 - 100;
  return abajo > 0 ? abajo : v;
}

/** "84900 COP" / "$84900" escritos por el LLM -> "$84.900". */
function preciosEnTexto(t: unknown, cur: string): unknown {
  if (typeof t !== "string") return t;
  return t
    .replace(/\$?\s?(\d{4,9})\s?(COP|MXN|CLP|PEN|USD)\b/gi, (_m, n, c) => money(Number(n), String(c).toUpperCase()))
    .replace(/\$\s?(\d{5,9})\b/g, (_m, n) => money(Number(n), cur));
}

/* ------------------------------ pulido ----------------------------- */

const ocultar = (b: Block): Block => ({ ...b, visible: false });

export function pulirParaVender(spec: PageSpec): PageSpec {
  const cur = spec.product?.currency || "COP";
  const producto = { ...spec.product, images: unicas(spec.product?.images ?? []) };
  const cod = spec.vertical === "cod";

  const hero = spec.blocks.find((b) => b.type === "hero" && b.visible !== false);
  const fotoHero = hero && imagenValida(hero.props?.image) ? claveImagen(hero.props.image) : "";
  let contadorVisto = false;

  const blocks = spec.blocks.map((b): Block => {
    if (b.visible === false) return b;
    const p: any = { ...b.props };

    switch (b.type) {
      case "hero": {
        if (!imagenValida(p.image)) p.image = producto.images[0] ?? "";
        if (Array.isArray(p.images)) p.images = unicas(p.images);
        break;
      }
      case "gallery": {
        // Una galeria que repite la foto del hero o trae una sola foto no
        // suma: se ve como un error. Con menos de 2 fotos nuevas, fuera.
        const items = (Array.isArray(p.items) ? p.items : []).filter((x: any) => imagenValida(x?.src));
        const vistas = new Set(fotoHero ? [fotoHero] : []);
        p.items = items.filter((x: any) => {
          const k = claveImagen(x.src);
          if (vistas.has(k)) return false;
          vistas.add(k);
          return true;
        });
        if (p.items.length < 2) return ocultar(b);
        break;
      }
      case "benefits":
      case "beforeAfter":
      case "reviewsUgc":
      case "testimonials": {
        // Fotos rotas dentro de items: mejor sin foto que un hueco.
        if (Array.isArray(p.items))
          p.items = p.items.map((x: any) => {
            if (!x || typeof x !== "object") return x;
            const y = { ...x };
            for (const k of ["image", "src", "avatar", "before", "after"]) if (k in y && !imagenValida(y[k])) y[k] = "";
            return y;
          });
        break;
      }
      case "countdown": {
        // Dos relojes con tiempos y stock distintos en la misma pagina
        // delatan que la escasez es de mentira: se deja el primero.
        if (contadorVisto) return ocultar(b);
        contadorVisto = true;
        break;
      }
      case "bundle": {
        if (Array.isArray(p.options)) {
          const unit = Number(producto.price) || 0;
          p.options = p.options.map((o: any) => {
            const qty = Number(o?.qty) || 1;
            if (!unit || qty <= 1 || typeof o?.price !== "number") return o;
            return { ...o, price: precioRedondo(o.price, unit * qty, cur) };
          });
        }
        break;
      }
      case "announcement": {
        p.text = preciosEnTexto(p.text, cur);
        break;
      }
      case "stickyCta": {
        // La etiqueta de la barra fija no repite cifras (la barra ya muestra
        // el precio vivo del paquete elegido): cifra en la etiqueta = choque.
        if (typeof p.label === "string" && /\d{3}/.test(p.label)) p.label = cod ? "Pagas al recibir" : "";
        break;
      }
    }
    return { ...b, props: p };
  });

  let theme = spec.theme;
  if (cod && theme?.colors?.accent) {
    const fix = acentoQueVende(theme.colors.accent);
    if (fix) theme = { ...theme, colors: { ...theme.colors, ...fix } };
  }

  return { ...spec, product: producto, theme, blocks };
}
