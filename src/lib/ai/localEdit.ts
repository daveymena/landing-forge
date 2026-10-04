/* ------------------------------------------------------------------ *
 *  Edición local, sin LLM.
 *  Vive en su propio módulo porque lo usa AiBar (componente de cliente):
 *  si colgara de generate.ts arrastraría provider.ts → db.ts → node:fs
 *  al bundle del navegador y el build de producción fallaría.
 * ------------------------------------------------------------------ */

import { applyOps, type EditOp, type PageSpec } from "../schema";
import { BY_TYPE, withDefaults } from "../blocks/catalog";
import { uid } from "../schema";
import { themeFromPreset, PRESET_BY_ID } from "../theme";

export interface EditResult {
  spec: PageSpec;
  reply: string;
  ops: EditOp[];
  engine: "llm" | "local";
}


/** Intérprete local de instrucciones frecuentes (funciona sin IA) */
export function localEdit(spec: PageSpec, instruction: string): EditResult {
  const t = instruction.toLowerCase();
  const ops: EditOp[] = [];
  let reply = "";

  const colorMap: Record<string, string> = {
    azul: "#3b82f6", rojo: "#ef4444", verde: "#10b981", morado: "#8b5cf6", violeta: "#7c6cff",
    naranja: "#f97316", amarillo: "#eab308", rosa: "#ec4899", cian: "#06b6d4", negro: "#111111",
    dorado: "#d4af37", turquesa: "#14b8a6", lima: "#d4ff3f",
  };
  const hex = instruction.match(/#[0-9a-f]{6}/i)?.[0];
  const colorWord = Object.keys(colorMap).find((k) => t.includes(k));
  if (hex || (colorWord && /color|acento|accent|tema|paleta/.test(t))) {
    const accent = hex || colorMap[colorWord!];
    ops.push({ op: "setTheme", patch: { colors: { accent } } });
    reply = `Cambié el color de acento a ${accent}.`;
  }

  for (const p of ["midnight", "obsidian", "aurora", "clean", "retail", "sand", "emerald", "mono"]) {
    if (t.includes(p)) {
      ops.push({ op: "setTheme", patch: { preset: p } });
      reply = `Apliqué el tema ${p}.`;
    }
  }
  if (/oscuro|dark|modo noche/.test(t)) { ops.push({ op: "setTheme", patch: { mode: "dark" } }); reply = "Cambié a modo oscuro."; }
  if (/claro|light|modo d[ií]a/.test(t)) { ops.push({ op: "setTheme", patch: { mode: "light" } }); reply = "Cambié a modo claro."; }
  if (/m[áa]s compact|compacta|menos espacio/.test(t)) { ops.push({ op: "setTheme", patch: { density: "compact" } }); reply = "Reduje el espaciado."; }
  if (/m[áa]s aire|espacioso|m[áa]s espacio/.test(t)) { ops.push({ op: "setTheme", patch: { density: "spacious" } }); reply = "Aumenté el espaciado."; }
  if (/redondead|bordes suaves/.test(t)) { ops.push({ op: "setTheme", patch: { radius: 26 } }); reply = "Bordes más redondeados."; }
  if (/bordes rectos|sin redondeo|cuadrado/.test(t)) { ops.push({ op: "setTheme", patch: { radius: 2 } }); reply = "Bordes rectos."; }

  // quitar / agregar bloques por nombre
  const typeAliases: Record<string, string> = {
    faq: "faq", preguntas: "faq", garantía: "guarantee", garantia: "guarantee",
    contador: "countdown", temporizador: "countdown", testimonios: "testimonials",
    reseñas: "reviewsUgc", resenas: "reviewsUgc", precios: "pricing", planes: "pricing",
    bundle: "bundle", oferta: "bundle", video: "video", galería: "gallery", galeria: "gallery",
    comparativa: "comparison", comparación: "comparison", métricas: "stats", metricas: "stats",
    whatsapp: "whatsappFab", bento: "bento", pasos: "steps", formulario: "codForm",
  };
  if (/^(quita|elimina|borra|remueve|oculta)/.test(t)) {
    for (const [word, type] of Object.entries(typeAliases)) {
      if (t.includes(word)) {
        const b = spec.blocks.find((x) => x.type === type);
        if (b) { ops.push({ op: "removeBlock", blockId: b.id }); reply = `Quité el bloque de ${word}.`; }
      }
    }
  }
  if (/^(agrega|añade|anade|pon|suma|incluye)/.test(t)) {
    for (const [word, type] of Object.entries(typeAliases)) {
      if (t.includes(word) && !spec.blocks.some((x) => x.type === type)) {
        const def = BY_TYPE[type];
        const at = Math.max(1, spec.blocks.length - 2);
        ops.push({ op: "addBlock", block: { id: uid(type.slice(0, 3)), type, variant: def.variants[0].value, visible: true, props: withDefaults(type, {}) }, atIndex: at });
        reply = `Agregué el bloque de ${word}.`;
      }
    }
  }

  const priceMatch = instruction.match(/precio\D{0,16}(\d{2,9})/i);
  if (priceMatch) {
    const price = Number(priceMatch[1]);
    ops.push({ op: "setProduct", patch: { price } });
    const hero = spec.blocks.find((b) => b.type === "hero");
    if (hero) ops.push({ op: "setProp", blockId: hero.id, path: "price", value: price });
    reply = `Actualicé el precio a ${price}.`;
  }

  if (!ops.length) {
    reply =
      "No pude aplicar esa instrucción sin IA. Configura una API key en el servidor para edición por lenguaje natural, " +
      "o usa el panel de la derecha. Prueba también: «cambia el color a verde», «quita el contador», «agrega testimonios», «precio 129900».";
    return { spec, reply, ops: [], engine: "local" };
  }
  return { spec: applyOps(spec, ops), reply, ops, engine: "local" };
}
