import { complete } from "@/lib/ai/provider";
import { searchStock, generateImage, enhanceImage, fillSectionImages, type StockKind } from "@/lib/stock";

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
  action: "fill" | "clear" | "keep";
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


interface Job {
  slot: Slot;
  d: Decision;
  url: string | null;
  enhance: string;
}

/**
 * Ejecuta las decisiones en dos fases:
 *  1) búsqueda de stock SECUENCIAL con un `used` compartido — así dos slots
 *     nunca reciben la misma foto (bug de UGC repetido),
 *  2) enhance/generación en PARALELO — lo lento va aquí.
 */
async function execute(
  spec: any,
  slots: Slot[],
  decisions: Decision[],
  used: Set<string>,
): Promise<{ applied: number; cleared: number }> {
  const jobs: Job[] = [];
  let applied = 0;
  let cleared = 0;
  const enhanceOn = process.env.OPENAI_ENHANCE !== "false" && !!process.env.OPENAI_API_KEY;

  for (const slot of slots) {
    const d = decisions.find((x) => x.b === slot.b && x.path === slot.path);
    if (!d) continue;
    if (d.action === "clear") {
      set(spec, slot.b, slot.path, "");
      cleared++;
      continue;
    }
    if (d.action === "keep" && slot.current) continue;
    const query = String(d.query || "").trim();
    if (!query) {
      set(spec, slot.b, slot.path, "");
      cleared++;
      continue;
    }
    let url: string | null = null;
    if (d.origin !== "generate") {
      url = await searchStock(query, slot.kind, used);
      if (url) used.add(url);
    }
    jobs.push({ slot, d, url, enhance: enhanceOn && d.enhance ? d.enhance : "" });
  }

  await runPool(jobs, 3, async (j) => {
    let final = j.url || "";
    try {
      if (j.url && j.enhance) {
        final = await enhanceImage(j.url, j.enhance);
      } else if (!j.url) {
        final = (await generateImage(`${j.d.enhance || j.d.query || ""} — ${j.d.query || ""}`.trim())) || "";
      }
    } catch {
      final = j.url || "";
    }
    if (final) {
      set(spec, j.slot.b, j.slot.path, final);
      used.add(final);
      applied++;
    } else {
      set(spec, j.slot.b, j.slot.path, "");
      cleared++;
    }
  });

  return { applied, cleared };
}

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
        `#${i} b=${s.b} type=${s.type} path=${s.path} current=${s.current || "(vacío)"} — \"${s.title}\" | ${s.context}`,
      ),
    ].join("\n");

    const res = await complete({ system: systemPrompt(), user, json: true, maxTokens: 2400, temperature: 0.4 });
    const parsed = parseJson(res.text);
    const decisions: Decision[] = Array.isArray(parsed.decisions) ? parsed.decisions : [];
    const remove: string[] = Array.isArray(parsed.removeUrls)
      ? parsed.removeUrls.filter((u: any) => typeof u === "string" && u)
      : [];
    if (!decisions.length) return null;

    /* --- reglas duras de auditoría (no dependen del LLM) --- */
    const seen = new Set<string>();
    for (const s of slots) {
      const d = decisions.find((x) => x.b === s.b && x.path === s.path);
      if (!d) {
        decisions.push({
          b: s.b,
          path: s.path,
          action: s.current ? "keep" : "fill",
          origin: "stock",
          query: "person lifestyle",
          enhance: "clean premium lifestyle",
        });
        continue;
      }
      if (s.current) {
        if (d.action === "keep" && PRODUCT_URL_RE.test(s.current)) {
          d.action = "fill";
          d.origin = d.origin || "stock";
          d.query = d.query || (s.kind === "portrait" ? "happy customer portrait" : "person using product");
          d.why = "producto en slot de persona";
        }
        if (d.action === "keep" && seen.has(s.current)) {
          d.action = "fill";
          d.query = d.query || (s.kind === "portrait" ? "customer portrait smiling" : "lifestyle photo customer");
          d.why = "imagen repetida";
        }
        seen.add(s.current);
      }
      if (remove.length && s.current && remove.includes(s.current)) {
        if (d.action === "keep") d.action = "fill";
        d.query = d.query || (s.kind === "portrait" ? "customer portrait" : "lifestyle scene");
      }
    }

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

    console.log(
      `[VisualBrain] decisions: ${decisions
        .map(
          (d) =>
            `${d.b}.${d.path.split(".").slice(-2).join(".")}:${d.action}${d.origin ? "/" + d.origin : ""}${d.query ? ` \"${d.query}\"` : ""}`,
        )
        .join(" | ")}`,
    );

    const { applied, cleared } = await execute(spec, slots, decisions, new Set<string>());
    return { applied, cleared, ms: Date.now() - t0 };
  } catch {
    return null;
  }
}

/**
 * Política de calidad: un testimonio/UGC sin foto NO se queda en la landing.
 *  - item sin imagen → fuera,
 *  - bloque con menos de 2 items con foto → bloque entero fuera.
 * Se ejecuta SIEMPRE después del cerebro (o del fallback automático).
 */
export function pruneEmptyVisuals(spec: any): { removedItems: number; removedBlocks: number } {
  let removedItems = 0;
  let removedBlocks = 0;
  const blocks: any[] = Array.isArray(spec?.blocks) ? spec.blocks : [];
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    const p = b?.props;
    if (!p || !Array.isArray(p.items)) continue;
    if (b.type !== "testimonials" && b.type !== "reviewsUgc") continue;
    const key = b.type === "testimonials" ? "avatar" : "image";
    const before = p.items.length;
    p.items = p.items.filter((it: any) => it && String(it[key] || "").trim());
    removedItems += before - p.items.length;
    if (p.items.length < 2) {
      blocks.splice(i, 1);
      removedBlocks++;
    }
  }
  if (removedItems || removedBlocks) {
    console.log(`[VisualBrain] prune: -${removedItems} items, -${removedBlocks} bloques sin foto`);
  }
  return { removedItems, removedBlocks };
}

/**
 * Pasada visual COMPLETA para cualquier spec:
 *  1) cerebro visual (decide en contexto),
 *  2) si el LLM no respondió → relleno automático con stock,
 *  3) lo que siga vacío → se GENERA con OpenAI (último recurso),
 *  4) política final: testimonios/UGC sin foto → fuera.
 * Llamar SIEMPRE antes de saveSite.
 */
export async function applyVisualPass(spec: any): Promise<void> {
  try {
    const brain = await runVisualBrain(spec);
    if (brain) console.log(`[VisualBrain] applied=${brain.applied} cleared=${brain.cleared} ms=${brain.ms}`);
    else {
      console.warn("[VisualBrain] sin respuesta del LLM → fill automático");
      await fillSectionImages(spec);
    }
  } catch (e: any) {
    console.warn("[VisualBrain] error → fill automático:", e?.message || e);
    await fillSectionImages(spec);
  }
  await emergencyFill(spec);
  pruneEmptyVisuals(spec);
}

/** Último recurso: los slots que quedaron vacíos se GENERAN con OpenAI. */
async function emergencyFill(spec: any): Promise<void> {
  const product = String(spec?.product?.name || "").trim().slice(0, 60);
  const jobs: Array<{ set: (u: string) => void; prompt: string }> = [];
  const blocks: any[] = Array.isArray(spec?.blocks) ? spec.blocks : [];
  for (const b of blocks) {
    if (b?.visible === false) continue;
    const p = b.props || {};
    if (b.type === "testimonials" && Array.isArray(p.items)) {
      for (const it of p.items) {
        if (it && !String(it.avatar || "").trim()) {
          jobs.push({
            set: (u) => (it.avatar = u),
            prompt: `Photorealistic professional headshot portrait of a happy customer, natural skin, soft studio light, neutral dark background, no text`,
          });
        }
      }
    }
    if (b.type === "reviewsUgc" && Array.isArray(p.items)) {
      for (const it of p.items) {
        if (it && !String(it.image || "").trim()) {
          jobs.push({
            set: (u) => (it.image = u),
            prompt: `Photorealistic candid lifestyle photo of a customer${product ? ` using or holding ${product}` : " enjoying a purchase"}, natural light, home setting, no text`,
          });
        }
      }
    }
  }
  if (!jobs.length) return;
  console.log(`[VisualBrain] emergencyFill: generando ${jobs.length} con OpenAI`);
  await Promise.all(
    jobs.map(async (j) => {
      try {
        const u = await generateImage(j.prompt);
        if (u) j.set(u);
      } catch {
        /* se pruneará abajo */
      }
    }),
  );
}
