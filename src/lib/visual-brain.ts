import { complete } from "@/lib/ai/provider";
import { searchStock, generateImage, enhanceImage, type StockKind } from "@/lib/stock";

/* ------------------------------------------------------------------ *
 * CEREBRO VISUAL — agente especializado en la imagen de cada espacio.
 *
 * No rellena a ciegas: analiza el spec completo (sección, copy, producto,
 * paleta, precio, público) y decide por cada slot QUÉ imagen necesita,
 * con qué query buscarla, cómo re-estilizarla al diseño… y QUÉ sobra
 * (avatares que en realidad son fotos de producto, URLs repetidas,
 * imágenes que no aportan a la sección).
 *
 * Si el LLM no responde, cae al relleno automático (fillSectionImages).
 * ------------------------------------------------------------------ */

interface Slot {
  b: number;
  type: string;
  path: string;
  kind: StockKind;
  current: string;
  title: string;
  context: string;
}

interface Decision {
  b: number;
  path: string;
  action: "fill" | "clear";
  origin?: "stock" | "generate";
  query?: string;
  enhance?: string;
  why?: string;
}

const PRODUCT_URL_RE = /\/images\/products\//i;

function get(spec: any, b: number, path: string): any {
  let cur: any = spec.blocks[b];
  const parts = path.split(".");
  for (let i = 0; i < parts.length - 1; i++) cur = cur?.[parts[i]];
  return { obj: cur, key: parts[parts.length - 1] };
}

function set(spec: any, b: number, path: string, value: string): void {
  const { obj, key } = get(spec, b, path);
  if (obj) obj[key] = value;
}

function collectSlots(spec: any): Slot[] {
  const slots: Slot[] = [];
  const blocks: any[] = Array.isArray(spec?.blocks) ? spec.blocks : [];
  blocks.forEach((b, i) => {
    if (b.visible === false) return;
    const p = b.props || {};
    const title = String(p.title || p.heading || p.name || "").slice(0, 60);
    if (b.type === "testimonials" && Array.isArray(p.items)) {
      p.items.forEach((it: any, j: number) => {
        if (!it) return;
        slots.push({
          b: i,
          type: b.type,
          path: `props.items.${j}.avatar`,
          kind: "portrait",
          current: String(it.avatar || ""),
          title,
          context: [it.name, it.role, it.text].filter(Boolean).map((s: any) => String(s).slice(0, 90)).join(" · "),
        });
      });
    }
    if (b.type === "reviewsUgc" && Array.isArray(p.items)) {
      p.items.forEach((it: any, j: number) => {
        if (!it) return;
        slots.push({
          b: i,
          type: b.type,
          path: `props.items.${j}.image`,
          kind: "scene",
          current: String(it.image || ""),
          title,
          context: [it.name, it.text].filter(Boolean).map((s: any) => String(s).slice(0, 90)).join(" · "),
        });
      });
    }
    if (b.type === "video" && p.url && !p.poster) {
      slots.push({ b: i, type: b.type, path: "props.poster", kind: "scene", current: "", title, context: "Miniatura del video" });
    }
    if (b.type === "hero" && !p.image) {
      slots.push({ b: i, type: b.type, path: "props.image", kind: "scene", current: "", title, context: "Imagen principal del hero" });
    }
  });
  return slots;
}

function specContext(spec: any): string {
  const product = spec?.product || {};
  const theme = spec?.theme || {};
  const b: any[] = Array.isArray(spec?.blocks) ? spec.blocks : [];
  const layout = b
    .map((x, i) => `${i}:${x.type}${x.visible === false ? "(oculto)" : ""}=${String(x.props?.title || x.props?.heading || "").slice(0, 40)}`)
    .join(" | ");
  return [
    `Producto: ${product.name || "(desconocido)"} — ${String(product.description || "").slice(0, 220)}`,
    `Precio: ${product.price || ""}`,
    `Paleta: acento=${theme.accent || ""} fondo=${theme.bg || ""} texto=${theme.text || ""}`,
    `Secciones: ${layout}`,
  ].join("\n");
}

function systemPrompt(): string {
  return [
    "Eres un DIRECTOR DE ARTE VISUAL experto en landings de e-commerce en Colombia.",
    "Recibes el spec de una landing y la lista de SLOTS (espacios que necesitan imagen).",
    "Tu trabajo: 1) decidir QUÉ imagen va EXACTAMENTE en cada espacio según el contexto real",
    "(de quién habla la sección, qué producto se vende, la paleta y el tono), 2) dar la query de",
    "búsqueda de stock EN INGLÉS corta y concreta (Pexels/Pixabay), 3) el prompt de re-estilizado",
    "(enhance) para que la foto quede coherente con la paleta del diseño, 4) marcar QUITAR (clear)",
    "lo que no aporta.",
    "REGLAS DURAS:",
    "- avatar de testimonio = retrato de PERSONA real acorde al nombre/cargo del copy (no producto, no logo).",
    "- UGC = persona usando o en contexto del producto / estilo de vida de quien lo compra.",
    "- Nunca uses fotos del producto en avatares; el producto solo va en hero/gallery/detalles.",
    "- Si el slot ya tiene una foto de persona adecuada → action keep (no la repitas en otro slot).",
    "- Si la sección es institucional y una foto de persona no aporta → action clear (queda sin foto).",
    "- origin=stock (buscar foto real) salvo que la escena sea muy específica → origin=generate.",
    "- query en inglés, máx 8 palabras; enhance en inglés, describe fondo/luces/estilo con la paleta.",
    "- Nunca repitas la misma URL en dos slots distintos (si el current está repetido, nueva foto).",
    "DEVUELVE SOLO JSON: {\"decisions\":[{\"b\":0,\"path\":\"props.items.0.avatar\",\"action\":\"fill\",",
    "\"origin\":\"stock\",\"query\":\"...\",\"enhance\":\"...\",\"why\":\"...\"}],",
    "\"removeUrls\":[\"url que sobra en el diseño\"]}. Un decision por slot recibido (keep incluido).",
  ].join("\n");
}

function parseJson(text: string): any {
  const m = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
  if (!m) throw new Error("sin JSON");
  return JSON.parse(m[0]);
}

async function runPool<T>(items: T[], limit: number, fn: (t: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const it = queue.shift();
      if (it !== undefined) await fn(it);
    }
  });
  await Promise.all(workers);
}

async function execute(spec: any, slot: Slot, d: Decision): Promise<string> {
  if (d.action === "clear") {
    set(spec, slot.b, slot.path, "");
    return "clear";
  }
  if (d.action === "keep" && slot.current) return "keep";
  const origin = d.origin === "generate" ? "generate" : "stock";
  const query = String(d.query || "").trim();
  if (!query && origin === "stock") {
    set(spec, slot.b, slot.path, "");
    return "clear";
  }
  let url: string | null = null;
  if (origin === "generate") {
    url = await generateImage(`${d.enhance || query} — ${query}`.trim());
  } else {
    url = await searchStock(query, slot.kind);
    if (url && process.env.OPENAI_ENHANCE !== "false" && process.env.OPENAI_API_KEY && d.enhance) {
      url = await enhanceImage(url, d.enhance);
    } else if (!url) {
      url = await generateImage(`${d.enhance || query} — ${query}`.trim());
    }
  }
  if (!url) {
    set(spec, slot.b, slot.path, "");
    return "empty";
  }
  set(spec, slot.b, slot.path, url);
  return url;
}

/**
 * Analiza el spec y decide/implementa la imagen de cada espacio.
 * Devuelve {applied, cleared, ms} o null si el agente no respondió
 * (en ese caso el caller debe usar fillSectionImages).
 */
export async function runVisualBrain(spec: any): Promise<{ applied: number; cleared: number; ms: number } | null> {
  const t0 = Date.now();
  try {
    const slots = collectSlots(spec);
    if (!slots.length) return { applied: 0, cleared: 0, ms: 0 };

    const user = [
      specContext(spec),
      "",
      "SLOTS:",
      ...slots.map((s, i) =>
        `#${i} b=${s.b} type=${s.type} path=${s.path} current=${s.current || "(vacío)"} — "${s.title}" | ${s.context}`,
      ),
    ].join("\n");

    const res = await complete({ system: systemPrompt(), user, json: true, maxTokens: 2400, temperature: 0.4 });
    const parsed = parseJson(res.text);
    const decisions: Decision[] = Array.isArray(parsed.decisions) ? parsed.decisions : [];
    const remove: string[] = Array.isArray(parsed.removeUrls) ? parsed.removeUrls.filter((u: any) => typeof u === "string" && u) : [];
    if (!decisions.length) return null;

    /* --- reglas duras de auditoría (no dependen del LLM) --- */
    const seen = new Set<string>();
    for (const s of slots) {
      const d = decisions.find((x) => x.b === s.b && x.path === s.path);
      if (!d) {
        decisions.push({ b: s.b, path: s.path, action: s.current ? "keep" : "fill", origin: "stock", query: "person lifestyle", enhance: "clean premium lifestyle" });
        continue;
      }
      if (s.current) {
        // foto de producto usada como avatar/UGC → fuera
        if (d.action === "keep" && PRODUCT_URL_RE.test(s.current)) {
          d.action = "fill";
          d.origin = d.origin || "stock";
          d.query = d.query || (s.kind === "portrait" ? "happy customer portrait" : "person using product");
          d.why = "producto en slot de persona";
        }
        // URL repetida en otro slot → obliga foto nueva
        if (d.action === "keep" && seen.has(s.current)) {
          d.action = "fill";
          d.query = d.query || (s.kind === "portrait" ? "customer portrait smiling" : "lifestyle photo customer");
          d.why = "imagen repetida";
        }
        seen.add(s.current);
      }
      if (remove.length && s.current && remove.includes(s.current)) {
        d.action = d.action === "keep" ? "fill" : d.action;
        d.query = d.query || (s.kind === "portrait" ? "customer portrait" : "lifestyle scene");
      }
    }
    // limpia removeUrls en TODOS los slots (incluso fuera de la lista)
    const blocks: any[] = Array.isArray(spec?.blocks) ? spec.blocks : [];
    blocks.forEach((b) => {
      const p = b.props || {};
      if (p.image && remove.includes(p.image)) p.image = "";
      if (p.poster && remove.includes(p.poster)) p.poster = "";
      for (const it of p.items || []) {
        if (it?.avatar && remove.includes(it.avatar)) it.avatar = "";
        if (it?.image && remove.includes(it.image)) it.image = "";
      }
    });

    let applied = 0;
    let cleared = 0;
    await runPool(slots, 3, async (slot) => {
      const d = decisions.find((x) => x.b === slot.b && x.path === slot.path);
      if (!d) return;
      const r = await execute(spec, slot, d);
      if (r === "clear" || r === "empty") cleared++;
      else if (r !== "keep") applied++;
    });

    return { applied, cleared, ms: Date.now() - t0 };
  } catch {
    return null;
  }
}
