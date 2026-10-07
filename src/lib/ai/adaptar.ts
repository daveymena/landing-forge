import type { ExtractedProduct } from "../extract";

/* ------------------------------------------------------------------ *
 *  Página de OTRO negocio -> landing de NUESTRO negocio.
 *
 *  Pedido del dueño (06-10): "si la extrae de otro negocio debe adaptarla a
 *  nuestro negocio y nuestros productos". Antes, cuando la URL se podía leer,
 *  ganaba la otra tienda: su nombre, su precio, sus fotos, su marca y sus
 *  reseñas; el catálogo propio solo rellenaba lo que faltaba. Y al LLM se le
 *  decía "son HECHOS, respétalos exactamente" sobre datos ajenos.
 *
 *  Ahora la página ajena es REFERENCIA (qué es el producto, para qué sirve,
 *  qué características tiene). Nombre, precio, fotos y marca son los nuestros;
 *  sus promesas, reseñas y marca no pasan.
 * ------------------------------------------------------------------ */

export interface FuenteAdaptada extends ExtractedProduct {
  /** La ficha salió de una tienda que no es la nuestra. */
  ajena?: boolean;
  /** Texto de la otra tienda, solo para entender el producto. */
  referencia?: string;
  /** Marcas de esa tienda que no pueden aparecer en nuestra landing. */
  marcasAjenas?: string[];
}

const PROPIOS = ["ventasproia.com"];

export function esHostPropio(host: string): boolean {
  const h = String(host || "").toLowerCase().replace(/^www\./, "");
  if (!h || h === "catalogo") return true;
  const extra = [process.env.PUBLIC_APP_URL, process.env.OWN_HOSTS]
    .flatMap((v) => String(v || "").split(","))
    .map((v) => v.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase())
    .filter(Boolean);
  return [...PROPIOS, ...extra].some((p) => h === p || h.endsWith("." + p));
}

/** "babykoala.co" -> "babykoala"; "tienda.mimarca.com.co" -> "mimarca". */
function etiquetaDeHost(host: string): string {
  const partes = String(host || "").toLowerCase().replace(/^www\./, "").split(".");
  const sinTld = partes.filter((p, i) => i === 0 || !/^(com|co|net|org|shop|store|mx|pe|cl|ec|ar|es|io)$/.test(p));
  const genericos = /^(tienda|shop|store|www|m|es|co)$/;
  return sinTld.find((p) => !genericos.test(p) && p.length >= 4) || "";
}

/** Marcas de la otra tienda: la que declara la ficha y la del dominio. */
export function marcasDe(ext: Pick<ExtractedProduct, "brand" | "host">): string[] {
  const out = new Set<string>();
  const b = String(ext.brand || "").trim();
  if (b.length >= 3 && !/^(generic|gen[eé]rico|sin marca|no brand|oem|n\/a)$/i.test(b)) out.add(b);
  const h = etiquetaDeHost(ext.host);
  if (h) out.add(h);
  return [...out];
}

const compacto = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Reemplaza una marca ajena aunque cambie el espaciado ("BabyKoala",
 *  "Baby Koala", "baby-koala", "babykoala.co"). */
export function sinMarcasAjenas(texto: string, marcas: string[], nuestra: string): string {
  let t = texto;
  for (const m of marcas) {
    const c = compacto(m);
    if (c.length < 3) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${[...c].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\-_.]?")}(?:\\.(?:com|co|net|shop|store)(?:\\.[a-z]{2})?)?(?![\\p{L}\\p{N}])`, "giu");
    t = t.replace(re, nuestra);
  }
  // "de " + vacío deja "de  ." -> limpiar dobles espacios y conectores huérfanos
  return nuestra ? t : t.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}

export interface Nuestro {
  name?: string;
  price?: number;
  currency?: string;
  images?: string[];
  videos?: string[];
  description?: string;
}

/**
 * Convierte la ficha de otra tienda en la fuente de NUESTRA landing.
 * Lo nuestro manda; de la otra tienda solo quedan las características (como
 * referencia) y, si no tenemos fotos propias, sus fotos con aviso.
 */
export function adaptarANuestro(ext: ExtractedProduct, nuestro: Nuestro, avisos: string[]): FuenteAdaptada {
  if (esHostPropio(ext.host)) return ext;
  const fotosNuestras = (nuestro.images || []).filter(Boolean);
  if (!fotosNuestras.length && ext.images?.length) {
    avisos.push(
      `Las fotos vienen de ${ext.host} (otra tienda): reemplázalas por las tuyas o las del proveedor antes de publicar; pueden traer su logo.`,
    );
  }
  return {
    ...ext,
    name: nuestro.name || ext.name,
    price: nuestro.price || ext.price,
    // Su "precio anterior" no es el nuestro: un tachado ajeno es inventado.
    compareAtPrice: nuestro.price ? 0 : ext.compareAtPrice,
    currency: nuestro.price ? nuestro.currency || ext.currency : ext.currency,
    images: fotosNuestras.length ? fotosNuestras : ext.images,
    videos: (nuestro.videos || []).length ? nuestro.videos! : ext.videos,
    description: nuestro.description || "",
    // Sus reseñas no son nuestras.
    rating: 0,
    ratingCount: 0,
    brand: "",
    ajena: true,
    referencia: [ext.description, ...(ext.bullets || [])].filter(Boolean).join(" · ").slice(0, 900),
    marcasAjenas: marcasDe(ext),
  };
}
