import { z } from "zod";
import { applyMode, themeFromPreset } from "./theme";

/* ------------------------------------------------------------------ *
 *  PageSpec — única fuente de verdad.
 *  La IA la genera, el editor la muta, el renderer la pinta,
 *  el exportador la convierte en un HTML autocontenido.
 * ------------------------------------------------------------------ */

export const VERTICALS = ["cod", "digital", "saas", "service"] as const;
export type Vertical = (typeof VERTICALS)[number];

export const VERTICAL_LABEL: Record<Vertical, string> = {
  cod: "Producto físico · contraentrega",
  digital: "Producto digital · infoproducto",
  saas: "SaaS · suscripción",
  service: "Servicio · agencia",
};

export const ThemeSchema = z.object({
  preset: z.string().default("midnight"),
  mode: z.enum(["dark", "light"]).default("dark"),
  colors: z
    .object({
      bg: z.string().default("#08080b"),
      surface: z.string().default("#101014"),
      surfaceAlt: z.string().default("#16161c"),
      border: z.string().default("#262630"),
      text: z.string().default("#f7f7f8"),
      muted: z.string().default("#9b9ba6"),
      accent: z.string().default("#6d5efc"),
      accentFg: z.string().default("#ffffff"),
      accent2: z.string().default("#22d3ee"),
      success: z.string().default("#22c55e"),
      danger: z.string().default("#f43f5e"),
    })
    .default({}),
  fonts: z
    .object({
      display: z.string().default("Space Grotesk"),
      sans: z.string().default("Inter"),
      webfonts: z.boolean().default(true),
    })
    .default({}),
  radius: z.number().default(18),
  maxWidth: z.number().default(1180),
  density: z.enum(["compact", "normal", "spacious"]).default("normal"),
  effects: z
    .object({
      grain: z.boolean().default(true),
      glow: z.boolean().default(true),
      animate: z.boolean().default(true),
    })
    .default({}),
});
export type Theme = z.infer<typeof ThemeSchema>;

export const BlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  variant: z.string().default("default"),
  visible: z.boolean().default(true),
  props: z.record(z.any()).default({}),
});
export type Block = z.infer<typeof BlockSchema>;

export const ProductSchema = z.object({
  name: z.string().default(""),
  sku: z.string().default(""),
  price: z.number().default(0),
  compareAtPrice: z.number().default(0),
  currency: z.string().default("COP"),
  images: z.array(z.string()).default([]),
  dropiProductId: z.union([z.string(), z.number()]).optional(),
  dropiVariationId: z.union([z.string(), z.number()]).optional(),
  /**
   * Variantes que el cliente elige (color/talla/modelo). Ej:
   * [{ name: "Color", options: ["Negro", "Azul"] }, { name: "Talla", options: ["S","M","L"] }].
   * Si el producto no las exige, []. El formulario las muestra como
   * selectores y manda la combinación elegida con el pedido.
   */
  variants: z.array(z.object({ name: z.string(), options: z.array(z.string()) })).default([]),
  /**
   * Mapa combinación -> variation_id de Dropi ("Negro / M" -> "12345").
   * Se llena al vincular el producto de Dropi; si está vacío, la variante
   * igual viaja en el pedido (notas + WhatsApp) pero sin variation_id.
   */
  dropiVariationMap: z.record(z.string()).default({}),
});
export type Product = z.infer<typeof ProductSchema>;

export const SettingsSchema = z.object({
  whatsapp: z.string().default(""),
  whatsappMessage: z.string().default("Hola, quiero más información 👋"),
  endpoint: z.string().default(""),
  consentText: z
    .string()
    .default(
      "Autorizo el tratamiento de mis datos personales conforme a la Política de Privacidad.",
    ),
  integration: z
    .object({
      provider: z
        .enum(["none", "dropi", "webhook", "whatsapp", "email"])
        .default("none"),
      webhookUrl: z.string().default(""),
      successMessage: z
        .string()
        .default("¡Listo! Recibimos tu pedido, te contactamos para confirmarlo."),
      redirectUrl: z.string().default(""),
    })
    .default({}),
  /** Negocio y producto de VentasPro (lo pone Atlas al crearla). Con esto el
   *  pedido del formulario se procesa en VentasPro: Dropi con el token del
   *  negocio, pantalla Pedidos, reintento y avisos. Ver /api/public/orders. */
  ventaspro: z
    .object({
      tenantId: z.number().int().positive().optional(),
      productId: z.number().int().positive().optional(),
    })
    .default({}),
  checkout: z
    .object({
      provider: z
        .enum(["none", "stripe", "lemonsqueezy", "paddle", "mercadopago", "wompi", "bold", "hotmart", "custom"])
        .default("none"),
      url: z.string().default(""),
    })
    .default({}),
  pixels: z
    .object({
      metaPixelId: z.string().default(""),
      tiktokPixelId: z.string().default(""),
      ga4Id: z.string().default(""),
      googleAdsId: z.string().default(""),
      customHead: z.string().default(""),
    })
    .default({}),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const PageSpecSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  id: z.string(),
  name: z.string().default("Landing sin título"),
  slug: z.string().default("landing"),
  vertical: z.enum(VERTICALS).default("cod"),
  locale: z.string().default("es"),
  meta: z
    .object({
      title: z.string().default(""),
      description: z.string().default(""),
      ogImage: z.string().default(""),
    })
    .default({}),
  product: ProductSchema.default({}),
  settings: SettingsSchema.default({}),
  theme: ThemeSchema.default({}),
  blocks: z.array(BlockSchema).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type PageSpec = z.infer<typeof PageSpecSchema>;

/* ---------------- Operaciones de edición (las usa la IA y el editor) -------- */

export const EditOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("setProp"), blockId: z.string(), path: z.string(), value: z.any() }),
  z.object({ op: z.literal("setVariant"), blockId: z.string(), variant: z.string() }),
  z.object({ op: z.literal("setVisible"), blockId: z.string(), visible: z.boolean() }),
  z.object({ op: z.literal("removeBlock"), blockId: z.string() }),
  z.object({ op: z.literal("moveBlock"), blockId: z.string(), toIndex: z.number() }),
  z.object({ op: z.literal("addBlock"), block: BlockSchema, atIndex: z.number().optional() }),
  z.object({ op: z.literal("setTheme"), patch: z.record(z.any()) }),
  z.object({ op: z.literal("setMeta"), patch: z.record(z.any()) }),
  z.object({ op: z.literal("setSettings"), patch: z.record(z.any()) }),
  z.object({ op: z.literal("setProduct"), patch: z.record(z.any()) }),
]);
export type EditOp = z.infer<typeof EditOpSchema>;

/* ---------------- utilidades ---------------- */

export function uid(prefix = "b"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "landing";
}

/** set anidado por path "a.b.0.c" */
export function setPath(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const nextIsIndex = /^\d+$/.test(parts[i + 1]);
    if (cur[k] === undefined || cur[k] === null) cur[k] = nextIsIndex ? [] : {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

export function getPath(obj: any, path: string): any {
  return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
}

export function applyOps(spec: PageSpec, ops: EditOp[]): PageSpec {
  const next: PageSpec = JSON.parse(JSON.stringify(spec));
  for (const o of ops) {
    switch (o.op) {
      case "setProp": {
        const b = next.blocks.find((x) => x.id === o.blockId);
        if (b) setPath(b.props, o.path, o.value);
        break;
      }
      case "setVariant": {
        const b = next.blocks.find((x) => x.id === o.blockId);
        if (b) b.variant = o.variant;
        break;
      }
      case "setVisible": {
        const b = next.blocks.find((x) => x.id === o.blockId);
        if (b) b.visible = o.visible;
        break;
      }
      case "removeBlock":
        next.blocks = next.blocks.filter((x) => x.id !== o.blockId);
        break;
      case "moveBlock": {
        const i = next.blocks.findIndex((x) => x.id === o.blockId);
        if (i >= 0) {
          const [b] = next.blocks.splice(i, 1);
          next.blocks.splice(Math.max(0, Math.min(next.blocks.length, o.toIndex)), 0, b);
        }
        break;
      }
      case "addBlock": {
        const b = BlockSchema.parse({ ...o.block, id: o.block.id || uid() });
        if (o.atIndex === undefined) next.blocks.push(b);
        else next.blocks.splice(o.atIndex, 0, b);
        break;
      }
      case "setTheme": {
        const prevMode = next.theme?.mode;
        const wantsMode = o.patch?.mode && o.patch.mode !== prevMode;
        const wantsPreset = o.patch?.preset && o.patch.preset !== next.theme?.preset;
        const bringsColors = o.patch?.colors && Object.keys(o.patch.colors).length > 0;
        deepMerge(next.theme, o.patch);
        // «ponlo oscuro» o «usa el preset X» deben recalcular la paleta,
        // no dejar el modo nuevo con los colores viejos.
        if (!bringsColors && (wantsMode || wantsPreset)) {
          const target = next.theme.mode === "light" ? "light" : "dark";
          const base = wantsPreset
            ? themeFromPreset(next.theme.preset, { fonts: next.theme.fonts })
            : { ...next.theme, mode: prevMode }; // applyMode no hace nada si ya está en ese modo
          next.theme = applyMode(base as any, target) as any;
        }
        break;
      }
      case "setMeta":
        deepMerge(next.meta, o.patch);
        break;
      case "setSettings":
        deepMerge(next.settings, o.patch);
        break;
      case "setProduct":
        deepMerge(next.product, o.patch);
        break;
    }
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

export function deepMerge(target: any, patch: any): any {
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== "object") target[k] = {};
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}
