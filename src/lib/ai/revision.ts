import { applyOps, EditOpSchema, type EditOp, type PageSpec } from "../schema";
import { condensedSchema } from "../blocks/catalog";
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

const SISTEMA_EXPERTO = `Eres un director de arte y copywriter de respuesta directa para tráfico frío de Facebook en Latinoamérica (deciden en 3 segundos desde el celular, pagan contra entrega).
Recibes una landing y la lista de fallos que marcó el chequeo AIDA. Devuelves SIEMPRE un único objeto JSON, sin markdown:
{ "ops": [ ...operaciones... ], "reply": "una frase con lo que corregiste" }
Operaciones: { "op":"setProp", "blockId":"<id>", "path":"title" | "items.0.text" | ..., "value": <any> } o { "op":"addBlock", "block": { "type":"...", "variant":"...", "props":{...} }, "atIndex": <n> }.
MÉTODO (implícito: PROHIBIDO rotular con problema/solución/AIDA/atención/interés/deseo/acción):
- Títulos con gancho de dolor+deseo, nunca solo el nombre del producto.
- Dolores concretos en lenguaje del cliente, cada uno con su consecuencia.
- Beneficios como transformación (cómo queda la vida después).
- CTA con verbo + riesgo cero (pago contra entrega, garantía) + urgencia honesta.
- FAQ que cierra objeciones reales con promesa + riesgo cero.
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
  const ops: EditOp[] = [];
  for (const o of raw?.ops ?? []) {
    const parsed = EditOpSchema.safeParse(o);
    if (parsed.success) ops.push(parsed.data);
  }
  if (!ops.length) return { spec, aplicadas: 0, detalle: "" };
  return { spec: applyOps(spec, ops), aplicadas: ops.length, detalle: String(raw?.reply || "").slice(0, 160) };
}
