import { applyOps, EditOpSchema, type EditOp, type PageSpec } from "../schema";
import { BY_TYPE, condensedSchema, withDefaults } from "../blocks/catalog";
import { complete, extractJson } from "./provider";

export interface HallazgoAIDA {
  bloque: string;
  problema: string;
}

/** Palabras que describen pero no venden: si un item es SOLO esto, es relleno. */
const GENERICOS = ["práctico", "practico", "cómodo", "comodo", "ideal", "perfecto", "calidad", "increíble", "increible", "hermoso", "bonito", "excelente", "bueno", "útil", "util"];
/** Etiquetas del método como títulos visibles: el lector debe sentirlo, no leerlo. */
const ETIQUETA_METODO = /^(problema|solucion|solución|atencion|atención|interes|interés|deseo|accion|acción|aida)\s*:/im;
/** Verbos de acción para el CTA (imperativo o infinitivo). */
const VERBO_ACCION = /\b(pide|píd|pídel[oa]|solicita|solicitar|compra|comprar|llévate|llevate|lleva|aprovecha|ordena|empieza|descubre|consigue|reclama|escríbe|escribe|garantiza|pago contra entrega)\w*/i;
/** Verbos de resultado para beneficios (transformación, no inventario). */
const VERBO_RESULTADO = /\b(ahorra|evita|olvida|olvída|disfruta|consigue|logra|protege|llega|lleva|duerme|viaja|gana|recupera|elimina|reduce|mejora|siente|vive)\w*/i;

const CAMPOS_TEXTO = ["title", "heading", "subtitle", "text", "body", "paragraph", "cta", "ctaText", "q", "question", "a", "answer", "quote", "caption", "badge", "eyebrow"];
const textosDeProps = (p: any): string[] => {
  if (!p || typeof p !== "object") return [];
  const acc: string[] = [];
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === "string" && CAMPOS_TEXTO.includes(k)) acc.push(v);
    else if (Array.isArray(v)) for (const it of v) acc.push(...textosDeProps(it));
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      // items anidados (faq/reviews) sin bajar a image/src/url
      if (/item|review|question|answer|quote/i.test(k)) acc.push(...textosDeProps(v));
    }
  }
  return acc;
};
const todoTextos = (blocks: any[]): string => blocks.map((b: any) => textosDeProps(b?.props).join(" ")).join(" ");
const preciosEnTextos = (blocks: any[]): number[] => {
  const nums: number[] = [];
  for (const m of todoTextos(blocks).matchAll(/(\d[\d\.,]*)/g)) {
    const n = Number(m[1].replace(/[\.,]/g, ""));
    if (isFinite(n) && String(Math.trunc(n)).length >= 4) nums.push(Math.trunc(n));
  }
  return nums;
};

const tituloDe = (p: any): string => String(p?.title || p?.heading || "").trim();
const textoDe = (p: any): string =>
  [p?.title, p?.heading, p?.subtitle, p?.text, p?.body, p?.paragraph].filter(Boolean).join(" ");

function esSoloGenerico(t: string): boolean {
  const words = t.toLowerCase().replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean);
  if (words.length > 8) return false;
  return words.length > 0 && words.every((w) => GENERICOS.includes(w) || w.length <= 2);
}

/**
 * Chequeo determinista del método AIDA sobre el spec (instantáneo, sin IA).
 * Marca fallos concretos; la reparación experta solo corre si hay fallos.
 */
export function chequearAIDA(spec: PageSpec, nombreProducto: string): HallazgoAIDA[] {
  const out: HallazgoAIDA[] = [];
  const blocks = Array.isArray(spec?.blocks) ? spec.blocks : [];
  const nombre = String(nombreProducto || "").toLowerCase().trim();

  // ── ATENCIÓN: el H1 es un gancho, no el nombre del producto ──
  const hero = blocks.find((b: any) => b?.type === "hero");
  const h1 = tituloDe((hero as any)?.props);
  if (!h1) {
    out.push({ bloque: "hero", problema: "el hero no tiene titular" });
  } else {
    const palabras = h1.split(/\s+/).length;
    if (palabras < 4) out.push({ bloque: "hero", problema: `titular muy corto ("${h1.slice(0, 60)}"): no dice nada` });
    if (palabras > 15) out.push({ bloque: "hero", problema: "titular demasiado largo: rompe el diseño y no engancha" });
    const h1n = h1.toLowerCase().replace(/[^\p{L}\d\s]/gu, "").trim();
    if (nombre && (h1n === nombre || h1n.replace(/^(compra|conoce|descubre|prueba)\s+/u, "") === nombre)) {
      out.push({ bloque: "hero", problema: `el H1 es solo el nombre del producto ("${h1.slice(0, 60)}"): no tiene gancho de dolor ni deseo` });
    } else if (nombre && nombre.split(/\s+/).length >= 2) {
      // "Mochila Transportadora Mascotas X: una mascota feliz" = el nombre
      // disfrazado con cola generica. Si empieza por el producto o contiene
      // 3+ palabras seguidas del nombre, no es un gancho.
      const pal = nombre.split(/\s+/).filter((w) => w.length > 2);
      const empieza = pal.length > 0 && h1n.startsWith(pal.slice(0, 2).join(" "));
      let seguidas = 0;
      for (let i = 0; i + 2 < pal.length; i++) {
        if (h1n.includes(pal.slice(i, i + 3).join(" "))) { seguidas = 3; break; }
      }
      if (empieza || seguidas >= 3) {
        out.push({ bloque: "hero", problema: `el H1 es el nombre del producto con cola ("${h1.slice(0, 70)}"): el gancho debe salir de la promesa, no del nombre` });
      }
    }
  }

  // ── Etiquetas del método visibles (prohibidas) ──
  for (const b of blocks as any[]) {
    const t = tituloDe(b?.props);
    if (t && ETIQUETA_METODO.test(t)) {
      out.push({ bloque: String(b?.type), problema: `título rotulado con el método ("${t.slice(0, 50)}"): el lector debe sentirlo, no leerlo` });
      break;
    }
  }

  // ── INTERÉS: bloque problem con 3 dolores concretos ──
  const problem = blocks.find((b: any) => b?.type === "problem") as any;
  if (problem && !tituloDe(problem.props)) {
    out.push({ bloque: "problem", problema: "el bloque de dolores no tiene titulo que los enmarque (ej: el costo de seguir como estas)" });
  }
  if (!problem) {
    out.push({ bloque: "problem", problema: "falta el bloque de dolores: sin agitación no hay interés" });
  } else {
    const items = Array.isArray(problem.props?.items) ? problem.props.items : [];
    const buenos = items.filter((it: any) => String(it?.text || it?.description || "").trim().length >= 20 && !esSoloGenerico(String(it?.title || "") + " " + String(it?.text || "")));
    if (buenos.length < 3) {
      out.push({ bloque: "problem", problema: `solo ${buenos.length} dolores concretos (mínimo 3, con consecuencia, sin generalidades)` });
    }
  }

  // ── DESEO: beneficios como transformación ──
  const benefits = blocks.find((b: any) => b?.type === "benefits") as any;
  if (benefits) {
    const items = Array.isArray(benefits.props?.items) ? benefits.props.items : [];
    const conResultado = items.filter((it: any) => VERBO_RESULTADO.test(String(it?.title || "") + " " + String(it?.text || it?.description || "")));
    if (items.length >= 2 && conResultado.length < 2) {
      out.push({ bloque: "benefits", problema: "los beneficios describen el producto en vez de la transformación (cómo queda la vida después)" });
    }
  }

  // ── ACCIÓN: CTA con verbo ──
  const cierre = blocks.filter((b: any) => ["codForm", "ctaFinal", "stickyCta", "bundle"].includes(b?.type));
  const textosCierre = cierre.map((b: any) => textoDe(b?.props) + " " + String(b?.props?.cta || b?.props?.ctaText || "")).join(" ");
  if (!VERBO_ACCION.test(textosCierre)) {
    out.push({ bloque: "cta", problema: "el cierre no tiene un pedido claro con verbo (Pídelo, Solicita, Aprovecha…)" });
  }

  // ── Precio visible arriba del pliegue ──
  const arriba = [blocks.find((b: any) => b?.type === "hero"), blocks.find((b: any) => b?.type === "announcement")]
    .map((b: any) => textoDe(b?.props))
    .join(" ");
  if (!/[\$]|\bCOP\b|precio/i.test(arriba)) {
    out.push({ bloque: "hero", problema: "el precio no se ve arriba del pliegue: el visitante debe entender que, cuanto y como pedirlo en 3 segundos" });
  }

  // ── CTA ganador (verbo + riesgo cero), no generico ──
  if (!/(paga al recibir|contra entrega|aprovecha|ahora|hoy)/i.test(textosCierre)) {
    out.push({ bloque: "cta", problema: 'CTA generico: usa textos ganadores repetidos ("Pide Ahora y Paga al Recibir") con riesgo cero al lado' });
  }

  // ── Prueba social con detalle concreto ──
  const social = blocks.find((b: any) => /review|testimon/i.test(b?.type)) as any;
  if (social) {
    const items = Array.isArray(social.props?.items) ? social.props.items : [];
    const creibles = items.filter(
      (it: any) => String(it?.quote || it?.text || "").trim().length >= 45 && String(it?.name || it?.nombre || "").trim().length > 1,
    );
    if (items.length > 0 && creibles.length < Math.min(3, items.length)) {
      out.push({ bloque: "reviews", problema: "resenas sin detalle concreto: nombre + ciudad + medida real (dias de entrega, resultado)" });
    }
    // La cita no repite el nombre/ciudad (van en sus campos): si no, sale duplicado.
    const repetidas = items.filter((it: any) => {
      const q = String(it?.quote || it?.text || "").trim().toLowerCase();
      const partes = String(it?.name || it?.nombre || "").trim().toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      if (!partes.length) return false;
      const primero = esc(partes[0]);
      const completo = partes.length > 1 ? esc(partes.slice(0, 2).join(" ")) : "";
      // Empieza con el nombre, lo trae al final como firma ("- Sandra"), o
      // incluye nombre+apellido dentro: en los tres casos sale duplicado.
      return q.startsWith(partes[0]) || (completo !== "" && q.includes(completo)) || new RegExp(`[\u2014\u2013\-]\s*${primero}`).test(q);
    });
    if (repetidas.length) {
      out.push({ bloque: "reviews", problema: "la cita repite el nombre/ciudad del campo nombre: la cita es solo el testimonio" });
    }
  }

  // ── Urgencia visible y honesta ──
  if (!/(stock|oferta|quedan|descuento|env[ií]o gratis|lanzamiento)/i.test(todoTextos(blocks))) {
    out.push({ bloque: "urgencia", problema: "no hay urgencia visible (stock, oferta, envio gratis): el cliente pospone y no vuelve" });
  }

  // ── Coherencia de precios en los textos ──
  // Vale: precio, tachado, ahorro (tachado-precio) y cuotas de bundle. Lo demas es numero inventado.
  const price = Number(spec.product?.price) || 0;
  const compare = Number(spec.product?.compareAtPrice) || 0;
  const ahorro = compare > price ? compare - price : 0;
  const bundleNums = new Set<number>();
  for (const b of blocks as any[]) {
    const opts = b?.props?.options;
    if (Array.isArray(opts)) for (const o of opts) { if (Number(o?.price) > 0) bundleNums.add(Number(o.price)); if (Number(o?.compareAtPrice) > 0) bundleNums.add(Number(o.compareAtPrice)); }
  }
  const validos = new Set([price, compare, ahorro, ...bundleNums].filter((n) => n > 0));
  const mencionados = preciosEnTextos(blocks);
  const raros = [...new Set(mencionados)].filter((n) => !validos.has(n));
  if (price > 0 && raros.length) {
    out.push({ bloque: "precio", problema: `precios incoherentes en los textos: ${raros.join(", ")} (vale ${price}${compare ? `, tachado ${compare}` : ""})` });
  }

  // ── FAQ que cierra objeciones ──
  const faq = blocks.find((b: any) => b?.type === "faq") as any;
  if (faq) {
    const items = Array.isArray(faq.props?.items) ? faq.props.items : [];
    const buenas = items.filter((it: any) => String(it?.q || it?.question || "").trim().endsWith("?") && String(it?.a || it?.answer || "").trim().length >= 30);
    if (buenas.length < 3) {
      out.push({ bloque: "faq", problema: `solo ${buenas.length} objeciones reales cerradas (mínimo 3 con pregunta y respuesta completa)` });
    }
  }
  return out;
}

const esc = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Las ops del experto pasan por el MISMO filtro que la generacion.
 *
 * Sin esto un addBlock con type inventado ("Problem", "dolor") entra al spec,
 * no se renderiza, y el chequeo lo vuelve a pedir para siempre: el bloque
 * problem "reparado" varias veces seguia sin titulo porque lo insertado no
 * era el type exacto. Se normaliza (type/variante/props con defaults) o se
 * descarta; nunca se guarda roto.
 */
function normalizarOpsReparacion(spec: PageSpec, ops: EditOp[]): { ops: EditOp[]; descartadas: number } {
  const validas: EditOp[] = [];
  let descartadas = 0;
  const tipos = Object.keys(BY_TYPE || {});
  for (const o of ops) {
    if ((o as any).op === "addBlock") {
      const t = String((o as any)?.block?.type || "");
      const canon = tipos.find((k) => k === t) || tipos.find((k) => k.toLowerCase() === t.toLowerCase());
      if (!canon) { descartadas++; continue; }
      const b: any = { ...((o as any).block || {}), type: canon };
      const vars = (((BY_TYPE as any)[canon] as any)?.variants || []).map((v: any) => v?.value ?? v);
      if (!vars.includes(b.variant)) b.variant = vars[0];
      b.props = withDefaults(canon, b.props && typeof b.props === "object" ? b.props : {});
      if (!b.id) b.id = canon.slice(0, 3) + "_" + Math.random().toString(36).slice(2, 8);
      validas.push({ ...(o as any), block: b } as EditOp);
      continue;
    }
    if ((o as any).op === "setProp") {
      const existe = (spec.blocks as any[]).some((x) => x?.id === (o as any).blockId);
      if (!existe) { descartadas++; continue; }
    }
    validas.push(o);
  }
  return { ops: validas, descartadas };
}

const SISTEMA_EXPERTO = `Eres un director de arte y copywriter de respuesta directa para tráfico frío de Facebook en Latinoamérica (deciden en 3 segundos desde el celular, pagan contra entrega).
Recibes una landing y la lista de fallos que marcó el chequeo AIDA. Devuelves SIEMPRE un único objeto JSON, sin markdown:
{ "ops": [ ...operaciones... ], "reply": "una frase con lo que corregiste" }
Operaciones: { "op":"setProp", "blockId":"<id>", "path":"title" | "items.0.text" | ..., "value": <any> } o { "op":"addBlock", "block": { "type":"...", "variant":"...", "props":{...} }, "atIndex": <n> }.
MÉTODO (implícito: PROHIBIDO rotular con problema/solución/AIDA/atención/interés/deseo/acción):
- Títulos con gancho de dolor+deseo, nunca solo el nombre del producto.
- Dolores concretos en lenguaje del cliente, cada uno con su consecuencia.
- Beneficios como transformación (cómo queda la vida después).
- CTA con verbo + riesgo cero (pago contra entrega, garantía) + urgencia honesta. Textos ganadores repetidos ("Pide Ahora y Paga al Recibir"): nunca un "Enviar" seco.
- Precio visible arriba del pliegue (con tachado si hay oferta): el visitante entiende qué, cuánto y cómo pedirlo en 3 segundos.
- Prueba social con detalle concreto (ciudad + días de entrega o medida del beneficio): sin detalle no se cree.
Corrige SOLO lo marcado. No toques precios, fotos, theme ni bloques que están bien.`;

/**
 * Fase 3: el EXPERTO revisa y repara. Solo corre cuando el chequeo marcó
 * fallos; si el copy ya salió bueno, no gasta ni un segundo ni un peso.
 */
export async function revisionExperta(
  spec: PageSpec,
  hallazgos: HallazgoAIDA[],
  provider?: { providerId?: string; model?: string },
): Promise<{ spec: PageSpec; aplicadas: number; detalle: string }> {
  const slim = (spec.blocks || [])
    .map((b: any) => `id=${b.id} type=${b.type} variant=${b.variant} props=${JSON.stringify(b.props || {}).slice(0, 500)}`)
    .join("\n");
  const res = await complete({
    system: `${SISTEMA_EXPERTO}\n\nCATÁLOGO (solo para addBlock, usa type/variant/props exactos):\n${condensedSchema().slice(0, 6000)}`,
    user: `Fallos del chequeo AIDA:\n${hallazgos.map((h) => `- [${h.bloque}] ${h.problema}`).join("\n")}\n\nBloques actuales:\n${slim.slice(0, 14000)}\n\nDevuelve solo el JSON con ops y reply.`,
    json: true,
    maxTokens: 2500,
    temperature: 0.3,
    provider,
  });
  const raw = extractJson(res.text) as any;
  const crudas: EditOp[] = [];
  for (const o of raw?.ops ?? []) {
    const parsed = EditOpSchema.safeParse(o);
    if (parsed.success) crudas.push(parsed.data);
  }
  const norm = normalizarOpsReparacion(spec, crudas);
  if (!norm.ops.length) return { spec, aplicadas: 0, detalle: norm.descartadas ? `${norm.descartadas} descartadas por invalidas` : "" };
  const detalle = String(raw?.reply || "").slice(0, 160) + (norm.descartadas ? ` (${norm.descartadas} descartadas por invalidas)` : "");
  return { spec: applyOps(spec, norm.ops), aplicadas: norm.ops.length, detalle };
}
