/* ------------------------------------------------------------------ *
 *  Capa agnóstica de LLM.
 *
 *  Proveedores soportados:
 *    openai      API oficial u OpenAI-compatible (OPENAI_BASE_URL)
 *    anthropic   Claude (Messages API)
 *    gemini      Google AI Studio
 *    groq        Groq Cloud
 *    ollama      Modelos locales (http://localhost:11434/v1)
 *    openrouter  Catálogo enorme, incluidos los modelos ":free"
 *    opencode    OpenCode Zen (https://opencode.ai/zen/v1) con sus modelos free
 *    custom      Cualquier endpoint OpenAI-compatible: opencode-bridge,
 *                ZenBridge, LiteLLM, LM Studio, vLLM, llama.cpp…
 *
 *  La configuración viene de los ajustes guardados (panel de la app) y,
 *  si están vacíos, del entorno. Sin credenciales => generador determinista.
 * ------------------------------------------------------------------ */

import { getSettings, type AiProviderId } from "../db";

export type ProviderId = Exclude<AiProviderId, "auto"> | "none";

export interface LlmResult {
  text: string;
  provider: ProviderId;
  model: string;
  ms: number;
}

export interface ResolvedProvider {
  id: ProviderId;
  model: string;
  baseUrl: string;
  apiKey: string;
  fallbacks: string[];
  temperature: number;
  /** de dónde salió la configuración, para mostrarlo en la UI */
  source: "settings" | "env" | "override" | "none";
}

/* ------------------------- catálogo de proveedores ------------------------- */

export interface ProviderMeta {
  id: Exclude<ProviderId, "none">;
  label: string;
  /** dialecto HTTP */
  kind: "openai" | "anthropic" | "gemini";
  defaultBaseUrl: string;
  defaultModel: string;
  /** false = funciona sin API key (Ollama, bridges locales) */
  needsKey: boolean;
  envKeys: string[];
  /** modelos sugeridos; los gratuitos van primero */
  suggested: { id: string; label: string; free?: boolean }[];
  help: string;
  keyUrl?: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "opencode",
    label: "OpenCode Zen",
    kind: "openai",
    defaultBaseUrl: "https://opencode.ai/zen/v1",
    defaultModel: "big-pickle",
    needsKey: true,
    envKeys: ["OPENCODE_API_KEY", "OPENCODE_ZEN_API_KEY"],
    keyUrl: "https://opencode.ai/auth",
    help:
      "Gateway del equipo de OpenCode. OJO: los modelos gratuitos sólo aceptan peticiones hechas desde dentro de " +
      "OpenCode (si llamas a la API directo responden 403). Para usarlos gratis levanta el puente incluido " +
      "(tools/opencode-bridge) y elige el proveedor «OpenAI-compatible». Con API key de pago funcionan todos.",
    suggested: [
      { id: "big-pickle", label: "Big Pickle (stealth)", free: true },
      { id: "nemotron-3.5-lightning-free", label: "Nemotron 3.5 Lightning", free: true },
      { id: "nemotron-3-ultra-free", label: "Nemotron 3 Ultra", free: true },
      { id: "mimo-v2.6-flash-free", label: "MiMo V2.6 Flash", free: true },
      { id: "ling-3.1-flash-free", label: "Ling 3.1 Flash", free: true },
      { id: "ling-3.0-flash-fin-free", label: "Ling 3.0 Flash", free: true },
      { id: "longcat-2.5-preview-free", label: "LongCat 2.5 Preview", free: true },
      { id: "space-bunny-free", label: "Space Bunny", free: true },
      { id: "fledge-alpha-free", label: "Fledge Alpha", free: true },
      { id: "muse-spark-1.3-contributor-free", label: "Muse Spark 1.3", free: true },
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (pago)" },
      { id: "gpt-5.1", label: "GPT-5.1 (pago)" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "nvidia/nemotron-3-ultra-550b-a55b:free",
    needsKey: true,
    envKeys: ["OPENROUTER_API_KEY"],
    keyUrl: "https://openrouter.ai/keys",
    help:
      "Un solo endpoint para ~470 modelos. Los que acaban en «:free» no gastan saldo (sí tienen límite de " +
      "peticiones por minuto y día). Puedes pulsar «Cargar modelos» sin API key para ver el catálogo, " +
      "pero para generar necesitas una (el registro es gratis).",
    suggested: [
      { id: "openrouter/free", label: "Free Models Router (elige el mejor gratuito)", free: true },
      { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra 550B", free: true },
      { id: "nvidia/nemotron-3.5-lightning:free", label: "Nemotron 3.5 Lightning (rápido)", free: true },
      { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B", free: true },
      { id: "qwen/qwen3.8-27b:free", label: "Qwen3.8 27B", free: true },
      { id: "thinkingmachines/inkling:free", label: "Inkling", free: true },
      { id: "dots-studio/dots-3-note-preview:free", label: "Dots3 Note Preview", free: true },
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5 (pago)" },
      { id: "openai/gpt-5.1", label: "GPT-5.1 (pago)" },
    ],
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    kind: "openai",
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    defaultModel: "qwen2.5:7b-instruct",
    needsKey: false,
    envKeys: ["OLLAMA_BASE_URL"],
    help:
      "Modelos en tu propia máquina, sin costo ni límites. Instala Ollama, ejecuta «ollama pull qwen2.5:7b-instruct» " +
      "y pulsa «Cargar modelos». Para generar una landing completa conviene un modelo de 7B o más.",
    suggested: [
      { id: "qwen2.5:7b-instruct", label: "Qwen2.5 7B Instruct", free: true },
      { id: "llama3.1:8b", label: "Llama 3.1 8B", free: true },
      { id: "gemma2:9b", label: "Gemma 2 9B", free: true },
      { id: "mistral:7b", label: "Mistral 7B", free: true },
      { id: "qwen2.5:3b", label: "Qwen2.5 3B (ligero)", free: true },
    ],
  },
  {
    id: "ollama-cloud",
    label: "Ollama Cloud",
    kind: "openai",
    defaultBaseUrl: "https://ollama.com/v1",
    defaultModel: "gpt-oss:120b",
    needsKey: true,
    envKeys: ["OLLAMA_API_KEY"],
    keyUrl: "https://ollama.com/settings/keys",
    help:
      "Modelos hosteados por Ollama (incluye capa gratuita + Turbo de pago). Crea tu key en ollama.com → settings → keys. " +
      "OJO: no existe un producto separado «Ollama Pro»: es esta misma nube (plan gratis y Turbo).",
    suggested: [
      { id: "gpt-oss:120b", label: "GPT-OSS 120B", free: true },
      { id: "deepseek-v3.2", label: "DeepSeek V3.2", free: true },
      { id: "qwen3:30b", label: "Qwen3 30B", free: true },
      { id: "minimax-m2.7", label: "MiniMax M2.7", free: true },
      { id: "gemma4:31b", label: "Gemma 4 31B", free: true },
    ],
  },
  {
    id: "github-models",
    label: "GitHub Models",
    kind: "openai",
    defaultBaseUrl: "https://models.github.ai/inference",
    defaultModel: "openai/gpt-4.1-mini",
    needsKey: true,
    envKeys: ["GITHUB_TOKEN"],
    keyUrl: "https://github.com/settings/tokens",
    help:
      "Entra con tu cuenta de GitHub: crea un Personal Access Token (classic) con permiso models:read y pégalo como key. " +
      "Incluye GPT, Llama, DeepSeek y más con cuota gratuita generosa.",
    suggested: [
      { id: "openai/gpt-4.1-mini", label: "GPT-4.1 mini", free: true },
      { id: "openai/gpt-4.1", label: "GPT-4.1", free: true },
      { id: "meta/Llama-4-Maverick-17B-128E-Instruct-FP8", label: "Llama 4 Maverick", free: true },
      { id: "deepseek/DeepSeek-V3-0324", label: "DeepSeek V3", free: true },
    ],
  },
  {
    id: "custom",
    label: "OpenAI-compatible (bridge)",
    kind: "openai",
    defaultBaseUrl: "http://127.0.0.1:8787/v1",
    defaultModel: "nemotron-3.5-lightning-free",
    needsKey: false,
    envKeys: ["AI_BASE_URL", "AI_API_KEY"],
    help:
      "Cualquier servidor que hable /v1/chat/completions. Incluye el puente de este proyecto: " +
      "«npm run bridge» levanta opencode + el puente en :8787 y te da 10 modelos gratuitos sin API key. " +
      "También sirve para LiteLLM, LM Studio, vLLM o llama.cpp.",
    suggested: [
      { id: "nemotron-3.5-lightning-free", label: "Nemotron 3.5 Lightning (vía puente)", free: true },
      { id: "big-pickle", label: "Big Pickle (vía puente)", free: true },
      { id: "nemotron-3-ultra-free", label: "Nemotron 3 Ultra (vía puente)", free: true },
      { id: "longcat-2.5-preview-free", label: "LongCat 2.5 (vía puente)", free: true },
      { id: "mimo-v2.6-flash-free", label: "MiMo V2.6 Flash (vía puente)", free: true },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini",
    needsKey: true,
    envKeys: ["OPENAI_API_KEY"],
    keyUrl: "https://platform.openai.com/api-keys",
    help: "La opción más predecible para JSON estructurado. Luna es 4x más barato que mini.",
    suggested: [
      { id: "gpt-6-luna", label: "GPT-6 Luna (barato, recomendado)" },
      { id: "gpt-5.6-luna", label: "GPT-5.6 Luna (barato)" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "anthropic",
    defaultBaseUrl: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-4-5",
    needsKey: true,
    envKeys: ["ANTHROPIC_API_KEY"],
    keyUrl: "https://console.anthropic.com/settings/keys",
    help: "Excelente copywriting en español.",
    suggested: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.5-flash",
    needsKey: true,
    envKeys: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
    keyUrl: "https://aistudio.google.com/apikey",
    help: "AI Studio tiene una capa gratuita generosa.",
    suggested: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", free: true },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", free: true },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "qwen/qwen3.8-27b",
    needsKey: true,
    envKeys: ["GROQ_API_KEY"],
    keyUrl: "https://console.groq.com/keys",
    help: "Inferencia muy rápida con capa gratuita.",
    suggested: [
      { id: "qwen/qwen3.8-27b", label: "Qwen3.8 27B", free: true },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", free: true },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B", free: true },
    ],
  },
];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<string, ProviderMeta>;

const env = (names: string[]) => names.map((n) => process.env[n]).find((v) => !!v) || "";

/* --------------------------- resolución de config --------------------------- */

/** Detecta un proveedor mirando sólo el entorno (orden de preferencia). */
function fromEnv(): ResolvedProvider | null {
  const order: Exclude<ProviderId, "none">[] = [
    "openai",
    "anthropic",
    "gemini",
    "groq",
    "openrouter",
    "ollama-cloud",
    "github-models",
    "opencode",
    "custom",
    "ollama",
  ];
  for (const id of order) {
    const meta = PROVIDER_BY_ID[id];
    const key = env(meta.envKeys.filter((k) => k.includes("KEY")));
    const base = env(meta.envKeys.filter((k) => k.includes("URL")));
    if (meta.needsKey ? !key : !base) continue;
    return {
      id,
      model: process.env.AI_MODEL || meta.defaultModel,
      baseUrl: base || meta.defaultBaseUrl,
      apiKey: key,
      fallbacks: [],
      temperature: 0.7,
      source: "env",
    };
  }
  return null;
}

export async function resolveProvider(override?: { providerId?: string; model?: string }): Promise<ResolvedProvider> {
  const none: ResolvedProvider = {
    id: "none",
    model: "",
    baseUrl: "",
    apiKey: "",
    fallbacks: [],
    temperature: 0.7,
    source: "none",
  };

  let saved: Awaited<ReturnType<typeof getSettings>>["ai"] | null = null;
  try {
    saved = (await getSettings()).ai;
  } catch {
    saved = null;
  }
  // Override explícito por request (el bot pide la IA activa de Atlas para
  // esta landing). Si el id no existe o le falta key, se ignora y se sigue
  // con settings/env como siempre: nunca rompe una generación.
  const want = String(override?.providerId || "").trim().toLowerCase();
  if (want && want !== "auto") {
    const meta = PROVIDER_BY_ID[want];
    if (meta) {
      const oKey = env(meta.envKeys.filter((k) => k.includes("KEY")));
      const oBase = (env(meta.envKeys.filter((k) => k.includes("URL"))) || meta.defaultBaseUrl).replace(/\/+$/, "");
      if (!meta.needsKey || oKey) {
        return { id: meta.id, model: String(override?.model || "").trim() || meta.defaultModel, baseUrl: oBase, apiKey: oKey, fallbacks: [], temperature: 0.7, source: "override" };
      }
    }
  }

  if (saved && saved.provider && saved.provider !== "auto") {
    const meta = PROVIDER_BY_ID[saved.provider];
    if (meta) {
      const apiKey = saved.apiKey || env(meta.envKeys.filter((k) => k.includes("KEY")));
      const baseUrl = (saved.baseUrl || env(meta.envKeys.filter((k) => k.includes("URL"))) || meta.defaultBaseUrl).replace(/\/+$/, "");
      if (!meta.needsKey || apiKey) {
        return {
          id: meta.id,
          model: saved.model || meta.defaultModel,
          baseUrl,
          apiKey,
          fallbacks: (saved.fallbacks || []).filter(Boolean),
          temperature: typeof saved.temperature === "number" ? saved.temperature : 0.7,
          source: "settings",
        };
      }
    }
  }

  return fromEnv() ?? none;
}

export async function available(): Promise<boolean> {
  return (await resolveProvider()).id !== "none";
}

/* ------------------------------- HTTP ------------------------------- */

async function post(url: string, headers: Record<string, string>, body: any, timeoutMs = 120_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const txt = await r.text();
    if (!r.ok) throw new Error(`${r.status} ${txt.slice(0, 500)}`);
    try {
      return JSON.parse(txt);
    } catch {
      throw new Error(`Respuesta no-JSON del proveedor: ${txt.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(t);
  }
}

async function get(url: string, headers: Record<string, string> = {}, timeoutMs = 20_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers, signal: ctl.signal });
    const txt = await r.text();
    if (!r.ok) throw new Error(`${r.status} ${txt.slice(0, 300)}`);
    return JSON.parse(txt);
  } finally {
    clearTimeout(t);
  }
}

function authHeaders(cfg: ResolvedProvider): Record<string, string> {
  const meta = PROVIDER_BY_ID[cfg.id];
  if (!meta) return {};
  if (meta.kind === "anthropic") return { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" };
  if (meta.kind === "gemini") return {};
  const h: Record<string, string> = {};
  if (cfg.apiKey) h.Authorization = `Bearer ${cfg.apiKey}`;
  if (cfg.id === "openrouter") {
    // OpenRouter pide identificar la app para las cuotas del tier gratuito
    h["HTTP-Referer"] = process.env.PUBLIC_APP_URL || "http://localhost:3000";
    h["X-Title"] = "Landing Forge";
  }
  return h;
}

/* --------------------------- una sola llamada --------------------------- */

async function callOnce(
  cfg: ResolvedProvider,
  model: string,
  opts: { system: string; user: string; json?: boolean; maxTokens?: number; temperature?: number },
): Promise<LlmResult> {
  const meta = PROVIDER_BY_ID[cfg.id];
  const started = Date.now();
  const maxTokens = opts.maxTokens ?? 8000;
  const temperature = opts.temperature ?? cfg.temperature;
  const base = cfg.baseUrl.replace(/\/+$/, "");

  if (meta.kind === "anthropic") {
    const data = await post(`${base}/v1/messages`, authHeaders(cfg), {
      model,
      max_tokens: maxTokens,
      temperature,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    });
    const text = (data.content || []).map((c: any) => c.text || "").join("");
    return { text, provider: cfg.id, model, ms: Date.now() - started };
  }

  if (meta.kind === "gemini") {
    const data = await post(`${base}/models/${model}:generateContent?key=${cfg.apiKey}`, {}, {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    });
    const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
    return { text, provider: cfg.id, model, ms: Date.now() - started };
  }

  /* dialecto OpenAI: openai, groq, ollama, openrouter, opencode, custom */
  const useCompletionTokens = /gpt-6|gpt-5\.6|luna/i.test(model);
  const body: any = {
    model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    ...(useCompletionTokens ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
    stream: false,
  };
  // Luna/GPT-6 solo acepta temperature=1 (default): no lo enviamos en otros casos
  if (!(useCompletionTokens && temperature !== 1)) body.temperature = temperature;
  // El modo JSON no es universal: lo pedimos sólo donde se sabe soportado.
  if (opts.json && (cfg.id === "openai" || cfg.id === "groq" || cfg.id === "openrouter" || cfg.id === "ollama")) {
    body.response_format = { type: "json_object" };
  }

  let data: any;
  try {
    data = await post(`${base}/chat/completions`, authHeaders(cfg), body);
  } catch (e: any) {
    // algunos servidores rechazan response_format: reintentamos sin él
    if (body.response_format && /response_format|json_object|unsupported|invalid/i.test(String(e.message))) {
      delete body.response_format;
      data = await post(`${base}/chat/completions`, authHeaders(cfg), body);
    } else {
      throw e;
    }
  }

  const msg = data.choices?.[0]?.message;
  const text = typeof msg?.content === "string" ? msg.content : (msg?.content || []).map((c: any) => c.text || "").join("");
  if (!text) throw new Error(`El modelo ${model} devolvió una respuesta vacía`);
  return { text, provider: cfg.id, model, ms: Date.now() - started };
}

/** Llama al LLM configurado; si falla, prueba los modelos de respaldo. */
export async function complete(opts: {
  system: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  provider?: { providerId?: string; model?: string };
}): Promise<LlmResult> {
  const cfg = await resolveProvider(opts.provider);
  if (cfg.id === "none") throw new Error("NO_LLM");

  const chain = [cfg.model, ...cfg.fallbacks].filter(Boolean);
  const errors: string[] = [];
  for (const model of chain) {
    try {
      return await callOnce(cfg, model, opts);
    } catch (e: any) {
      errors.push(`${model}: ${String(e.message || e).slice(0, 180)}`);
    }
  }
  throw new Error(errors.join(" | ") || "Fallo desconocido del proveedor");
}

/* --------------------------- utilidades de panel --------------------------- */

/** Lista los modelos del proveedor (en vivo). Para OpenRouter marca los gratuitos. */
export async function listModels(
  cfg: ResolvedProvider,
): Promise<{ id: string; label: string; free?: boolean }[]> {
  const meta = PROVIDER_BY_ID[cfg.id];
  if (!meta) return [];
  const base = cfg.baseUrl.replace(/\/+$/, "");

  if (meta.kind === "gemini") {
    const d = await get(`${base}/models?key=${cfg.apiKey}`);
    return (d.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: any) => ({ id: String(m.name).replace(/^models\//, ""), label: m.displayName || m.name }));
  }
  if (meta.kind === "anthropic") {
    const d = await get(`${base}/v1/models`, authHeaders(cfg));
    return (d.data || []).map((m: any) => ({ id: m.id, label: m.display_name || m.id }));
  }

  const d = await get(`${base}/models`, authHeaders(cfg));
  const rows: any[] = d.data || d.models || [];
  return rows.map((m: any) => {
    const id = m.id || m.name || "";
    const pricing = m.pricing || {};
    const free =
      /:free$/.test(id) ||
      /-free$/.test(id) ||
      cfg.id === "ollama" ||
      (pricing.prompt !== undefined && Number(pricing.prompt) === 0 && Number(pricing.completion) === 0);
    const ctx = m.context_length || m.context_window;
    return { id, label: `${m.name || id}${ctx ? ` · ${Math.round(ctx / 1000)}k` : ""}`, free };
  });
}

/** Ping real al proveedor: pide una palabra y mide latencia. */
export async function pingProvider(cfg: ResolvedProvider): Promise<{ ok: boolean; detail: string; ms: number }> {
  const t = Date.now();
  try {
    const r = await callOnce(cfg, cfg.model, {
      system: "Responde exactamente con la palabra: listo",
      user: "Di listo",
      maxTokens: 24,
      temperature: 0,
    });
    return { ok: true, detail: r.text.trim().slice(0, 120) || "(respuesta vacía)", ms: Date.now() - t };
  } catch (e: any) {
    return { ok: false, detail: String(e.message || e).slice(0, 400), ms: Date.now() - t };
  }
}

/** Extrae el primer objeto JSON válido de una respuesta de LLM */
export function extractJson(text: string): any {
  const t = String(text || "").trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : t;
  try {
    return JSON.parse(candidate);
  } catch {
    /* sigue */
  }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = candidate.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      try {
        return JSON.parse(slice.replace(/,(\s*[}\]])/g, "$1"));
      } catch {
        /* nada */
      }
    }
  }
  throw new Error("No se pudo extraer JSON de la respuesta del modelo");
}
