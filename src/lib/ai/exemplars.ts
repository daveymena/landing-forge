/* ------------------------------------------------------------------ *
 *  Ejemplares few-shot para el MODO PRO.
 *  Son flujos reales que convierten (estilo Mastershop / COD agresivo /
 *  VSL digital). Se inyectan condensados en el system prompt para que
 *  la IA diseñe desde cero como un pro en vez de rellenar la maqueta.
 * ------------------------------------------------------------------ */

export interface Exemplar {
  id: string;
  vertical: string;
  label: string;
  flow: string;
  copy: string;
}

export const EXEMPLARS: Exemplar[] = [
  {
    id: "cod-bolso",
    vertical: "cod",
    label: "COD Bolso antirrobo (oferta 2x1, urgency)",
    flow: "announcement(marquee) → navbar(minimal) → hero(product) → trustIcons(row) → countdown(bar) → benefits(grid) → gallery(scroll) → reviewsUgc(scroll) → comparison(duel) → bundle(cards) → countdown(block) → codForm(split) → guarantee(banner) → faq(accordion) → ctaFinal(gradient) → stickyCta(bar)",
    copy: "Titular: «Lleva todo seguro y con estilo: antirrobo, impermeable y con USB». Bundle: 1×89900, 2×159900(featured), 3×219900. Reviews con nombre+ciudad: «Lina, Bogotá: me llegó en 2 días…». FAQ objeciones: pago al recibir, demora 24-72h, devolución 30 días.",
  },
  {
    id: "saas-mastershop",
    vertical: "saas",
    label: "Plataforma estilo Mastershop (métricas + prueba social)",
    flow: "announcement(gradient) → navbar(links) → hero(split) → logos(marquee) → stats(row) → bento(grid4) → steps(horizontal) → video(wide) → testimonials(scroll) → comparison(table) → pricing(tiers) → leadForm(card) → faq(columns) → ctaFinal(gradient)",
    copy: "Titular resultado: «La plataforma que hace a los dropshippers más rentables». Stats: +2.600 órdenes/mes, devoluciones 30%→12%. Testimonios con edad+pedidos: «Mateo, 19 años». Prueba gratis sin tarjeta.",
  },
  {
    id: "digital-vsl",
    vertical: "digital",
    label: "Curso VSL (dolor + pila de valor + deadline)",
    flow: "announcement(gradient) → navbar(minimal) → hero(vsl) → logos(marquee) → problem(cards) → benefits(list) → video(wide) → curriculum(accordion) → testimonials(featured) → valueStack(cards) → guarantee(banner) → pricing(single) → countdown(block) → faq(accordion) → ctaFinal(gradient)",
    copy: "Titular: «De cero a tu primera venta en 30 días (sin experiencia)». Value stack: curso + 3 bonos con precio tachado individual. Garantía 14 días. Countdown 15 min + stock.",
  },
];

export function exemplarsFor(vertical: string): Exemplar[] {
  const same = EXEMPLARS.filter((e) => e.vertical === vertical);
  return same.length ? same : EXEMPLARS;
}

export function exemplarsBlock(): string {
  return EXEMPLARS.map((e) => `EJEMPLO ${e.id} [${e.vertical}] ${e.label}\nFlujo: ${e.flow}\nCopy: ${e.copy}`).join("\n\n");
}
