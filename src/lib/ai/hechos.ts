import type { PageSpec, Block } from "../schema";
import { sinMarcasAjenas } from "./adaptar";

/* ------------------------------------------------------------------ *
 *  HECHOS DEL NEGOCIO: lo único que la landing puede prometer.
 *
 *  Antes el bot mandaba nombre, precio, descripción y fotos; el LLM
 *  completaba el resto de memoria. Auditoría 06-10 en landings reales:
 *   - navbar con "Tu Marca", con la marca de OTRA tienda ("Baby Koala",
 *     de la que se sacaron las fotos) o con el modelo ("ZXF-25");
 *   - "Envío gratis" y "Garantía de 30 días, te devolvemos el dinero" que
 *     el dueño nunca dio: publicidad engañosa y un reclamo seguro.
 *  Regla: una promesa sale solo si está en los hechos o en lo que escribió
 *  el dueño (prompt / ficha). Lo demás se retira después de generar, sin
 *  depender de que el modelo obedezca.
 * ------------------------------------------------------------------ */

export interface HechosNegocio {
  /** Nombre comercial del negocio: va en el encabezado y el pie. */
  marca?: string;
  /** Hasta dónde llega: "todo Colombia", "Cali y alrededores"… */
  cobertura?: string;
  entrega?: { metodo?: string; plazo?: string; detalle?: string } | null;
  garantia?: { dias?: number; descripcion?: string } | null;
  /** true solo si el dueño lo configuró. null/undefined = NO afirmar. */
  envioGratis?: boolean | null;
  /** "contraentrega", "transferencia", "link de pago"… */
  pago?: string;
  /** "tu" (defecto) | "usted" */
  trato?: string;
  /** Resenas REALES del negocio (las unicas que la landing puede mostrar). */
  testimonios?: Array<{ nombre: string; ciudad?: string; texto: string }>;
}

export function leerHechos(raw: unknown): HechosNegocio | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r: any = raw;
  const txt = (v: unknown, n = 160) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : undefined);
  const h: HechosNegocio = {
    marca: txt(r.marca, 60),
    cobertura: txt(r.cobertura),
    entrega: r.entrega && typeof r.entrega === "object"
      ? { metodo: txt(r.entrega.metodo), plazo: txt(r.entrega.plazo), detalle: txt(r.entrega.detalle, 240) }
      : null,
    garantia: r.garantia && typeof r.garantia === "object" && (Number(r.garantia.dias) > 0 || txt(r.garantia.descripcion))
      ? { dias: Number(r.garantia.dias) || undefined, descripcion: txt(r.garantia.descripcion, 300) }
      : null,
    envioGratis: r.envioGratis === true ? true : r.envioGratis === false ? false : null,
    pago: txt(r.pago, 80),
    trato: r.trato === "usted" ? "usted" : "tu",
  };
  if (Array.isArray(r.testimonios)) {
    const t = r.testimonios
      .map((x: any) => ({ nombre: txt(x?.nombre, 40) || "", ciudad: txt(x?.ciudad, 40), texto: txt(x?.texto, 240) || "" }))
      .filter((x: any) => x.nombre && x.texto)
      .slice(0, 6);
    if (t.length) h.testimonios = t;
  }
  return h;
}

/** Bloque para el prompt del arquitecto. */
export function bloqueDeHechos(h?: HechosNegocio): string {
  const trato = h?.trato === "usted"
    ? "Trata al cliente de USTED en toda la página (nunca de tú)."
    : "Trata al cliente de TÚ en toda la página (nunca de usted: nada de 'Haga', 'su pedido', 'Rellene').";
  if (!h) return `\n\n${trato}`;
  const l: string[] = [];
  if (h.marca) l.push(`- Marca/tienda: ${h.marca} (va en el encabezado y el pie; NO uses la marca del fabricante ni de otra tienda).`);
  if (h.cobertura) l.push(`- Cobertura: ${h.cobertura}.`);
  if (h.pago) l.push(`- Pago: ${h.pago}.`);
  if (h.entrega && (h.entrega.metodo || h.entrega.plazo))
    l.push(`- Entrega: ${[h.entrega.metodo, h.entrega.plazo, h.entrega.detalle].filter(Boolean).join(" · ")}.`);
  l.push(h.envioGratis === true ? "- Envío: GRATIS." : "- Envío: NO digas que es gratis (el costo depende de la transportadora).");
  l.push(
    h.garantia
      ? `- Garantía: ${[h.garantia.dias ? `${h.garantia.dias} días` : "", h.garantia.descripcion].filter(Boolean).join(" — ")}. Usa EXACTAMENTE esto, sin agrandarla.`
      : "- Garantía / devolución de dinero: NO existe. No la menciones en ningún bloque.",
  );
  l.push(
    h.testimonios?.length
      ? `- Reseñas reales (usa SOLO estas, textuales): ${h.testimonios.map((t) => `"${t.texto}" — ${t.nombre}${t.ciudad ? `, ${t.ciudad}` : ""}`).join(" | ")}.`
      : "- Reseñas / estrellas / cifras de clientes: NO hay. No incluyas testimonios, calificaciones ni \"más de N clientes\".",
  );
  return `\n\nHECHOS DEL NEGOCIO (son los únicos datos operativos válidos; lo que no está acá no se promete):\n${l.join("\n")}\n${trato}`;
}

/* --------------------------- ajuste final --------------------------- */

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const RE_ENVIO_GRATIS = /env[ií]os?\s+(gratis|gratuitos?|sin\s+costo)/gi;
const RE_GARANTIA = /garant[ií]a|devoluci[oó]n|devolvemos|reembols/i;
const MARCA_RELLENO = /^(tu\s*marca|marca|tu\s*tienda|mi\s*tienda|logo|brand|tu\s*logo)$/i;

/** Quita las frases (o segmentos "a · b") que tocan una promesa no respaldada. */
function sinFrasesCon(t: string, re: RegExp): string {
  if (!re.test(t)) return t;
  const partes = t.split(/(?<=[.!?])\s+|\s+[·|•]\s+|\s+[–—-]\s+/);
  return partes.filter((p) => !re.test(p)).join(" · ").replace(/\s+·\s*$/, "").trim();
}

function mapStrings(v: any, fn: (s: string, key: string) => string, key = ""): any {
  if (typeof v === "string") return fn(v, key);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn, key));
  if (v && typeof v === "object") {
    const o: any = {};
    for (const [k, x] of Object.entries(v)) o[k] = /^(image|images|src|videoUrl|href|ctaHref|logoImage|avatar|before|after)$/.test(k) ? x : mapStrings(x, fn, k);
    return o;
  }
  return v;
}

export interface Soporte {
  /** prompt del dueño + ficha extraída: lo que SÍ dijo */
  texto: string;
  hechos?: HechosNegocio;
  /** nombre corto del producto, para reemplazar "Tu Marca" sin hechos */
  producto?: string;
  /** marcas de la tienda de donde se sacó la ficha: no pueden aparecer */
  marcasAjenas?: string[];
  /** Valoracion REAL de la ficha propia (no de otra tienda). */
  valoracion?: { rating: number; count: number } | null;
}

/* Prueba social inventada: el generador y el LLM ponian "4.8 · 2.147
   reseñas", "Más de 2.000 clientes", "Compra verificada" y tres resenas con
   nombre en TODAS las landings (auditoria 07-10). Es publicidad enganosa
   (Estatuto del Consumidor) y el cliente de Facebook la huele. Regla: prueba
   social real o ninguna. */
const RE_PRUEBA =
  /(\+|m[aá]s de|miles de|cientos de)\s*[\d.,]*\s*(mil\s+)?(clientes|personas|colombian[oa]s|compradores|familias|usuari[oa]s|pedidos|mam[aá]s)|[\d.,]+\s*(mil\s+)?(rese[ñn]as|opiniones|valoraciones|calificaciones|clientes|vendid[oa]s)|\d[.,]\d\s*\/\s*5|verificad[oa]s?/i;
const STAT_PRUEBA = /client|rese[ñn]|opini|valora|califica|vendid|pedido|estrella|satisf|usuari|★/i;

export function ajustarAHechos(spec: PageSpec, s: Soporte): { spec: PageSpec; cambios: string[] } {
  const cambios: string[] = [];
  const t = norm(s.texto || "");
  const h = s.hechos;
  // Con hechos del negocio (vienen de VentasPro) mandan SOLO ellos: el brief
  // que arma Atlas puede traer una garantía o un envío gratis de su cosecha.
  // Sin hechos (panel de Forge) manda lo que escribió el dueño.
  const envioGratisOk = h ? h.envioGratis === true : /envio(s)? (gratis|gratuito|sin costo)/.test(t);
  const garantiaOk = h ? !!h.garantia : RE_GARANTIA.test(t);

  const nuestra = h?.marca || (s.producto || "").split(/\s+/).slice(0, 3).join(" ");
  const blocks = spec.blocks.map((b): Block => {
    let p: any = b.props;

    if (s.marcasAjenas?.length) {
      const antes = JSON.stringify(p);
      p = mapStrings(p, (x) => sinMarcasAjenas(x, s.marcasAjenas!, nuestra));
      if (JSON.stringify(p) !== antes) cambios.push(`${b.type}: marca de otra tienda (${s.marcasAjenas.join(", ")}) → "${nuestra}"`);
    }

    if (!envioGratisOk) {
      const antes = JSON.stringify(p);
      p = mapStrings(p, (x) => x.replace(RE_ENVIO_GRATIS, (m) => (/^E/.test(m) ? "Envío a domicilio" : "envío a domicilio")));
      if (JSON.stringify(p) !== antes) cambios.push(`${b.type}: "envío gratis" sin respaldo → "envío a domicilio"`);
    }

    if (!garantiaOk) {
      if (b.type === "guarantee" && b.visible !== false) {
        cambios.push("guarantee: bloque de garantía sin respaldo, oculto");
        return { ...b, visible: false };
      }
      const antes = JSON.stringify(p);
      const items = Array.isArray(p.items)
        ? p.items.filter((x: any) => !RE_GARANTIA.test(JSON.stringify(x ?? "")))
        : p.items;
      // Las filas de la comparativa tambien: una fila "Garantía de 30 días"
      // vaciada salia como un check suelto sin texto.
      const rows = Array.isArray(p.rows) ? p.rows.filter((x: any) => !RE_GARANTIA.test(JSON.stringify(x ?? ""))) : p.rows;
      p = { ...p, ...(Array.isArray(p.items) ? { items } : {}), ...(Array.isArray(p.rows) ? { rows } : {}) };
      p = mapStrings(p, (x) => sinFrasesCon(x, RE_GARANTIA));
      if (JSON.stringify(p) !== antes) cambios.push(`${b.type}: promesa de garantía/devolución sin respaldo, retirada`);
    } else if (h?.garantia && b.type === "guarantee") {
      const dias = h.garantia.dias;
      p = {
        ...p,
        ...(dias ? { title: `Garantía de ${dias} días`, badge: `${dias} días` } : {}),
        ...(h.garantia.descripcion ? { body: h.garantia.descripcion } : {}),
      };
    }

    // ── Prueba social: real o ninguna ──
    const val = s.valoracion && s.valoracion.rating > 0 ? s.valoracion : null;
    const reales = h?.testimonios?.length ? h.testimonios : null;
    if ((b.type === "reviewsUgc" || b.type === "testimonials") && b.visible !== false) {
      if (!reales) {
        cambios.push(`${b.type}: reseñas sin respaldo, oculto`);
        return { ...b, visible: false };
      }
      p = {
        ...p,
        items: reales.map((t) =>
          b.type === "reviewsUgc"
            ? { quote: t.texto, name: t.ciudad ? `${t.nombre} · ${t.ciudad}` : t.nombre, rating: 5, verified: false, image: "" }
            : { quote: t.texto, name: t.nombre, role: t.ciudad || "", rating: 5, avatar: "" },
        ),
      };
    }
    if ("rating" in p || "ratingCount" in p) {
      const antes = `${p.rating}|${p.ratingCount}`;
      p = { ...p, rating: val ? val.rating : 0, ratingCount: val && val.count ? String(val.count) : "" };
      if (`${p.rating}|${p.ratingCount}` !== antes && !val) cambios.push(`${b.type}: calificación inventada, retirada`);
    }
    if (b.type === "stats" && Array.isArray(p.items) && !val) {
      const items = p.items.filter((x: any) => !STAT_PRUEBA.test(`${x?.value ?? ""} ${x?.label ?? ""}`));
      if (items.length !== p.items.length) cambios.push("stats: cifras de clientes/reseñas sin respaldo, retiradas");
      if (items.length < 2) return { ...b, visible: false };
      p = { ...p, items };
    }
    if (!val && !reales) {
      const antes = JSON.stringify(p);
      p = mapStrings(p, (x, k) => (/^(quote|name|role)$/.test(k) ? x : sinFrasesCon(x, RE_PRUEBA)));
      if (Array.isArray(p.items)) p.items = p.items.map((x: any) => (x && typeof x === "object" && "verified" in x ? { ...x, verified: false } : x));
      if (JSON.stringify(p) !== antes) cambios.push(`${b.type}: cifras de clientes/reseñas sin respaldo, retiradas`);
    }

    if (b.type === "navbar" || b.type === "footer") {
      const k = b.type === "navbar" ? "logoText" : "brand";
      const actual = String(p[k] ?? "").trim();
      const nueva = h?.marca || (MARCA_RELLENO.test(actual) || !actual ? (s.producto || "").split(/\s+/).slice(0, 3).join(" ") : "");
      if (nueva && nueva !== actual) {
        p = { ...p, [k]: nueva };
        if (b.type === "footer" && typeof p.copyright === "string" && actual) p.copyright = p.copyright.split(actual).join(nueva);
        cambios.push(`${b.type}: marca "${actual}" → "${nueva}"`);
      }
    }
    return p === b.props ? b : { ...b, props: p };
  });

  return { spec: { ...spec, blocks }, cambios };
}
