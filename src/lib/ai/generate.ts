import { PageSpecSchema, uid, slugify, applyOps, EditOpSchema, type EditOp, type PageSpec } from "../schema";
import { localEdit, type EditResult } from "./localEdit";
import { BY_TYPE, withDefaults } from "../blocks/catalog";
import { themeFromPreset, PRESET_BY_ID, suggestPreset } from "../theme";
import { TEMPLATE_BY_ID } from "../templates";
import { generateDeterministic } from "./deterministic";
import { parseBrief } from "./brief";
import { complete, extractJson, resolveProvider } from "./provider";
import { analizarBrief, type AnalisisLanding } from "./analisis";
import { chequearAIDA, revisionExperta } from "./revision";
import { analyzePalette, type PaletteInfo } from "../palette";
import { architectSystem, architectUser, editSystem, editUser } from "./prompts";
import type { ExtractedProduct } from "../extract";

export interface GenerateResult {
  spec: PageSpec;
  engine: "llm" | "deterministic";
  provider: string;
  model: string;
  ms: number;
  warnings: string[];
  /** Fase 1: el analisis previo (avatar/dolores/angulo). null si no corrio. */
  analisis?: AnalisisLanding | null;
}

/** Normaliza lo que devuelve el LLM a un PageSpec válido y renderizable. */
export function normalizeToSpec(raw: any, prompt: string, fallback: PageSpec): { spec: PageSpec; warnings: string[] } {
  const warnings: string[] = [];
  const brief = parseBrief(prompt);

  const rawBlocks: any[] = Array.isArray(raw?.blocks) ? raw.blocks : [];
  const blocks = rawBlocks
    .map((b: any) => {
      const type = String(b?.type || "").trim();
      const def = BY_TYPE[type];
      if (!def) {
        warnings.push(`Bloque desconocido descartado: "${type}"`);
        return null;
      }
      const variants = def.variants.map((v) => v.value);
      let variant = String(b?.variant || variants[0]);
      if (!variants.includes(variant)) {
        warnings.push(`Variante inválida "${variant}" en ${type}; se usó "${variants[0]}"`);
        variant = variants[0];
      }
      return {
        id: uid(type.slice(0, 3)),
        type,
        variant,
        visible: b?.visible !== false,
        props: withDefaults(type, sanitizeProps(b?.props)),
      };
    })
    .filter(Boolean) as PageSpec["blocks"];

  if (blocks.length < 4) {
    warnings.push("El modelo devolvió muy pocos bloques; se usó la estructura base del generador.");
    return { spec: fallback, warnings };
  }

  const presetId = PRESET_BY_ID[raw?.theme?.preset] ? raw.theme.preset : suggestPreset(prompt, raw?.vertical || brief.vertical);
  const theme = themeFromPreset(presetId);
  if (typeof raw?.theme?.radius === "number") theme.radius = Math.max(0, Math.min(36, raw.theme.radius));
  if (["compact", "normal", "spacious"].includes(raw?.theme?.density)) theme.density = raw.theme.density;
  if (raw?.theme?.mode === "light" || raw?.theme?.mode === "dark") theme.mode = raw.theme.mode;
  if (raw?.theme?.colors?.accent && /^#[0-9a-f]{3,8}$/i.test(raw.theme.colors.accent))
    theme.colors.accent = raw.theme.colors.accent;

  const vertical = ["cod", "digital", "saas", "service"].includes(raw?.vertical) ? raw.vertical : brief.vertical;
  const name = String(raw?.name || brief.productName).slice(0, 60);
  const currency = String(raw?.product?.currency || brief.currency).toUpperCase().slice(0, 3);

  const spec = PageSpecSchema.parse({
    schemaVersion: 1,
    id: fallback.id,
    name,
    slug: slugify(name),
    vertical,
    locale: raw?.locale || "es",
    meta: {
      title: String(raw?.meta?.title || fallback.meta.title).slice(0, 70),
      description: String(raw?.meta?.description || fallback.meta.description).slice(0, 170),
      ogImage: "",
    },
    product: {
      name: String(raw?.product?.name || name),
      sku: "",
      price: num(raw?.product?.price, brief.price),
      compareAtPrice: num(raw?.product?.compareAtPrice, brief.compareAtPrice),
      currency,
      images: [],
      variants: variantsDe(raw?.product?.variants),
    },
    settings: fallback.settings,
    theme,
    blocks,
    createdAt: fallback.createdAt,
    updatedAt: new Date().toISOString(),
  });

  return { spec, warnings };
}

function num(v: any, d: number): number {
  const n = Number(String(v ?? "").toString().replace(/[^\d.-]/g, ""));
  return isFinite(n) && n > 0 ? n : d;
}

/** Variantes del LLM: solo grupos con nombre y 1-8 opciones cortas. */
function variantsDe(v: any): Array<{ name: string; options: string[] }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((g: any) => ({
      name: String(g?.name || "").trim().slice(0, 24),
      options: (Array.isArray(g?.options) ? g.options : []).map((o: any) => String(o || "").trim().slice(0, 24)).filter(Boolean).slice(0, 8),
    }))
    .filter((g) => g.name && g.options.length > 0)
    .slice(0, 3);
}

function sanitizeProps(p: any): Record<string, any> {
  if (!p || typeof p !== "object" || Array.isArray(p)) return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === "string") out[k] = v.replace(/\[[^\]]{0,40}\]/g, "").trim();
    else out[k] = v;
  }
  return out;
}

export interface GenerateOpts {
  id?: string;
  /** datos reales extraídos de una URL de producto */
  source?: ExtractedProduct;
  /** modo pro: composición libre desde cero */
  pro?: boolean;
  /** pizarrón: spec existente que la IA debe transformar */
  baseSpec?: PageSpec;
  /** plantilla elegida manualmente en el dashboard */
  templateId?: string;
  /** IA activa de Atlas (el bot la manda): si resuelve, genera con esa */
  provider?: { providerId?: string; model?: string };
  /** Origen del trafico ("facebook" por defecto en fisico): ajusta angulo y diseno. */
  trafico?: string;
}

/** Fija en el spec los datos que vienen de una ficha real: el LLM escribe el
 *  copy, pero el precio, el nombre y las fotos los manda la fuente. */
function applySource(spec: PageSpec, src: ExtractedProduct): PageSpec {
  const out = { ...spec, product: { ...spec.product } };
  if (src.name) out.product.name = src.name;
  if (src.price) out.product.price = src.price;
  // El precio tachado: o viene de la ficha, o tiene que ser creíble.
  // Un LLM al que le dices "Colombia" es capaz de poner 129900 junto a un precio de 22 USD.
  if (src.compareAtPrice > src.price) {
    out.product.compareAtPrice = src.compareAtPrice;
  } else {
    // Sin precio anterior REAL no hay tachado: el "antes $X" inventado es
    // publicidad falsa, rompe la confianza y la coherencia de precios.
    // La oferta se comunica con "precio de lanzamiento" + urgencia real.
    out.product.compareAtPrice = 0;
  }
  if (src.currency) out.product.currency = src.currency;
  if (src.sku) out.product.sku = src.sku;
  if (src.images?.length) out.product.images = src.images.slice(0, 12);

  const price = out.product.price;
  const compare = out.product.compareAtPrice;
  const imgs = out.product.images || [];
  const vids: string[] = (src as any).videos || [];

  out.blocks = spec.blocks.map((b) => {
    const p: any = { ...b.props };

    // alinear cualquier precio suelto que el LLM haya escrito en los bloques
    if (price) {
      if (typeof p.price === "number" && p.price > 0) p.price = price;
      if (typeof p.compareAtPrice === "number") p.compareAtPrice = compare || 0;
      if (p.currency) p.currency = out.product.currency || p.currency;
      if (Array.isArray(p.options)) {
        p.options = p.options.map((o: any) => {
          const qty = Number(o?.qty) || 1;
          const unit = price * qty;
          return {
            ...o,
            price: Math.round(unit * (qty > 1 ? 0.85 : 1)),
            compareAtPrice: compare ? Math.round(compare * qty) : qty > 1 ? Math.round(unit) : 0,
          };
        });
      }
    }

    if (!imgs.length) return { ...b, props: p };
    if (b.type === "hero") p.image = imgs[0];
    if (b.type === "hero" && b.variant === "vsl" && vids[0] && !p.videoUrl) p.videoUrl = vids[0];
    if (b.type === "video" && vids[0] && !p.videoUrl) p.videoUrl = vids[0];
    if (b.type === "gallery") {
      const current = Array.isArray(p.items) ? p.items : [];
      const norm = current
        .map((c: any) => (c && (c.src || c.image) ? { ...c, src: String(c.src || c.image) } : c))
        .filter((c: any) => c && c.src);
      const bySrc = new Map<string, any>(norm.map((c: any) => [c.src, c]));
      // La foto del hero (imgs[0]) NO se repite en la galeria: arriba se
      // presenta el producto, abajo se muestran LAS DEMAS. Si no queda
      // ninguna, la galeria se vacia y el prune la quita (mejor sin galeria
      // que con la misma foto dos veces).
      const resto = imgs.slice(1);
      const fromSource = resto.map((u) => bySrc.get(u) || { src: u });
      const extra = norm.filter((c: any) => c.src !== imgs[0] && !imgs.includes(c.src));
      p.items = [...fromSource, ...extra];
    }
    if (b.type === "beforeAfter") {
      if (!p.beforeImage) p.beforeImage = imgs[0];
      if (!p.afterImage && imgs[1]) p.afterImage = imgs[1];
    }
    if (b.type === "bundle" || b.type === "codForm") {
      if (!p.image) p.image = imgs[0];
    }
    return { ...b, props: p };
  });

  // Si el modelo no creo galeria y hay mas de una foto, la agregamos despues
  // del hero: la principal arriba (hero) y las demas abajo, mezcladas con el resto.
  if (imgs.length >= 2 && !out.blocks.some((b) => b.type === "gallery")) {
    const gi = out.blocks.findIndex((b) => b.type === "hero");
    out.blocks.splice(gi >= 0 ? gi + 1 : out.blocks.length, 0, {
      id: "gal_products",
      type: "gallery",
      variant: "grid",
      visible: true,
      props: { title: "", items: imgs.map((u) => ({ src: u })), bg: "default" },
    });
  }
  return out;
}

/**
 * Ningún bloque de copy queda con el título vacío.
 *
 * El modelo a veces devuelve title:"" (pisando el default del catálogo) y el
 * bloque sale sin encabezado — como el problem sin título. Esto lo rellena
 * con el título por defecto del catálogo, que es marco neutro, no copy
 * inventado. Solo bloques de copy/persuasión; galería y hero se dejan quietos.
 */
const CON_TITULO_OBLIGADO = ["problem", "faq", "benefits", "reviewsUgc", "testimonials", "guarantee", "bundle", "codForm", "ctaFinal", "comparison", "beforeAfter", "steps", "valueStack"];
/** Ultimo paso de toda generacion COD: el precio de cada bloque es el del
 *  producto. applySource solo corre con URL; sin ella (o tras la revision
 *  experta) quedaban bloques con otra cifra: caso real site_l43ah0t, hero y
 *  CTA fijo en $2.000 con "$89.900" tachado y -98% sobre un producto de 89900.
 *  El tachado solo sobrevive si es el precio anterior REAL del producto. */
function alinearPrecios(spec: PageSpec): PageSpec {
  const price = Number(spec.product?.price) || 0;
  if (spec.vertical !== "cod" || price <= 0) return spec;
  const compare = Number(spec.product?.compareAtPrice) > price ? Number(spec.product.compareAtPrice) : 0;
  return {
    ...spec,
    blocks: spec.blocks.map((b) => {
      const p: any = b.props;
      if (!p || typeof p.price !== "number" || p.price <= 0) return b;
      if (p.price === price && (p.compareAtPrice ?? 0) === compare) return b;
      return { ...b, props: { ...p, price, ...(typeof p.compareAtPrice === "number" ? { compareAtPrice: compare } : {}) } };
    }),
  };
}

function rellenarTitulos(spec: PageSpec): PageSpec {
  return {
    ...spec,
    blocks: spec.blocks.map((b: any) => {
      if (!CON_TITULO_OBLIGADO.includes(b?.type)) return b;
      const p: any = { ...(b.props as any) };
      if (!String(p.title || "").trim()) {
        // withDefaults con props vacias = los defaults del catalogo.
        const d = (withDefaults(b.type, {}) as any)?.title;
        if (d && String(d).trim()) p.title = String(d);
      }
      return { ...b, props: p };
    }),
  } as PageSpec;
}

/**
 * Dedupe final de la galeria contra el hero (corre DESPUES de la pasada
 * visual, que tambien puede agregar fotos). La foto del hero no se repite
 * abajo; si la galeria queda vacia, se quita el bloque (el prune igual lo
 * haria, pero asi no depende de el).
 */
export function dedupGallery(spec: PageSpec): PageSpec {
  const hero = (spec.blocks as any[]).find((b) => b?.type === "hero");
  const srcHero = hero?.props?.image || (spec.product?.images || [])[0] || "";
  if (!srcHero) return spec;
  const blocks = (spec.blocks as any[])
    .map((b: any) => {
      if (b?.type !== "gallery") return b;
      const items = (Array.isArray(b.props?.items) ? b.props.items : []).filter((it: any) => {
        const u = String(it?.src || it?.image || "");
        return u && u !== srcHero;
      });
      return { ...b, props: { ...(b.props as any), items } };
    })
    .filter((b: any) => b?.type !== "gallery" || (Array.isArray(b.props?.items) && b.props.items.length > 0));
  return { ...spec, blocks } as PageSpec;
}

/** Tine el tema con la paleta del producto (acento + contraste). No toca layout. */
function applyPalette(spec: PageSpec, pal: PaletteInfo): PageSpec {
  const ok = /^#[0-9a-f]{6}$/i.test(pal.accent || "");
  if (!ok) return spec;
  const out = { ...spec, theme: { ...spec.theme, colors: { ...spec.theme.colors } } };
  (out.theme.colors as any).accent = pal.accent;
  const r = parseInt(pal.accent.slice(1, 3), 16);
  const g = parseInt(pal.accent.slice(3, 5), 16);
  const b = parseInt(pal.accent.slice(5, 7), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  (out.theme.colors as any).accentFg = lum > 0.6 ? "#0b0d12" : "#ffffff";
  if (/^#[0-9a-f]{6}$/i.test(pal.accent2 || "")) (out.theme.colors as any).accent2 = pal.accent2;
  return out;
}

export async function generateSpec(prompt: string, opts: GenerateOpts = {}): Promise<GenerateResult> {
  const t0 = Date.now();
  const base = generateDeterministic(prompt, opts.id ? { id: opts.id } : {});
  const tpl = opts.templateId ? TEMPLATE_BY_ID[opts.templateId] : undefined;
  if (tpl && PRESET_BY_ID[tpl.preset]) base.theme = themeFromPreset(tpl.preset);
  const fallback = opts.source ? applySource(base, opts.source) : base;

  // Paleta desde las fotos reales (mejor esfuerzo): acento + claro/oscuro
  // para que tema y diseno vayan con el producto.
  let palette: PaletteInfo | null = null;
  try {
    if (opts.source?.images?.length) palette = await analyzePalette(opts.source.images);
  } catch { palette = null; }
  const themed = (s: PageSpec) => (palette && palette.accent ? applyPalette(s, palette) : s);

  const cfg = await resolveProvider(opts.provider);
  if (cfg.id === "none") {
    const fb = rellenarTitulos(themed(fallback));
    const w0 = ["Sin API key de IA configurada: se usó el generador determinista (estructura + copy por plantilla)."];
    const h0 = chequearAIDA(fb, fb.product?.name || "", fb.vertical || "");
    if (h0.length) w0.push(`Chequeo AIDA del plan B: ${h0.length} observaciones (${h0.map((h) => h.bloque).join(", ")}).`);
    return {
      spec: alinearPrecios(fb),
      engine: "deterministic",
      provider: "none",
      model: "",
      ms: Date.now() - t0,
      warnings: w0,
    };
  }

  const { id: pid, model } = cfg;
  const brief = parseBrief(prompt);
  const avisos: string[] = [];

  // ── Fase 1: ANALISIS previo (no crear por crear) ──────────────────────
  // Avatar, dolores, promesa, angulo y objeciones ANTES de escribir el copy.
  // Se inyecta al arquitecto y se devuelve para que el dueno vea el
  // pensamiento. No bloquea: si falla, la generacion sigue igual.
  let analisis: AnalisisLanding | null = null;
  try {
    const src0: any = opts.source || {};
    const a = await analizarBrief(
      {
        producto: String(src0.name || (brief as any).productName || prompt).slice(0, 120),
        precio: src0.price ? String(src0.price) : undefined,
        moneda: src0.currency || (brief as any).currency,
        pais: (brief as any).country,
        trafico: opts.trafico || (brief.vertical === "cod" ? "facebook" : "organico"),
        descripcion: String(src0.description || "").slice(0, 600),
        vertical: brief.vertical,
      },
      opts.provider,
    );
    analisis = a.analisis;
    if (a.warning) avisos.push(a.warning);
  } catch (e: any) {
    avisos.push(`Analisis previo no corrio (${String(e?.message || e).slice(0, 100)}).`);
  }
  const effectivePrompt = tpl ? `[Plantilla elegida: ${tpl.name} — ${tpl.hint}. Tono: ${tpl.tone}] ${prompt}` : prompt;
  const baseSummary = opts.baseSpec
    ? `vertical=${opts.baseSpec.vertical} · tema=${opts.baseSpec.theme.preset}\n` +
      opts.baseSpec.blocks.map((b, i) => `${i}. type=${b.type} variant=${b.variant} props=${JSON.stringify(b.props).slice(0, 300)}`).join("\n").slice(0, 12000)
    : undefined;
  const pedido = {
    system: architectSystem(),
    user: architectUser(effectivePrompt, {
      vertical: tpl?.vertical || brief.vertical,
      preset: tpl?.preset || suggestPreset(prompt, brief.vertical),
      source: opts.source,
      palette: palette || undefined,
      pro: opts.pro,
      baseSummary,
      analisis: analisis || undefined,
    }),
    json: true as const,
    maxTokens: 6000,
    temperature: 0.8,
    provider: opts.provider,
  };
  try {
    let norm: ReturnType<typeof normalizeToSpec>;
    try {
      const res = await complete(pedido);
      norm = normalizeToSpec(extractJson(res.text), prompt, fallback);
      if (norm.spec.blocks.length < 4 || norm.warnings.some((w) => /pocos bloques/i.test(w))) throw new Error("pocos bloques");
    } catch {
      // Reintento UNICO ante respuesta trunca: lo transitorio (corte a mitad
      // del JSON) no debe degradar a plantilla sin pelearla una vez.
      avisos.push("La primera respuesta de la IA vino incompleta; reintentando una vez.");
      const res2 = await complete(pedido);
      norm = normalizeToSpec(extractJson(res2.text), prompt, fallback);
    }
    let spec = themed(opts.source ? applySource(norm.spec, opts.source) : norm.spec);
    avisos.push(...norm.warnings);

    // ── Fase 3: REVISION EXPERTA (solo si el chequeo AIDA marca fallos) ──
    // El copy bueno no paga segundo pase; el flojo lo corrige el experto.
    const hallazgos = chequearAIDA(spec, spec.product?.name || "", spec.vertical || "");
    if (hallazgos.length) {
      try {
        const rev = await revisionExperta(spec, hallazgos, opts.provider);
        if (rev.aplicadas > 0) {
          spec = rev.spec;
          avisos.push(`Revision experta: ${rev.aplicadas} ajustes AIDA${rev.detalle ? ` (${rev.detalle})` : ""}.`);
        } else {
          avisos.push(`Chequeo AIDA: ${hallazgos.length} observaciones sin corregir (${hallazgos.map((h) => h.bloque).join(", ")}).`);
        }
      } catch (e: any) {
        avisos.push(`Revision experta no corrio (${String(e?.message || e).slice(0, 100)}).`);
      }
    }
    spec = alinearPrecios(rellenarTitulos(spec));
    return { spec, engine: "llm", provider: pid, model, ms: Date.now() - t0, warnings: avisos, analisis };
  } catch (e: any) {
    avisos.push(`La IA falló (${String(e.message || e).slice(0, 180)}); se usó el generador determinista.`);
    let fb = rellenarTitulos(themed(fallback));
    // Rescate con llamada chica: si el fallo fue la respuesta grande (trunca),
    // el experto igual puede levantar el plan B; si el proveedor esta caido,
    // falla rapido y queda el aviso honesto.
    try {
      const h = chequearAIDA(fb, fb.product?.name || "", fb.vertical || "");
      if (h.length) {
        const rev = await revisionExperta(fb, h, opts.provider);
        if (rev.aplicadas > 0) {
          fb = rellenarTitulos(rev.spec);
          avisos.push(`Rescate del plan B: ${rev.aplicadas} ajustes AIDA.`);
        } else {
          avisos.push(`Chequeo AIDA del plan B: ${h.length} observaciones (${h.map((x) => x.bloque).join(", ")}).`);
        }
      }
    } catch {
      /* queda el plan B tal cual, avisado */
    }
    return {
      spec: alinearPrecios(fb),
      engine: "deterministic",
      provider: pid,
      model,
      ms: Date.now() - t0,
      warnings: avisos,
      analisis,
    };
  }
}

/* ------------------------------- edición ------------------------------- */

export async function editSpec(spec: PageSpec, instruction: string, provider?: { providerId?: string; model?: string }): Promise<EditResult> {
  const cfg = await resolveProvider(provider);
  if (cfg.id !== "none") {
    try {
      const res = await complete({
        system: editSystem(spec),
        user: editUser(instruction, spec),
        json: true,
        maxTokens: 6000,
        temperature: 0.5,
        provider,
      });
      const raw = extractJson(res.text);
      const ops: EditOp[] = [];
      for (const o of raw?.ops ?? []) {
        const parsed = EditOpSchema.safeParse(o);
        if (parsed.success) ops.push(parsed.data);
      }
      if (ops.length) {
        let final = applyOps(spec, ops);
        let nota = String(raw?.reply || "Listo.");
        // La edicion tambien pasa por el experto: un cambio de copy puede
        // romper el AIDA (ej: titular vuelto al nombre del producto).
        const hallazgos = chequearAIDA(final, final.product?.name || "", final.vertical || "");
        if (hallazgos.length) {
          try {
            const rev = await revisionExperta(final, hallazgos, provider);
            if (rev.aplicadas > 0) {
              final = rev.spec;
              nota += ` Revision experta: ${rev.aplicadas} ajustes AIDA.`;
            }
          } catch {
            /* el cambio igual se guarda */
          }
        }
        final = rellenarTitulos(final);
        return { spec: final, reply: nota, ops, engine: "llm" };
      }
    } catch {
      /* cae al modo local */
    }
  }
  return localEdit(spec, instruction);
}

export { localEdit };
export type { EditResult } from "./localEdit";
