/**
 * Verifica que el deploy de landing-forge esté corriendo el código nuevo.
 * Prueba los 3 fixes en vivo contra producción:
 *   1. /api/extract sin auth (fix da014e4)
 *   2. chunk del editor con clases m-only/d-only (fixes f2c3584, 9e8d3f6)
 *   3. /api/generate con IA real (groq)
 *
 *   node scripts/verificar-landingforge.mjs
 */
const BASE = "https://landing-forge.h9owya.easypanel.host";
const KEY = process.env.LANDINGFORGE_API_KEY || "";

let ok = 0, fail = 0;

function resultado(nombre, pasado, detalle = "") {
  console.log(`${pasado ? "✅" : "❌"} ${nombre}${detalle ? " — " + detalle : ""}`);
  pasado ? ok++ : fail++;
}

// 1. extract sin key: debe ser 200/422 (la 401 es el middleware viejo)
try {
  const r = await fetch(`${BASE}/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://www.apple.com" }),
    signal: AbortSignal.timeout(60000),
  });
  await r.text();
  resultado("extract sin auth", r.status !== 401, `status=${r.status}`);
} catch (e) { resultado("extract sin auth", false, e.message); }

// 2. chunks del editor con clases nuevas
try {
  const r2 = await fetch(`${BASE}/editor/site_j2ozfx2`, { signal: AbortSignal.timeout(25000) });
  const html = await r2.text();
  const chunks = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[A-Za-z0-9_-]+\.js/g)].map(m => m[0]))];
  let mOnly = false, dOnly = false;
  for (const u of chunks) {
    const rr = await fetch(`${BASE}${u}`, { signal: AbortSignal.timeout(30000) });
    const c = await rr.text();
    if (c.includes("m-only")) mOnly = true;
    if (c.includes("d-only")) dOnly = true;
  }
  resultado("editor botones moviles (m-only)", mOnly);
  resultado("editor topbar compacta (d-only)", dOnly);
} catch (e) { resultado("chunks editor", false, e.message); }

// 3. genera con IA
if (KEY) {
  try {
    const r = await fetch(`${BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY },
      body: JSON.stringify({ prompt: "Landing de prueba con pago contra entrega en Colombia", pro: true }),
      signal: AbortSignal.timeout(180000),
    });
    const j = await r.json().catch(() => ({}));
    resultado("generate con IA", r.ok && j.engine === "llm", `engine=${j.engine} provider=${j.provider} ms=${j.ms}`);
  } catch (e) { resultado("generate con IA", false, e.message); }
} else {
  console.log("⏭ generate: falta LANDINGFORGE_API_KEY en el entorno");
}

console.log(`\nResultado: ${ok} OK / ${fail} FALLOS`);
process.exit(fail ? 1 : 0);