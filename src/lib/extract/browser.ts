/* ------------------------------------------------------------------ *
 *  Extracción con navegador real (Chromium vía Playwright).
 *  Para páginas JS pesadas o con anti-bot básico (Shein, AliExpress):
 *  navega, espera el render, captura pantalla y devuelve el HTML
 *  ya renderizado para pasarlo al extractor normal.
 * ------------------------------------------------------------------ */

import { parseProduct } from "./index";
import type { ExtractResult } from "./index";

export interface BrowserExtractResult extends ExtractResult {
  screenshot: string | null;
}

export async function extractWithBrowser(url: string): Promise<BrowserExtractResult> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      locale: "es-CO",
      viewport: { width: 1366, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    // deja que el JS hidrate precio/fotos (PDPs cargan diferido)
    await page.waitForTimeout(6000);
    // scroll para disparar lazy-load de galerías
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollTo(0, 0));
    const html = await page.content();
    const shot = await page.screenshot({ type: "jpeg", quality: 70 }).catch(() => null);
    await ctx.close();
    const parsed = parseProduct(html, url);
    return {
      ...parsed,
      screenshot: shot ? `data:image/jpeg;base64,${(shot as Buffer).toString("base64")}` : null,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
