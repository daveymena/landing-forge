import type { Vertical } from "../schema";

export interface Brief {
  prompt: string;
  productName: string;
  vertical: Vertical;
  category: string;
  price: number;
  compareAtPrice: number;
  currency: string;
  country: string;
  audience: string;
  benefit: string;
  tone: "directo" | "premium" | "cercano" | "técnico";
  whatsapp: string;
}

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  colombia: "COP", méxico: "MXN", mexico: "MXN", ecuador: "USD", perú: "PEN", peru: "PEN",
  chile: "CLP", argentina: "ARS", panamá: "PAB", panama: "PAB", "costa rica": "CRC",
  guatemala: "GTQ", paraguay: "PYG", españa: "EUR", espana: "EUR", venezuela: "USD",
};

const CATEGORIES: { id: string; words: string[] }[] = [
  { id: "belleza", words: ["belleza", "skincare", "piel", "crema", "serum", "sérum", "cabello", "pelo", "maquillaje", "cosmét", "uñas", "depilad", "facial", "antiarrug"] },
  { id: "salud", words: ["salud", "dolor", "postura", "masaje", "ortopéd", "ortoped", "articulac", "rodilla", "espalda", "sueño", "ronquid", "presión", "diabet"] },
  { id: "fitness", words: ["fitness", "gym", "ejercicio", "abdomen", "músculo", "musculo", "adelgaz", "bajar de peso", "entrenamiento", "yoga", "correr"] },
  { id: "cocina", words: ["cocina", "sartén", "sarten", "olla", "licuadora", "freidora", "air fryer", "cuchillo", "utensilio", "café", "cafetera", "termo"] },
  { id: "hogar", words: ["hogar", "casa", "limpieza", "organizador", "aspirador", "aspiradora", "colchón", "colchon", "almohada", "lámpara", "lampara", "decorac", "jardín", "jardin"] },
  { id: "mascotas", words: ["mascota", "perro", "gato", "cachorro", "pet", "veterinar"] },
  { id: "tecnologia", words: ["tecnolog", "audífono", "audifono", "bluetooth", "smartwatch", "reloj inteligente", "cámara", "camara", "drone", "cargador", "parlante", "proyector", "gadget"] },
  { id: "bebe", words: ["bebé", "bebe", "niño", "nino", "infantil", "coche", "pañal", "panal", "maternidad"] },
  { id: "auto", words: ["auto", "carro", "moto", "vehículo", "vehiculo", "llanta", "limpiaparabrisas", "scooter"] },
  { id: "moda", words: ["moda", "ropa", "zapato", "tenis", "bolso", "reloj", "joya", "gafas", "faja", "camiseta"] },
  { id: "negocio", words: ["negocio", "emprend", "venta", "marketing", "agencia", "freelance", "ecommerce", "dropship", "clientes", "leads"] },
  { id: "educacion", words: ["curso", "clase", "aprende", "enseñ", "mentoría", "mentoria", "taller", "academia", "idioma", "inglés", "ingles", "programación", "programacion"] },
  { id: "software", words: ["software", "saas", "app", "plataforma", "api", "dashboard", "crm", "automatiz", "inteligencia artificial", " ia ", "herramienta"] },
  { id: "finanzas", words: ["finanz", "inversión", "inversion", "trading", "cripto", "ahorro", "crédito", "credito", "contab"] },
];

const STOP = new Set(
  ("landing page para de del la el los las una un con que y o en por sobre crea crear " +
    "generar genera hazme haz necesito quiero diseña diseñar vender venta producto página pagina " +
    "sitio web mi nuestro nuestra es son como tipo estilo moderna moderno profesional").split(/\s+/),
);

/** recorta a `max` caracteres sin partir palabras */
function trimToWord(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t.replace(/[\s,;:.-]+$/, "");
  const cut = t.slice(0, max);
  const i = cut.lastIndexOf(" ");
  let out = (i > 12 ? cut.slice(0, i) : cut).replace(/[\s,;:.-]+$/, "");
  // no dejar preposiciones/artículos colgando al final
  const DANGLING = /\s+(?:de|del|la|el|los|las|un|una|unos|unas|con|por|al|a|en|para|que|y|o|su|sus|sin|como|desde|hasta|muy|más|mas)$/i;
  while (DANGLING.test(out)) out = out.replace(DANGLING, "");
  return out;
}

function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1) : w));
}

const ACCENTS: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" };
export function fold(s: string): string {
  return s.toLowerCase().replace(/[áéíóúüñ]/g, (c) => ACCENTS[c] ?? c);
}
const RX = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Palabra completa (admite plural/género): "app" casa con "apps" pero no con "whatsapp". */
export function hasWord(text: string, term: string): boolean {
  const t = fold(term).trim();
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${RX(t)}(s|es|a|as|o|os)?($|[^a-z0-9])`, "i").test(text);
}

/** Como hasWord pero, si el término es largo (≥6), también acepta sufijos: "cosmet" → "cosmética". */
function hasTerm(text: string, term: string): boolean {
  const t = fold(term).trim();
  if (!t) return false;
  if (t.length < 6) return hasWord(text, t);
  return new RegExp(`(^|[^a-z0-9])${RX(t)}`, "i").test(text);
}

const VERTICAL_SIGNALS: Record<Vertical, string[]> = {
  cod: ["contraentrega", "contra entrega", "pago al recibir", "paga al recibir", "cod", "dropi", "dropshipping",
    "dropship", "envio gratis", "envio", "transportadora", "producto fisico", "unidades", "guia"],
  digital: ["curso", "cursos", "ebook", "e-book", "infoproducto", "masterclass", "mentoria", "taller", "webinar",
    "plantillas", "membresia", "descargable", "pdf", "comunidad", "cohorte", "modulos", "clases"],
  saas: ["saas", "suscripcion", "suscripciones", "mensualidad", "plan mensual", "software", "plataforma", "app",
    "aplicacion", "dashboard", "crm", "erp", "api", "usuarios", "prueba gratis", "trial", "licencia"],
  service: ["servicio", "servicios", "agencia", "consultoria", "consultor", "asesoria", "asesor", "cita",
    "agendar", "cotizacion", "diagnostico", "estudio", "despacho"],
};

export function parseBrief(prompt: string): Brief {
  const raw = prompt.trim();
  const p = fold(raw);
  const has = (...w: string[]) => w.some((x) => hasWord(p, x));

  /* ---- vertical: por puntaje, no por el primero que coincida ---- */
  const scores: Record<string, number> = { cod: 0, digital: 0, saas: 0, service: 0 };
  (Object.keys(VERTICAL_SIGNALS) as Vertical[]).forEach((v) => {
    for (const w of VERTICAL_SIGNALS[v]) if (hasWord(p, w)) scores[v] += w.includes(" ") ? 2 : 1;
  });
  // señales fuertes
  if (hasWord(p, "contraentrega") || p.includes("contra entrega") || hasWord(p, "dropi")) scores.cod += 4;
  if (hasWord(p, "suscripcion") || hasWord(p, "saas")) scores.saas += 4;
  if (hasWord(p, "curso") || hasWord(p, "infoproducto")) scores.digital += 4;
  const best = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? ["cod", 0]) as [Vertical, number];
  const vertical: Vertical = best[1] > 0 ? best[0] : "cod";

  /* ---- categoría ---- */
  let category = "general";
  for (const c of CATEGORIES) if (c.words.some((w) => hasTerm(p, w))) { category = c.id; break; }

  /* ---- país / moneda ---- */
  let country = "colombia";
  let currency = vertical === "cod" || vertical === "service" ? "COP" : "USD";
  for (const [k, v] of Object.entries(CURRENCY_BY_COUNTRY)) {
    if (p.includes(k)) { country = k; currency = v; break; }
  }
  if (has("usd", "dólares", "dolares")) currency = "USD";
  if (has("cop", "pesos colombianos")) currency = "COP";

  /* ---- precios ---- */
  // 1) quitar teléfonos/WhatsApp para que no se confundan con precios
  const forPrice = raw
    .replace(/(?:whatsapp|wasap|wpp|cel(?:ular)?|tel(?:[eé]fono)?|móvil|movil)\s*[:#]?\s*\+?[\d\s().-]{7,20}/gi, " ")
    .replace(/\+\d[\d\s().-]{7,20}/g, " ")
    .replace(/\b\d{8,}\b/g, " ");

  // 2) unidades que descalifican un número como precio ("12 módulos", "14 días", "8L")
  const UNIT =
    /^\s*(?:modulos?|lecciones?|clases?|videos?|dias?|horas?|h|minutos?|min|meses?|mes|anos?|anios?|semanas?|unidades?|und|uds?|piezas?|personas?|clientes?|usuarios?|cupos?|paginas?|preguntas?|pasos?|litros?|lt|ml|kg|gr?|cm|mm|mt|pulgadas?|w|v|%|x\b)/i;
  const STRONG = /(?:\$|usd|cop|mxn|clp|ars|pen|eur|precio|vale|cuesta|cobro|desde|por\s+solo|solo|antes|normal|oferta|promo|al\s+mes|mensual)/i;

  type Cand = { n: number; score: number; before: string };
  const cands: Cand[] = [];
  for (const m of forPrice.matchAll(/(\d{1,3}(?:[.,]\d{3})+|\d{1,7})(?:\s?(mil|k))?/gi)) {
    const i = m.index ?? 0;
    const before = forPrice.slice(Math.max(0, i - 18), i);
    const after = forPrice.slice(i + m[0].length, i + m[0].length + 14);
    let n = Number(String(m[1]).replace(/[.,]/g, ""));
    if (m[2]) n *= 1000;
    if (n < 5 || n > 50_000_000) continue;
    if (UNIT.test(after) && !/^\s*(?:usd|cop|mxn|clp|ars|pen|eur)/i.test(after)) continue;
    let score = 0;
    if (/[$]\s?$/.test(before)) score += 5;
    if (STRONG.test(before)) score += 3;
    if (/^\s*(?:usd|cop|mxn|clp|ars|pen|eur|pesos|d[oó]lares|soles|al mes|\/mes|mensual)/i.test(after)) score += 4;
    if (String(m[1]).includes(".") || String(m[1]).includes(",")) score += 2; // 89.900
    if (m[2]) score += 2; // "40 mil"
    if (n >= 1000) score += 1;
    cands.push({ n, score, before });
  }
  const minor = currency === "USD" || currency === "EUR" || currency === "PEN";
  const ranked = cands
    .filter((c) => c.score > 0 || (minor ? c.n >= 9 : c.n >= 1000))
    .sort((a, b) => b.score - a.score);

  const fallbackPrice = minor ? 49 : currency === "MXN" ? 899 : 89900;
  let price = ranked[0]?.n ?? fallbackPrice;
  // "antes / normalmente X" marca el precio tachado
  const marked = cands.find((c) => /(?:antes|normal|regular|tachado|de\s*)$/i.test(c.before.trim()) && c.n > price);
  const higher = cands.filter((c) => c.n > price).sort((a, b) => a.n - b.n)[0];
  let compareAtPrice = marked?.n ?? higher?.n ?? Math.round(price * 1.6);
  if (!minor) compareAtPrice = Math.round(compareAtPrice / 100) * 100;

  /* ---- nombre del producto ---- */
  let productName = "";
  const quoted = raw.match(/["“”'']([^"“”'']{3,48})["“”'']/);
  if (quoted) productName = quoted[1];
  if (!productName) {
    const noun = raw.match(
      /\b((?:curso|programa|taller|masterclass|mentor[ií]a|membres[ií]a|ebook|software|plataforma|servicio|producto|app)\s+(?:online\s+|digital\s+)?(?:de\s+|para\s+)?[^.,;:\n]{3,50})/i,
    );
    const verb = raw.match(
      /(?:vender|promocionar|promover|lanzar|ofrecer|landing\s+(?:page\s+)?(?:de|para|del))\s+(?:un[ao]?\s+|el\s+|la\s+|mi\s+|los\s+|las\s+)?([^.,;:\n]{3,60})/i,
    );
    productName = noun?.[1] ?? verb?.[1] ?? "";
  }
  if (!productName) productName = raw.slice(0, 60);
  // cortar donde empieza el complemento (país, precio, audiencia, condiciones…)
  productName = productName.split(
    /\s+(?:en|a|por|con|para|desde|que|y|usando|v[ií]a)\s+|\s*\$|\s+\d[\d.,]*\s*(?:usd|cop|mxn|clp|ars|pen|eur|pesos|d[oó]lares)\b/i,
  )[0];
  // cortar condiciones comerciales que no son parte del nombre
  productName = productName.split(
    /\s+(?:contraentrega|contra\s+entrega|env[ií]o|gratis|garant[ií]a|pago|precio|oferta|promoci[oó]n|descuento|cuotas?)\b/i,
  )[0];
  {
    let words = productName
      .replace(/[^\p{L}\p{N}\s%+-]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
    // quitar stopwords solo en los extremos ("de" en medio sí se conserva: "Freidora de Aire")
    while (words.length && STOP.has(fold(words[0]))) words.shift();
    while (words.length && STOP.has(fold(words[words.length - 1]))) words.pop();
    words = words.slice(0, 5);
    while (words.length > 1 && STOP.has(fold(words[words.length - 1]))) words.pop();
    productName = titleCase(words.join(" ").trim()) || "Tu Producto";
  }

  /* ---- audiencia ---- */
  const am = raw.match(
    /(?:para|dirigido a|público:?|publico:?)\s+((?:mujeres|hombres|mam[áa]s|pap[áa]s|emprendedores|estudiantes|creadores|freelancers|due[ñn]os|equipos|personas|negocios|pymes|empresas|profesionales|m[ée]dicos|abogados|restaurantes|tiendas|adultos|j[óo]venes|padres|gente)[^.,;:\n]{0,60})/i,
  );
  const audience = am ? trimToWord(am[1].trim(), 54) : "";

  /* ---- tono ---- */
  let tone: Brief["tone"] = "directo";
  if (has("premium", "lujo", "elegante", "exclusiv")) tone = "premium";
  if (has("cercano", "amigable", "divertid", "casual")) tone = "cercano";
  if (has("técnic", "tecnic", "developer", "api", "ingenier")) tone = "técnico";

  /* ---- whatsapp ---- */
  const wa = raw.match(/(?:whatsapp|wa|cel|tel)[^\d+]{0,12}(\+?\d[\d\s-]{7,16})/i);
  const whatsapp = wa ? wa[1].replace(/\D/g, "") : "";

  const benefit = BENEFIT_BY_CATEGORY[category]?.[0] ?? "resultados visibles desde el primer uso";

  return { prompt: raw, productName, vertical, category, price, compareAtPrice, currency, country, audience, benefit, tone, whatsapp };
}

export const BENEFIT_BY_CATEGORY: Record<string, string[]> = {
  belleza: ["una piel visiblemente más firme", "resultados que se notan en 14 días", "rutina de 2 minutos al día"],
  salud: ["alivio real del dolor", "descanso profundo todas las noches", "movilidad sin molestias"],
  fitness: ["entrenar en casa sin excusas", "resultados sin gimnasio", "15 minutos al día"],
  cocina: ["comidas listas en la mitad del tiempo", "menos grasa, mismo sabor", "una cocina sin desorden"],
  hogar: ["una casa impecable en minutos", "orden que por fin dura", "ahorro real en la factura"],
  mascotas: ["una mascota feliz y tranquila", "menos pelo por toda la casa", "paseos sin tirones"],
  tecnologia: ["la experiencia que esperabas de una marca cara", "batería que aguanta todo el día", "conexión en segundos"],
  bebe: ["noches tranquilas para toda la casa", "seguridad en cada salida", "menos estrés, más disfrute"],
  auto: ["tu carro como recién salido del concesionario", "seguridad en cada viaje", "mantenimiento que te ahorra plata"],
  moda: ["la silueta que buscabas", "un look que se nota", "comodidad todo el día"],
  negocio: ["más clientes sin gastar más en publicidad", "procesos que corren solos", "decisiones con datos reales"],
  educacion: ["el paso a paso que nadie te explica", "resultados aplicables desde la semana 1", "aprender haciendo"],
  software: ["dejar de perder horas en tareas manuales", "todo tu equipo en un solo lugar", "poner en marcha en minutos"],
  finanzas: ["poner tu dinero a trabajar", "claridad total sobre tus números", "ahorrar sin dejar de vivir"],
  general: ["resultados visibles desde el primer uso", "una solución que sí funciona", "menos esfuerzo, más resultado"],
};

export const ICONS_BY_CATEGORY: Record<string, string[]> = {
  belleza: ["✨", "💧", "🌿", "🧴", "⏱️", "💎"],
  salud: ["🫀", "😴", "🦴", "🧘", "🩺", "🛡️"],
  fitness: ["💪", "🔥", "⏱️", "🏃", "📈", "🎯"],
  cocina: ["🍳", "⚡", "🧼", "🥗", "⏲️", "👨‍🍳"],
  hogar: ["🏠", "🧹", "💡", "📦", "🌬️", "🔌"],
  mascotas: ["🐾", "🦴", "🧸", "✂️", "❤️", "🚿"],
  tecnologia: ["🔋", "📶", "🎧", "⚡", "📱", "🛰️"],
  bebe: ["🍼", "🧸", "🛡️", "😴", "🚼", "❤️"],
  auto: ["🚗", "✨", "🔧", "🛞", "🧴", "🛡️"],
  moda: ["👗", "✨", "🧵", "🪞", "💃", "🧥"],
  negocio: ["📈", "🎯", "⚙️", "💬", "🧠", "💰"],
  educacion: ["🎓", "📚", "🧠", "🎯", "🏆", "💬"],
  software: ["⚡", "🔌", "🛡️", "📊", "🤖", "🧩"],
  finanzas: ["💰", "📊", "🏦", "🔐", "📈", "🧮"],
  general: ["⚡", "🎯", "💎", "🛡️", "📦", "❤️"],
};

/** Titulares ya redactados en 2ª persona: evita concatenar beneficios en infinitivo. */
export const HEADLINE_DIGITAL: Record<string, string> = {
  educacion: "El paso a paso que nadie te explica, por fin en orden",
  negocio: "Consigue más clientes sin gastar más en publicidad",
  finanzas: "Pon tu dinero a trabajar con un plan que sí entiendes",
  software: "Automatiza tu operación aunque no sepas programar",
  fitness: "Entrena en casa y nota el cambio en 30 días",
  belleza: "La rutina de 2 minutos que cambia tu piel",
  salud: "Recupera tu energía con un método que puedes sostener",
  cocina: "Cocina mejor en la mitad del tiempo",
  general: "El método completo para lograrlo sin perder meses probando",
};

export const HEADLINE_SAAS: Record<string, string> = {
  software: "Deja de hacer a mano lo que puede hacerse solo",
  negocio: "Atiende el doble de clientes con la mitad del trabajo",
  finanzas: "Claridad total sobre tus números, en tiempo real",
  educacion: "Gestiona tus alumnos y tus cobros desde un solo panel",
  salud: "Agenda, historias y recordatorios en un solo lugar",
  general: "Todo tu equipo en un solo lugar, sin fricción",
};

export const HEADLINE_SERVICE: Record<string, string> = {
  negocio: "Más clientes cada mes, sin contratar un equipo completo",
  software: "Tu producto en producción, sin montar un equipo interno",
  finanzas: "Ordena tus números y toma decisiones con datos",
  belleza: "Resultados visibles con un plan hecho para ti",
  salud: "Un plan a tu medida, con acompañamiento real",
  general: "Resultados medibles, sin contratar un equipo completo",
};
