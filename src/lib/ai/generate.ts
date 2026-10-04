import { PageSpecSchema, uid, slugify, applyOps, EditOpSchema, type EditOp, type PageSpec } from "../schema";
import { localEdit, type EditResult } from "./localEdit";
import { BY_TYPE, withDefaults } from "../blocks/catalog";
import { themeFromPreset, PRESET_BY_ID, suggestPreset } from "../theme";
import { TEMPLATE_BY_ID } from "../templates";
import { generateDeterministic } from "./deterministic";
import { parseBrief } from "./brief";
import { complete, extractJson, resolveProvider } from "./provider";
import { architectSystem, architectUser, editSystem, editUser } from "./prompts";
import type { ExtractedProduct } from "../extract";

export interface GenerateResult {
  spec: PageSpec;
  engine: "llm" | "deterministic";
  provider: string;
  model: string;
  ms: number;
  warnings: string[];
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
  } else if (src.price) {
    const c = Number(out.product.compareAtPrice) || 0;
    if (c <= src.price || c > src.price * 5) out.product.compareAtPrice = 0;
  }
  if (src.currency) out.product.currency = src.currency;
  if (src.sku) out.product.sku = src.sku;
  if (src.images?.length) out.product.images = src.images.slice(0, 8);

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
    if (b.type === "hero" && !p.image) p.image = imgs[0];
    if (b.type === "hero" && b.variant === "vsl" && vids[0] && !p.videoUrl) p.videoUrl = vids[0];
    if (b.type === "video" && vids[0] && !p.videoUrl) p.videoUrl = vids[0];
    if (b.type === "gallery") {
      const current = Array.isArray(p.items) ? p.items : [];
      p.items = imgs.slice(0, 6).map((src2, i) => ({ ...(current[i] || {}), image: src2 }));
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
  return out;
}

export async function generateSpec(prompt: string, opts: GenerateOpts = {}): Promise<GenerateResult> {
  const t0 = Date.now();
  const base = generateDeterministic(prompt, opts.id ? { id: opts.id } : {});
  const tpl = opts.templateId ? TEMPLATE_BY_ID[opts.templateId] : undefined;
  if (tpl && PRESET_BY_ID[tpl.preset]) base.theme = themeFromPreset(tpl.preset);
  const fallback = opts.source ? applySource(base, opts.source) : base;

  const cfg = await resolveProvider();
  if (cfg.id === "none") {
    return {
      spec: fallback,
      engine: "deterministic",
      provider: "none",
      model: "",
      ms: Date.now() - t0,
      warnings: ["Sin API key de IA configurada: se usó el generador determinista (estructura + copy por plantilla)."],
    };
  }

  const { id: pid, model } = cfg;
  const brief = parseBrief(prompt);
  const effectivePrompt = tpl ? `[Plantilla elegida: ${tpl.name} — ${tpl.hint}. Tono: ${tpl.tone}] ${prompt}` : prompt;
  const baseSummary = opts.baseSpec
    ? `vertical=${opts.baseSpec.vertical} · tema=${opts.baseSpec.theme.preset}\n` +
      opts.baseSpec.blocks.map((b, i) => `${i}. type=${b.type} variant=${b.variant} props=${JSON.stringify(b.props).slice(0, 300)}`).join("\n").slice(0, 12000)
    : undefined;
  try {
    const res = await complete({
      system: architectSystem(),
      user: architectUser(effectivePrompt, {
        vertical: tpl?.vertical || brief.vertical,
        preset: tpl?.preset || suggestPreset(prompt, brief.vertical),
        source: opts.source,
        pro: opts.pro,
        baseSummary,
      }),
      json: true,
      maxTokens: 6000,
      temperature: 0.8,
    });
    const raw = extractJson(res.text);
    const norm = normalizeToSpec(raw, prompt, fallback);
    const spec = opts.source ? applySource(norm.spec, opts.source) : norm.spec;
    return { spec, engine: "llm", provider: pid, model, ms: Date.now() - t0, warnings: norm.warnings };
  } catch (e: any) {
    return {
      spec: fallback,
      engine: "deterministic",
      provider: pid,
      model,
      ms: Date.now() - t0,
      warnings: [`La IA falló (${String(e.message || e).slice(0, 180)}); se usó el generador determinista.`],
    };
  }
}

/* ------------------------------- edición ------------------------------- */

export async function editSpec(spec: PageSpec, instruction: string): Promise<EditResult> {
  const cfg = await resolveProvider();
  if (cfg.id !== "none") {
    try {
      const res = await complete({
        system: editSystem(spec),
        user: editUser(instruction, spec),
        json: true,
        maxTokens: 6000,
        temperature: 0.5,
      });
      const raw = extractJson(res.text);
      const ops: EditOp[] = [];
      for (const o of raw?.ops ?? []) {
        const parsed = EditOpSchema.safeParse(o);
        if (parsed.success) ops.push(parsed.data);
      }
      if (ops.length) {
        return { spec: applyOps(spec, ops), reply: String(raw?.reply || "Listo."), ops, engine: "llm" };
      }
    } catch {
      /* cae al modo local */
    }
  }
  return localEdit(spec, instruction);
}

export { localEdit };
export type { EditResult } from "./localEdit";
