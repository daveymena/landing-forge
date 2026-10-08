/* Prueba del 08-10: videos en la landing (enlaces de cada red + galería).
   Uso: npx tsx scripts/probar-video.ts */
import assert from "node:assert/strict";
import { leerVideo, esVideo } from "../src/lib/render/video";
import { PageSpecSchema } from "../src/lib/schema";
import { renderPage } from "../src/lib/render/index";

const casos: Array<[string, string | null]> = [
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube-nocookie.com/embed/dQw4w9WgXcQ"],
  ["https://youtube.com/shorts/dQw4w9WgXcQ?si=abc", "youtube-nocookie.com/embed/dQw4w9WgXcQ"],
  ["https://youtu.be/dQw4w9WgXcQ", "youtube-nocookie.com/embed/dQw4w9WgXcQ"],
  ["https://www.tiktok.com/@tienda/video/7234567890123456789?lang=es", "tiktok.com/embed/v2/7234567890123456789"],
  ["https://www.instagram.com/reel/C9abcDEF123/", "instagram.com/reel/C9abcDEF123/embed"],
  ["https://www.facebook.com/tienda/videos/1234567890/", "facebook.com/plugins/video.php"],
  ["https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing", "drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/preview"],
  ["https://vimeo.com/76979871", "player.vimeo.com/video/76979871"],
  ["https://landings.ventasproia.com/api/media/0123456789abcdef.mp4", "0123456789abcdef.mp4"],
  ["https://cdn.dropi.co/videos/producto.MOV?x=1", "producto.MOV"],
  ["https://cdn.ejemplo.com/foto.jpg", null],
  ["https://www.tiendaajena.com/producto", null],
];
for (const [url, espera] of casos) {
  const v = leerVideo(url);
  if (espera === null) assert.equal(v, null, `no debería ser video: ${url}`);
  else assert.ok(v && v.src.includes(espera), `${url} → ${v?.src}`);
}
assert.equal(leerVideo("https://youtube.com/shorts/dQw4w9WgXcQ")?.tipo === "iframe" && (leerVideo("https://youtube.com/shorts/dQw4w9WgXcQ") as any).vertical, true);
assert.equal(esVideo("https://cdn.ejemplo.com/foto.webp"), false);
console.log(`✓ ${casos.length} enlaces clasificados bien`);

/* ---- La landing renderizada, como la ve el cliente ---- */
const spec = PageSpecSchema.parse({
  id: "prueba-video",
  vertical: "cod",
  product: {
    name: "Corrector de Postura",
    price: 55000,
    images: ["https://cdn.ejemplo.com/corrector-1.jpg", "https://cdn.ejemplo.com/corrector-2.jpg"],
    videos: ["https://www.tiktok.com/@tienda/video/7234567890123456789"],
  },
  blocks: [
    { id: "h", type: "hero", variant: "product", props: { title: "Corrector", image: "https://cdn.ejemplo.com/corrector-1.jpg" } },
    // El caso del dueño: un solo video en la galería. Antes la sección entera se ocultaba.
    { id: "g", type: "gallery", props: { title: "Míralo en uso", items: [{ src: "https://youtube.com/shorts/dQw4w9WgXcQ" }] } },
  ],
});
const html = renderPage(spec, { mode: "export" });
assert.ok(html.includes("tiktok.com/embed/v2/7234567890123456789"), "el video de TikTok tiene que estar en la galería del producto");
assert.ok(html.includes('data-video="1"'), "la miniatura del video tiene que estar entre las de la galería");
assert.ok(html.includes("gal__play"), "la miniatura del video lleva el ▶");
assert.ok(html.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"), "la galería con un solo video NO se oculta");
assert.ok(!/<img[^>]+(tiktok|youtube)\.com/.test(html), "ningún video se pinta como <img> roto");
// Orden: la foto principal primero (carga al instante), el video segundo.
const thumbs = html.slice(html.indexOf("gal__thumbs"));
assert.ok(thumbs.indexOf("corrector-1.jpg") < thumbs.indexOf('data-video="1"'), "primero la foto, después el video");
console.log("✓ galería del producto con foto + video, y galería de un solo video visible");

// Un video pegado en el campo de FOTO del hero tampoco se rompe.
const spec2 = PageSpecSchema.parse({ id: "p2", vertical: "cod", product: { name: "X", price: 1 },
  blocks: [{ id: "h", type: "hero", variant: "split", props: { title: "X", image: "https://youtu.be/dQw4w9WgXcQ" } }] });
assert.ok(renderPage(spec2, { mode: "export" }).includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"), "video en campo de foto → se muestra como video");
console.log("✓ video pegado en un campo de foto se muestra como video");
