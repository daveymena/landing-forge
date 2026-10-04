/* Paleta del producto: acento + luminosidad desde las fotos reales.
 * Usa el Chromium de Playwright (ya instalado). Para no depender del CORS
 * de cada tienda (canvas contaminado = sin pixeles), NAVEGA directo a cada
 * imagen: la pagina queda en el mismo origen y el canvas si se puede leer.
 * Sin dependencias nuevas. Si algo falla devuelve null y el generador
 * sigue con el tema base.
 */

export interface PaletteRole {
  url: string;
  w: number;
  h: number;
  wide: boolean;
}

export interface PaletteInfo {
  accent: string;
  accent2: string;
  dark: boolean;
  roles: PaletteRole[];
}

const MAX_ANALYZE = 4;

function hex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}

function toRoles(shots: Array<{ url: string; w: number; h: number }>): PaletteRole[] {
  return shots.map((s, i) => ({ url: s.url, w: s.w, h: s.h, wide: i > 0 && s.h > 0 && s.w / s.h >= 1.5 }));
}

export async function analyzePalette(urls: string[]): Promise<PaletteInfo | null> {
  const list = (urls || []).filter((u) => /^https?:/i.test(u)).slice(0, MAX_ANALYZE);
  if (!list.length) return null;
  let browser: any = null;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const shots: Array<{ url: string; w: number; h: number; px: number[] }> = [];
    for (const src of list) {
      let pg: any = null;
      try {
        pg = await browser.newPage();
        const resp = await pg.goto(src, { waitUntil: "load", timeout: 12000 });
        if (!resp || !resp.ok()) continue;
        const r: any = await pg.evaluate(() => {
          const im = document.querySelector("img");
          if (!im) return null;
          const nw = (im as any).naturalWidth || 0;
          const nh = (im as any).naturalHeight || 0;
          if (!nw || !nh) return null;
          const W = 56;
          const H = Math.max(1, Math.round((56 * nh) / nw));
          const cv = document.createElement("canvas");
          cv.width = W;
          cv.height = H;
          const cx = cv.getContext("2d", { willReadFrequently: true });
          if (!cx) return null;
          cx.drawImage(im, 0, 0, W, H);
          let d;
          try {
            d = cx.getImageData(0, 0, W, H).data;
          } catch (e) {
            return null;
          }
          const out: number[] = [];
          for (let i = 0; i < d.length; i += 16) out.push(d[i], d[i + 1], d[i + 2], d[i + 3]);
          return { w: nw, h: nh, px: out };
        });
        if (r && r.px) shots.push({ url: src, w: r.w || 0, h: r.h || 0, px: r.px });
      } catch {
      } finally {
        try {
          if (pg) await pg.close();
        } catch {
        }
      }
    }
    if (!shots.length) return null;
    const hist = new Map<number, { n: number; r: number; g: number; b: number }>();
    let lumSum = 0;
    let lumN = 0;
    for (const s of shots) {
      const px = s.px;
      for (let i = 0; i + 3 < px.length; i += 4) {
        const a = px[i + 3];
        if (a < 128) continue;
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        lumSum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        lumN++;
        if (r > 242 && g > 242 && b > 242) continue;
        if (r < 14 && g < 14 && b < 14) continue;
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const e = hist.get(key) || { n: 0, r: 0, g: 0, b: 0 };
        e.n++;
        e.r += r;
        e.g += g;
        e.b += b;
        hist.set(key, e);
      }
    }
    const roles = toRoles(shots);
    if (!hist.size || !lumN) return { accent: "", accent2: "", dark: false, roles };
    const arr = [...hist.entries()].map((en) => {
      const v = en[1];
      const n = v.n;
      const r = v.r / n;
      const g = v.g / n;
      const b = v.b / n;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx > 0 ? (mx - mn) / mx : 0;
      return { r, g, b, sat, score: n * (0.35 + sat) };
    });
    arr.sort((a, b) => b.score - a.score);
    const vivid = arr.find((c) => c.sat > 0.22) || arr[0];
    const second = arr.find((c) => c !== vivid && Math.abs(c.r - vivid.r) + Math.abs(c.g - vivid.g) + Math.abs(c.b - vivid.b) > 90) || arr[1] || vivid;
    return {
      accent: hex(vivid.r, vivid.g, vivid.b),
      accent2: hex(second.r, second.g, second.b),
      dark: lumSum / lumN < 0.45,
      roles,
    };
  } catch {
    return null;
  } finally {
    try {
      if (browser) await browser.close();
    } catch {
    }
  }
}
