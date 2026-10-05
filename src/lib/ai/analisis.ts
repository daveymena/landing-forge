import { complete, extractJson } from "./provider";

export interface AnalisisLanding {
  avatar: string;
  dolores: string[];
  promesa: string;
  angulo: string;
  objeciones: string[];
  tono: string;
}

export interface BriefParaAnalisis {
  producto: string;
  precio?: string;
  moneda?: string;
  pais?: string;
  trafico?: string;
  descripcion?: string;
  vertical?: string;
}

/**
 * Fase 1 de la generación: ANÁLISIS previo, no crear por crear.
 *
 * Para tráfico frío (Facebook) la landing vive o muere por el ángulo: quién
 * la compra, qué le duele, qué promesa la mueve y qué objeciones la frenan.
 * Esto se calcula ANTES de escribir una sola línea de copy, se inyecta en el
 * prompt del arquitecto y se devuelve al bot para que el dueño vea el
 * pensamiento (no solo el resultado).
 *
 * Si el análisis falla, devuelve null y la generación sigue igual que
 * siempre: el análisis suma, nunca bloquea.
 */
export async function analizarBrief(
  input: BriefParaAnalisis,
  provider?: { providerId?: string; model?: string },
): Promise<{ analisis: AnalisisLanding | null; warning?: string }> {
  const trafico = (input.trafico || "facebook").toLowerCase();
  try {
    const res = await complete({
      system: `Eres un estratega de marketing de respuesta directa para Latinoamérica, especializado en tráfico frío de Facebook (gente que no conoce la marca, decide en 3 segundos desde el celular y paga contra entrega).
Analizas el producto y devuelves SOLO un objeto JSON, sin markdown ni explicaciones:
{ "avatar": "quién la compra en 1 línea concreta (ej: dueños de perros pequeños en ciudad que usan bus)", "dolores": ["dolor concreto 1 en su lenguaje", "dolor concreto 2", "dolor concreto 3"], "promesa": "la promesa que vende, medible, en 1 línea", "angulo": "el ángulo de la landing en 1 línea (ej: libertad de llevarla a todas partes sin estrés)", "objeciones": ["objeción real 1 que frena la compra", "objeción 2", "objeción 3"], "tono": "cercano y directo, como reseña de cliente" }
Reglas: dolores y objeciones concretos, en lenguaje del cliente, nada de generalidades ("práctico", "cómodo", "ideal"). La promesa con resultado, no con características.`,
      user: `Producto: ${input.producto || "(sin nombre)"}${input.precio ? `\nPrecio: ${input.precio} ${input.moneda || ""}` : ""}\nPaís: ${input.pais || "Colombia"}\nTráfico: ${trafico}\nVertical: ${input.vertical || "cod"}${input.descripcion ? `\nDescripción: ${input.descripcion.slice(0, 600)}` : ""}`,
      json: true,
      maxTokens: 900,
      temperature: 0.5,
      provider,
    });
    const raw = extractJson(res.text) as any;
    const str = (v: any) => String(v || "").trim();
    const arr = (v: any) =>
      (Array.isArray(v) ? v : [])
        .map(str)
        .filter(Boolean)
        .slice(0, 4);
    const analisis: AnalisisLanding = {
      avatar: str(raw?.avatar),
      dolores: arr(raw?.dolores),
      promesa: str(raw?.promesa),
      angulo: str(raw?.angulo),
      objeciones: arr(raw?.objeciones),
      tono: str(raw?.tono) || "cercano y directo",
    };
    if (!analisis.avatar || analisis.dolores.length < 2 || !analisis.promesa) {
      return { analisis: null, warning: "El análisis previo salió incompleto; se generó con el brief directo." };
    }
    return { analisis };
  } catch (e: any) {
    return { analisis: null, warning: `El análisis previo falló (${String(e?.message || e).slice(0, 120)}); se generó con el brief directo.` };
  }
}
