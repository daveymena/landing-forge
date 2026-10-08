import fs from "node:fs/promises";
import path from "node:path";
import type { PageSpec } from "./schema";

/* ------------------------------------------------------------------ *
 *  Almacén en archivos JSON. Interfaz pensada para cambiarse por
 *  Prisma/Postgres sin tocar el resto de la app (multi-tenant futuro).
 * ------------------------------------------------------------------ */

const DIR = path.join(process.cwd(), "data");
const SITES = path.join(DIR, "sites.json");
const ORDERS = path.join(DIR, "orders.json");
const SETTINGS = path.join(DIR, "settings.json");

async function ensure() {
  await fs.mkdir(DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    await ensure();
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await ensure();
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

/* ------------------------------- sitios ------------------------------- */

export async function listSites(): Promise<PageSpec[]> {
  const all = await readJson<PageSpec[]>(SITES, []);
  return all.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function getSite(id: string): Promise<PageSpec | null> {
  const all = await readJson<PageSpec[]>(SITES, []);
  return all.find((s) => s.id === id) ?? null;
}

export async function getSiteBySlug(slug: string): Promise<PageSpec | null> {
  const all = await readJson<PageSpec[]>(SITES, []);
  return all.find((s) => s.slug === slug) ?? null;
}

export async function saveSite(spec: PageSpec): Promise<PageSpec> {
  const all = await readJson<PageSpec[]>(SITES, []);
  const i = all.findIndex((s) => s.id === spec.id);
  const next = { ...spec, updatedAt: new Date().toISOString() };
  if (i >= 0) all[i] = next;
  else all.unshift(next);
  await writeJson(SITES, all.slice(0, 300));
  return next;
}

export async function deleteSite(id: string): Promise<void> {
  const all = await readJson<PageSpec[]>(SITES, []);
  await writeJson(SITES, all.filter((s) => s.id !== id));
}

/* ------------------------------- pedidos ------------------------------- */

export interface OrderRecord {
  id: string;
  siteId: string;
  slug: string;
  kind: "cod" | "lead";
  status: "nuevo" | "enviado_proveedor" | "error";
  provider: string;
  providerOrderId?: string | number;
  providerError?: string;
  payload: Record<string, any>;
  createdAt: string;
}

export async function listOrders(siteId?: string): Promise<OrderRecord[]> {
  const all = await readJson<OrderRecord[]>(ORDERS, []);
  return siteId ? all.filter((o) => o.siteId === siteId) : all;
}

export async function addOrder(o: OrderRecord): Promise<OrderRecord> {
  const all = await readJson<OrderRecord[]>(ORDERS, []);
  all.unshift(o);
  await writeJson(ORDERS, all.slice(0, 2000));
  return o;
}

/* ------------------------------ ajustes ------------------------------ */

export type AiProviderId =
  | "auto"
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "ollama"
  | "ollama-cloud"
  | "github-models"
  | "openrouter"
  | "opencode"
  | "custom";

export interface AppSettings {
  dropi: {
    enabled: boolean;
    env: "test" | "prod";
    token: string;
    authScheme: "bearer" | "integration-key";
    country: string;
    baseUrlOverride: string;
  };
  ai: {
    /** "auto" = el primero del entorno que tenga credenciales */
    provider: AiProviderId;
    model: string;
    apiKey: string;
    /** sólo para ollama / custom / overrides */
    baseUrl: string;
    /** modelos de respaldo si el principal falla (rate limit de los free) */
    fallbacks: string[];
    temperature: number;
  };
  /** Píxel global del negocio (08-10): fallback cuando la landing no trae propio. */
  pixels: {
    metaPixelId: string;
    tiktokPixelId: string;
    ga4Id: string;
    googleAdsId: string;
    customHead: string;
  };
  updatedAt?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dropi: {
    enabled: false,
    env: (process.env.DROPI_ENV as "test" | "prod") || "test",
    token: process.env.DROPI_TOKEN || "",
    authScheme: (process.env.DROPI_AUTH_SCHEME as "bearer" | "integration-key") || "bearer",
    country: process.env.DROPI_COUNTRY || "co",
    baseUrlOverride: "",
  },
  ai: {
    provider: (process.env.AI_PROVIDER as AiProviderId) || "auto",
    model: process.env.AI_MODEL || "",
    apiKey: "",
    baseUrl: process.env.AI_BASE_URL || "",
    fallbacks: [],
    temperature: 0.7,
  },
  pixels: {
    metaPixelId: process.env.META_PIXEL_ID || "",
    tiktokPixelId: "",
    ga4Id: "",
    googleAdsId: "",
    customHead: "",
  },
};

export async function getSettings(): Promise<AppSettings> {
  const s = await readJson<AppSettings>(SETTINGS, DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    dropi: { ...DEFAULT_SETTINGS.dropi, ...(s.dropi || {}) },
    ai: { ...DEFAULT_SETTINGS.ai, ...(s.ai || {}) },
  };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const cur = await getSettings();
  const next: AppSettings = {
    ...cur,
    ...patch,
    dropi: { ...cur.dropi, ...(patch.dropi || {}) },
    ai: { ...cur.ai, ...(patch.ai || {}) },
    pixels: { ...(cur as any).pixels, ...((patch as any).pixels || {}) },
    updatedAt: new Date().toISOString(),
  };
  await writeJson(SETTINGS, next);
  return next;
}

/** Nunca devolvemos el token completo al cliente */
const mask = (t: string) => (t ? `••••••••${t.length > 12 ? t.slice(-4) : ""}` : "");

/** Nunca devolvemos tokens completos al cliente */
export function redactSettings(s: AppSettings) {
  return {
    ...s,
    dropi: { ...s.dropi, token: mask(s.dropi.token), hasToken: !!s.dropi.token },
    ai: { ...s.ai, apiKey: mask(s.ai.apiKey), hasApiKey: !!s.ai.apiKey },
  };
}
