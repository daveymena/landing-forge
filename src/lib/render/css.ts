import type { Theme } from "../schema";

const GOOGLE_WEIGHTS: Record<string, string> = {
  Inter: "wght@400;500;600;700",
  "Space Grotesk": "wght@500;600;700",
  Archivo: "wght@500;600;700;800",
  Outfit: "wght@500;600;700;800",
  "Instrument Sans": "wght@500;600;700",
  "Plus Jakarta Sans": "wght@500;600;700;800",
  Fraunces: "opsz,wght@9..144,500;9..144,600;9..144,700",
  Sora: "wght@500;600;700;800",
  "IBM Plex Sans": "wght@400;500;600;700",
};

export function fontLink(theme: Theme): string {
  if (!theme.fonts.webfonts) return "";
  const fams = Array.from(new Set([theme.fonts.display, theme.fonts.sans])).filter(Boolean);
  const parts = fams.map((f) => {
    const w = GOOGLE_WEIGHTS[f] ?? "wght@400;500;600;700";
    return `family=${f.replace(/ /g, "+")}:${w}`;
  });
  if (!parts.length) return "";
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap">`;
}

const DENSITY: Record<string, { sec: string; gap: string }> = {
  compact: { sec: "clamp(44px, 6vw, 72px)", gap: "18px" },
  normal: { sec: "clamp(64px, 8vw, 112px)", gap: "22px" },
  spacious: { sec: "clamp(88px, 11vw, 160px)", gap: "28px" },
};

const GRAIN =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E";

export function buildCss(theme: Theme): string {
  const c = theme.colors;
  const d = DENSITY[theme.density] ?? DENSITY.normal;
  const isDark = theme.mode === "dark";

  return `
:root{
  --bg:${c.bg}; --surface:${c.surface}; --surface2:${c.surfaceAlt}; --border:${c.border};
  --text:${c.text}; --muted:${c.muted}; --accent:${c.accent}; --accent-fg:${c.accentFg};
  --accent2:${c.accent2}; --ok:${c.success}; --danger:${c.danger};
  --r:${theme.radius}px; --r-sm:${Math.max(6, Math.round(theme.radius * 0.5))}px;
  --r-lg:${Math.round(theme.radius * 1.5)}px; --r-pill:999px;
  --wrap:${theme.maxWidth}px; --sec:${d.sec}; --gap:${d.gap};
  --ff-display:'${theme.fonts.display}', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --ff-sans:'${theme.fonts.sans}', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --shadow-sm:0 1px 2px rgba(0,0,0,${isDark ? ".5" : ".06"});
  --shadow:0 18px 50px -18px rgba(0,0,0,${isDark ? ".85" : ".18"});
  --shadow-accent:0 18px 50px -16px color-mix(in srgb, var(--accent) 55%, transparent);
  --line:color-mix(in srgb, var(--border) 100%, transparent);
  --hair:1px solid var(--border);
}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--ff-sans);
  font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%;display:block;border-radius:var(--r-sm)}
a{color:inherit;text-decoration:none}
button{font:inherit}
svg{display:block}
::selection{background:var(--accent);color:var(--accent-fg)}

${
  theme.effects.grain
    ? `body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:9998;
  background-image:url("${GRAIN}");opacity:${isDark ? ".035" : ".025"};mix-blend-mode:${isDark ? "screen" : "multiply"}}`
    : ""
}

/* ---------- layout ---------- */
.wrap{width:100%;max-width:var(--wrap);margin-inline:auto;padding-inline:20px}
.sec{position:relative;padding-block:var(--sec)}
.sec--surface{background:var(--surface)}
.sec--accent{background:color-mix(in srgb, var(--accent) 12%, var(--bg))}
.sec--gradient{background:
  radial-gradient(900px 420px at 15% 0%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 70%),
  radial-gradient(700px 380px at 90% 100%, color-mix(in srgb, var(--accent2) 22%, transparent), transparent 70%),
  var(--surface)}
.sec--tight{padding-block:calc(var(--sec) * .55)}
.sec__head{max-width:720px;margin-bottom:clamp(30px,4vw,52px)}
.sec__head--center{margin-inline:auto;text-align:center}

/* ---------- tipografía ---------- */
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;
  letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:0 0 14px}
.eyebrow::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent);
  box-shadow:0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent)}
.sec__head--center .eyebrow{justify-content:center}
h1,h2,h3,h4{font-family:var(--ff-display);font-weight:700;margin:0;letter-spacing:-.03em;line-height:1.1;
  text-wrap:balance}
.h1{font-size:clamp(2.2rem,4.9vw,3.6rem);line-height:1.07}
.h2{font-size:clamp(1.8rem,3.4vw,2.7rem);letter-spacing:-.025em;line-height:1.12}
.h3{font-size:clamp(1.15rem,1.8vw,1.4rem);letter-spacing:-.015em;line-height:1.25}
.lead{font-size:clamp(1.02rem,1.35vw,1.19rem);color:var(--muted);margin:16px 0 0;max-width:62ch;text-wrap:pretty}
.sec__head--center .lead{margin-inline:auto}
.muted{color:var(--muted)}
.small{font-size:14px}
.tiny{font-size:12.5px}

/* ---------- botones ---------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;
  padding:14px 26px;border-radius:var(--r-pill);border:1px solid transparent;cursor:pointer;
  font-weight:650;font-size:15.5px;letter-spacing:-.01em;transition:transform .16s cubic-bezier(.2,.8,.2,1),box-shadow .2s,background .2s,opacity .2s;
  text-align:center;white-space:nowrap}
.btn:hover{transform:translateY(-2px)}
.btn:active{transform:translateY(0)}
.btn--primary{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 88%,#fff 12%),var(--accent));
  color:var(--accent-fg);box-shadow:var(--shadow-accent)}
.btn--primary:hover{box-shadow:0 22px 60px -14px color-mix(in srgb,var(--accent) 70%,transparent)}
.btn--ghost{background:transparent;border-color:var(--border);color:var(--text)}
.btn--ghost:hover{background:var(--surface2)}
.btn--soft{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 26%,transparent)}
.btn--lg{padding:18px 34px;font-size:17px}
.btn--block{width:100%}
.btn__arrow{transition:transform .2s}
.btn:hover .btn__arrow{transform:translateX(3px)}
.cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.sec__head--center .cta-row,.ta-c .cta-row{justify-content:center}
.cta-sub{margin-top:12px;font-size:13.5px;color:var(--muted)}

/* ---------- píldoras / badges ---------- */
.pill{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:var(--r-pill);
  border:var(--hair);background:color-mix(in srgb,var(--surface) 70%,transparent);
  font-size:13px;font-weight:550;color:var(--muted);backdrop-filter:blur(8px)}
.pill--accent{border-color:color-mix(in srgb,var(--accent) 35%,transparent);
  background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--ok);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 color-mix(in srgb,var(--ok) 60%,transparent)}
  50%{opacity:.75;box-shadow:0 0 0 6px transparent}}
.badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);
  background:var(--accent);color:var(--accent-fg);font-size:11.5px;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;padding:5px 14px;border-radius:var(--r-pill);white-space:nowrap}

/* ---------- tarjetas / grids ---------- */
.card{position:relative;background:var(--surface);border:var(--hair);border-radius:var(--r);
  padding:clamp(20px,2.4vw,28px);transition:border-color .2s,transform .2s,box-shadow .2s}
.card--alt{background:var(--surface2)}
.card:hover{border-color:color-mix(in srgb,var(--accent) 38%,var(--border))}
.card__ico{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;font-size:21px;
  background:color-mix(in srgb,var(--accent) 14%,transparent);margin-bottom:16px}
.card h3{margin-bottom:8px}
.card p{margin:0;color:var(--muted);font-size:15.3px;line-height:1.62}
.grid{display:grid;gap:var(--gap)}
.g2{grid-template-columns:repeat(2,1fr)}
.g3{grid-template-columns:repeat(3,1fr)}
.g4{grid-template-columns:repeat(4,1fr)}
.split{display:grid;grid-template-columns:1.08fr .92fr;gap:clamp(30px,4.4vw,56px);align-items:center}
.hero .split{align-items:center}
.hero__media .gal__main{aspect-ratio:4/5}
.ta-c{text-align:center}

/* ---------- bento ---------- */
.bento{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.bento .tile{position:relative;overflow:hidden;background:var(--surface);border:var(--hair);
  border-radius:var(--r-lg);padding:clamp(20px,2.3vw,28px);min-height:200px;
  display:flex;flex-direction:column;justify-content:flex-end;transition:border-color .25s,transform .25s}
.bento .tile::before{content:'';position:absolute;inset:0;
  background:radial-gradient(400px 180px at 0% 0%,color-mix(in srgb,var(--accent) 13%,transparent),transparent 65%);
  opacity:0;transition:opacity .35s}
.bento .tile:hover::before{opacity:1}
.bento .tile:hover{border-color:color-mix(in srgb,var(--accent) 40%,var(--border));transform:translateY(-3px)}
.bento .tile > *{position:relative;z-index:1}
.bento .tile h3{margin-bottom:6px}
.bento .tile p{margin:0;color:var(--muted);font-size:14.8px}
.bento .span2{grid-column:span 2}
.bento .span3{grid-column:span 3}
.tile__stat{font-family:var(--ff-display);font-size:clamp(2rem,3.6vw,2.9rem);font-weight:700;
  letter-spacing:-.035em;background:linear-gradient(135deg,var(--text),var(--accent));
  -webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:4px}

/* ---------- estrellas ---------- */
.stars{display:inline-flex;gap:2px;color:#ffb020;font-size:15px;letter-spacing:1px}
.rating-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:14px;color:var(--muted)}

/* ---------- precio ---------- */
.price{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.price__now{font-family:var(--ff-display);font-size:clamp(2rem,4vw,2.9rem);font-weight:700;letter-spacing:-.035em;line-height:1}
.price__was{font-size:1.05rem;color:var(--muted);text-decoration:line-through}
.price__off{background:var(--danger);color:#fff;font-size:12.5px;font-weight:700;padding:4px 10px;border-radius:var(--r-pill)}

/* ---------- hero ---------- */
.hero{position:relative;overflow:hidden;padding-block:calc(var(--sec) * .82)}
${
  theme.effects.glow
    ? `.hero::before{content:'';position:absolute;z-index:0;left:50%;top:-320px;width:min(1100px,130vw);height:620px;
  transform:translateX(-50%);pointer-events:none;
  background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) ${isDark ? "40" : "22"}%,transparent),transparent 72%);
  filter:blur(26px)}
.hero::after{content:'';position:absolute;z-index:0;right:-180px;bottom:-240px;width:620px;height:620px;pointer-events:none;
  background:radial-gradient(closest-side,color-mix(in srgb,var(--accent2) ${isDark ? "26" : "16"}%,transparent),transparent 72%);
  filter:blur(30px)}`
    : ""
}
.hero > .wrap{position:relative;z-index:1}
.hero .h1{margin-bottom:0}
.hero__media{position:relative}
.hero__media img{width:100%;border-radius:var(--r-lg);border:var(--hair);box-shadow:var(--shadow)}
.hero__bullets{list-style:none;padding:0;margin:26px 0 0;display:grid;gap:11px}
.hero__bullets li{display:flex;gap:11px;align-items:flex-start;font-size:15.6px;color:var(--text)}
.check{flex:0 0 21px;width:21px;height:21px;border-radius:50%;display:grid;place-items:center;
  background:color-mix(in srgb,var(--ok) 20%,transparent);color:var(--ok);font-size:12px;font-weight:800;margin-top:2px}

/* galería de producto */
.gal{display:grid;gap:12px}
.gal__main{position:relative;background:var(--surface);border:var(--hair);border-radius:var(--r-lg);overflow:hidden;aspect-ratio:1/1}
.gal__main img{width:100%;height:100%;object-fit:cover;border-radius:0}
.gal__thumbs{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
.gal__thumbs button{flex:0 0 72px;height:72px;border-radius:12px;overflow:hidden;border:2px solid var(--border);
  background:var(--surface);padding:0;cursor:pointer;transition:border-color .2s}
.gal__thumbs button[aria-selected=true]{border-color:var(--accent)}
.gal__thumbs img{width:100%;height:100%;object-fit:cover;border-radius:0}
.gal__thumbs button{position:relative}.gal__thumbs video{width:100%;height:100%;object-fit:cover;pointer-events:none}
.gal__play{position:absolute;inset:0;margin:auto;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:12px;display:grid;place-items:center;padding-left:2px}
.gal__main .vframe{border:0;border-radius:0}
.ph{width:100%;height:100%;min-height:180px;aspect-ratio:16/10;display:grid;place-items:center;
  color:var(--muted);font-size:13px;border-radius:var(--r-lg);
  background:repeating-linear-gradient(45deg,var(--surface),var(--surface) 12px,var(--surface2) 12px,var(--surface2) 24px)}
.gal__main .ph,.vframe .ph,.ba__col .ph{border-radius:0;aspect-ratio:auto}
.hero__media > .ph{aspect-ratio:4/3;border:var(--hair);box-shadow:var(--shadow)}

/* ---------- logos ---------- */
.logos{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:clamp(24px,4vw,56px);opacity:.72}
.logos .logo{font-family:var(--ff-display);font-weight:700;font-size:19px;letter-spacing:-.02em;color:var(--muted)}
.logos img{height:28px;width:auto;filter:grayscale(1);opacity:.85}
.marquee{overflow:hidden;position:relative;mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.marquee__track{display:flex;gap:56px;width:max-content;animation:scroll 32s linear infinite}
@keyframes scroll{to{transform:translateX(-50%)}}

/* ---------- pasos ---------- */
.steps{counter-reset:s;display:grid;gap:var(--gap)}
.steps--h{grid-template-columns:repeat(3,1fr)}
.step{position:relative;counter-increment:s;background:var(--surface);border:var(--hair);
  border-radius:var(--r);padding:clamp(22px,2.4vw,30px)}
.step::before{content:counter(s,decimal-leading-zero);font-family:var(--ff-display);font-size:13px;font-weight:700;
  color:var(--accent);letter-spacing:.14em;display:block;margin-bottom:14px}
.steps--v .step{padding-left:62px}
.steps--v .step::before{position:absolute;left:22px;top:28px;margin:0;width:28px;height:28px;border-radius:50%;
  display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 16%,transparent);font-size:12px}

/* ---------- comparativa ---------- */
.ctable{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;
  border:var(--hair);border-radius:var(--r);font-size:15.4px}
.ctable th,.ctable td{padding:16px 18px;text-align:left;border-bottom:var(--hair)}
.ctable thead th{background:var(--surface2);font-weight:650;font-size:13.5px;letter-spacing:.03em;text-transform:uppercase;color:var(--muted)}
.ctable tbody tr:last-child td{border-bottom:none}
.ctable td.us{background:color-mix(in srgb,var(--accent) 8%,transparent);font-weight:600}
.yes{color:var(--ok);font-weight:700}
.no{color:var(--muted);opacity:.65}
.duel{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.duel__col{border:var(--hair);border-radius:var(--r);padding:clamp(20px,2.4vw,28px);background:var(--surface)}
.duel__col--us{border-color:color-mix(in srgb,var(--accent) 45%,transparent);
  background:color-mix(in srgb,var(--accent) 7%,var(--surface));box-shadow:var(--shadow-accent)}
.duel__col h3{margin-bottom:16px}
.duel__col ul{list-style:none;margin:0;padding:0;display:grid;gap:11px}
.duel__col li{display:flex;gap:10px;font-size:15.3px;align-items:flex-start}

/* ---------- métricas ---------- */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);text-align:center}
.stat__v{font-family:var(--ff-display);font-size:clamp(1.9rem,3.4vw,2.7rem);font-weight:700;letter-spacing:-.035em;
  background:linear-gradient(135deg,var(--text) 30%,var(--accent));-webkit-background-clip:text;background-clip:text;color:transparent}
.stat__l{font-size:14px;color:var(--muted);margin-top:4px}

/* ---------- testimonios ---------- */
.quote{background:var(--surface);border:var(--hair);border-radius:var(--r);padding:clamp(20px,2.4vw,28px);
  display:flex;flex-direction:column;gap:14px;height:100%}
.quote p{margin:0;font-size:15.6px;line-height:1.66}
.who{display:flex;align-items:center;gap:12px;margin-top:auto}
.av{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:0 0 40px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));display:grid;place-items:center;
  color:var(--accent-fg);font-weight:700;font-size:15px;border-radius:50%}
.who__n{font-weight:620;font-size:14.6px;line-height:1.3}
.who__r{font-size:13px;color:var(--muted)}
.result{display:inline-block;font-size:13px;font-weight:650;color:var(--ok);
  background:color-mix(in srgb,var(--ok) 13%,transparent);padding:4px 10px;border-radius:var(--r-pill)}
.scroller{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;
  margin-inline:-20px;padding-inline:20px}
.scroller > *{scroll-snap-align:start;flex:0 0 min(340px,82vw)}

/* reseñas UGC */
.ugc{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.ugc__card{background:var(--surface);border:var(--hair);border-radius:var(--r);overflow:hidden}
.ugc__img{aspect-ratio:4/3;background:var(--surface2)}
.ugc__img img{width:100%;height:100%;object-fit:cover;border-radius:0}
.ugc__body{padding:16px 18px 18px}
.verified{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--ok);font-weight:600;margin-top:8px}

/* ---------- precios ---------- */
.plans{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}
.plan{position:relative;background:var(--surface);border:var(--hair);border-radius:var(--r-lg);
  padding:clamp(24px,2.6vw,32px);display:flex;flex-direction:column;gap:18px;height:100%}
.plan--featured{border-color:color-mix(in srgb,var(--accent) 55%,transparent);
  background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 9%,var(--surface)),var(--surface));
  box-shadow:var(--shadow-accent);transform:scale(1.02)}
.plan__name{font-family:var(--ff-display);font-weight:700;font-size:17px}
.plan__p{display:flex;align-items:baseline;gap:4px}
.plan__p b{font-family:var(--ff-display);font-size:clamp(2rem,3.4vw,2.6rem);font-weight:700;letter-spacing:-.035em}
.plan ul{list-style:none;margin:0;padding:0;display:grid;gap:11px;font-size:15px}
.plan li{display:flex;gap:10px;align-items:flex-start}
.toggle{display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border:var(--hair);
  border-radius:var(--r-pill);padding:4px;margin:0 auto 34px;width:max-content}
.toggle button{border:none;background:transparent;color:var(--muted);padding:9px 20px;border-radius:var(--r-pill);
  cursor:pointer;font-size:14.5px;font-weight:600;transition:all .2s}
.toggle button[aria-pressed=true]{background:var(--accent);color:var(--accent-fg)}
.toggle .save{font-size:11.5px;color:var(--ok);font-weight:700;margin-left:6px}

/* ---------- bundle COD ---------- */
.bundles{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:stretch}
.bundle{position:relative;display:block;width:100%;text-align:left;cursor:pointer;background:var(--surface);
  border:2px solid var(--border);border-radius:var(--r-lg);padding:24px 22px;transition:all .2s}
.bundle:hover{border-color:color-mix(in srgb,var(--accent) 50%,var(--border))}
.bundle[aria-pressed=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--surface));
  box-shadow:var(--shadow-accent)}
.bundle__l{font-family:var(--ff-display);font-weight:700;font-size:18px;margin-bottom:10px}
.bundle__p{font-family:var(--ff-display);font-size:1.75rem;font-weight:700;letter-spacing:-.03em;line-height:1}
.bundle__was{font-size:14px;color:var(--muted);text-decoration:line-through;margin-left:8px}
.bundle__n{font-size:13.5px;color:var(--ok);font-weight:600;margin-top:8px}
.bundle__radio{position:absolute;top:18px;right:18px;width:22px;height:22px;border-radius:50%;
  border:2px solid var(--border);display:grid;place-items:center}
.bundle[aria-pressed=true] .bundle__radio{border-color:var(--accent);background:var(--accent)}
.bundle[aria-pressed=true] .bundle__radio::after{content:'';width:8px;height:8px;border-radius:50%;background:var(--accent-fg)}

/* ---------- value stack ---------- */
.vstack{border:var(--hair);border-radius:var(--r);overflow:hidden;background:var(--surface)}
.vrow{display:flex;gap:16px;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:var(--hair)}
.vrow:last-child{border-bottom:none}
.vrow__v{font-family:var(--ff-display);font-weight:700;white-space:nowrap;color:var(--muted);text-decoration:line-through}
.vrow--total{background:var(--surface2);font-weight:700}
.vrow--today{background:color-mix(in srgb,var(--accent) 12%,transparent)}
.vrow--today .vrow__v{text-decoration:none;color:var(--accent);font-size:1.5rem}

/* ---------- garantía ---------- */
.guar{display:flex;gap:clamp(20px,3vw,34px);align-items:center;background:var(--surface);
  border:var(--hair);border-radius:var(--r-lg);padding:clamp(24px,3vw,40px)}
.seal{flex:0 0 clamp(88px,10vw,116px);height:clamp(88px,10vw,116px);border-radius:50%;display:grid;place-items:center;
  text-align:center;font-family:var(--ff-display);font-weight:700;font-size:clamp(15px,1.7vw,19px);line-height:1.1;
  color:var(--accent-fg);box-shadow:var(--shadow-accent);
  background:radial-gradient(circle at 32% 24%,color-mix(in srgb,#fff 26%,var(--accent)),var(--accent) 62%);
  border:3px solid color-mix(in srgb,var(--accent-fg) 55%,transparent)}

/* ---------- contador ---------- */
.cdown{display:flex;gap:10px;justify-content:center;margin-top:20px}
.cdown__u{min-width:74px;background:color-mix(in srgb,var(--bg) 55%,transparent);border:var(--hair);
  border-radius:var(--r-sm);padding:12px 8px;text-align:center;backdrop-filter:blur(6px)}
.cdown__n{font-family:var(--ff-display);font-size:1.95rem;font-weight:700;line-height:1;letter-spacing:-.03em;
  font-variant-numeric:tabular-nums}
.cdown__l{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-top:5px}
.stockbar{max-width:420px;margin:22px auto 0}
.stockbar__t{height:8px;border-radius:99px;background:color-mix(in srgb,var(--text) 12%,transparent);overflow:hidden}
.stockbar__f{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--danger),var(--accent))}
.stockbar__x{font-size:13px;color:var(--muted);margin-top:9px;text-align:center}

/* ---------- acordeón ---------- */
.acc{border:var(--hair);border-radius:var(--r);overflow:hidden;background:var(--surface)}
.acc details{border-bottom:var(--hair)}
.acc details:last-child{border-bottom:none}
.acc summary{list-style:none;cursor:pointer;padding:19px 56px 19px 22px;position:relative;
  font-weight:600;font-size:16.2px;transition:background .18s}
.acc summary::-webkit-details-marker{display:none}
.acc summary:hover{background:var(--surface2)}
.acc summary::after{content:'';position:absolute;right:22px;top:50%;width:11px;height:11px;
  border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);
  transform:translateY(-70%) rotate(45deg);transition:transform .22s}
.acc details[open] summary::after{transform:translateY(-30%) rotate(225deg)}
.acc .acc__b{padding:0 22px 22px;color:var(--muted);font-size:15.4px;line-height:1.68}
.acc .acc__m{font-size:13px;color:var(--accent);font-weight:600;margin-top:6px}

/* ---------- formularios ---------- */
.formcard{background:var(--surface);border:var(--hair);border-radius:var(--r-lg);
  padding:clamp(22px,3vw,36px);box-shadow:var(--shadow)}
.form{display:grid;gap:14px}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.field{display:grid;gap:7px}
.field > label{font-size:13.4px;font-weight:600;color:var(--muted)}
.input,.select,textarea.input{width:100%;padding:13px 15px;border-radius:var(--r-sm);
  border:var(--hair);background:var(--bg);color:var(--text);font-family:inherit;font-size:16px;
  transition:border-color .18s,box-shadow .18s}
/* Variantes (color/talla): pills tactiles, una seleccion por grupo */
.vpills{display:flex;flex-wrap:wrap;gap:8px}
.vpills button{min-height:44px;padding:10px 18px;border-radius:999px;border:var(--hair);background:var(--bg);color:var(--text);font-size:14.5px;font-weight:600;cursor:pointer}
.vpills button[aria-pressed="true"]{background:var(--accent);color:var(--accent-fg);border-color:transparent}
.input:focus,.select:focus{outline:none;border-color:var(--accent);
  box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 18%,transparent)}
.select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),linear-gradient(135deg,var(--muted) 50%,transparent 50%);
  background-position:calc(100% - 20px) 55%,calc(100% - 14px) 55%;background-size:6px 6px,6px 6px;background-repeat:no-repeat;padding-right:40px}
textarea.input{min-height:84px;resize:vertical}
.consent{display:flex;gap:10px;align-items:flex-start;font-size:12.8px;color:var(--muted);line-height:1.5}
.consent input{margin-top:3px;accent-color:var(--accent);width:16px;height:16px}
.qty{display:inline-flex;align-items:center;border:var(--hair);border-radius:var(--r-sm);overflow:hidden;background:var(--bg)}
.qty button{width:42px;height:44px;border:none;background:transparent;color:var(--text);cursor:pointer;font-size:19px}
.qty button:hover{background:var(--surface2)}
.qty input{width:52px;height:44px;border:none;background:transparent;color:var(--text);text-align:center;
  font-size:16px;font-weight:600;-moz-appearance:textfield}
.qty input::-webkit-outer-spin-button,.qty input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.summary{background:var(--surface2);border:var(--hair);border-radius:var(--r);padding:20px 22px;display:grid;gap:11px}
.srow{display:flex;justify-content:space-between;gap:16px;font-size:15px}
.srow--total{border-top:var(--hair);padding-top:12px;font-weight:700;font-size:18px;font-family:var(--ff-display)}
.formnote{font-size:12.8px;color:var(--muted);text-align:center;margin-top:4px}
.formmsg{display:none;padding:16px 18px;border-radius:var(--r-sm);font-size:15px;margin-top:4px}
.formmsg.ok{display:block;background:color-mix(in srgb,var(--ok) 14%,transparent);color:var(--ok);border:1px solid color-mix(in srgb,var(--ok) 35%,transparent)}
.formmsg.err{display:block;background:color-mix(in srgb,var(--danger) 14%,transparent);color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 35%,transparent)}
.hp{position:absolute!important;left:-9999px!important;opacity:0;height:0;width:0}

/* ---------- barras / nav / fab ---------- */
.ann{background:var(--accent);color:var(--accent-fg);text-align:center;font-size:14px;font-weight:600;
  padding:11px 18px;position:relative;z-index:50}
.ann--gradient{background:linear-gradient(90deg,var(--accent),var(--accent2))}
.ann a{text-decoration:underline;text-underline-offset:3px}
.ann__x{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;
  color:inherit;cursor:pointer;opacity:.7;font-size:17px;line-height:1}
.nav{position:relative;z-index:40;border-bottom:var(--hair);
  background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(14px)}
.nav--sticky{position:sticky;top:0}
.nav__in{display:flex;align-items:center;justify-content:space-between;gap:20px;height:68px}
.nav__logo{font-family:var(--ff-display);font-weight:700;font-size:19px;letter-spacing:-.025em;display:flex;align-items:center;gap:9px}
.nav__logo img{height:30px;width:auto}
.nav__links{display:flex;gap:26px;font-size:15px;color:var(--muted)}
.nav__links a:hover{color:var(--text)}
.nav--centered .nav__in{justify-content:center}
.sticky-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;align-items:center;gap:14px;
  padding:11px 16px calc(11px + env(safe-area-inset-bottom));
  background:color-mix(in srgb,var(--surface) 92%,transparent);border-top:var(--hair);backdrop-filter:blur(16px);
  box-shadow:0 -10px 34px rgba(0,0,0,.22)}
.sticky-bar .btn{flex:1}
.sticky-bar__p{line-height:1.15}
.sticky-bar__l{font-size:11.5px;color:var(--muted)}
.sticky-bar__v{font-family:var(--ff-display);font-weight:700;font-size:19px}
.fab{position:fixed;right:18px;bottom:18px;z-index:70;display:inline-flex;align-items:center;gap:10px;
  background:#25d366;color:#07140c;font-weight:700;font-size:15px;padding:13px 18px;border-radius:var(--r-pill);
  box-shadow:0 14px 34px rgba(37,211,102,.38);transition:transform .2s}
.fab:hover{transform:translateY(-2px) scale(1.02)}
.fab--icon{padding:15px;border-radius:50%}
body.has-sticky{padding-bottom:78px}
body.has-sticky .fab{bottom:92px}

/* ---------- footer ---------- */
.foot{border-top:var(--hair);background:var(--surface);padding-block:48px;font-size:14.5px;color:var(--muted)}
.foot__in{display:flex;flex-wrap:wrap;gap:22px;justify-content:space-between;align-items:flex-start}
.foot__b{font-family:var(--ff-display);font-weight:700;font-size:18px;color:var(--text)}
.foot__links{display:flex;flex-wrap:wrap;gap:20px}
.foot__links a:hover{color:var(--text)}
.foot__bottom{margin-top:30px;padding-top:22px;border-top:var(--hair);display:flex;flex-wrap:wrap;gap:12px;
  justify-content:space-between;font-size:13px}

/* ---------- video ---------- */
.vframe{position:relative;border-radius:var(--r-lg);overflow:hidden;border:var(--hair);background:var(--surface);
  aspect-ratio:16/9;box-shadow:var(--shadow)}
.vframe--v{aspect-ratio:9/16;max-width:380px;margin-inline:auto}
.vframe iframe,.vframe video{width:100%;height:100%;border:0;display:block}

/* ---------- antes/después ---------- */
.ba{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ba__c{border:var(--hair);border-radius:var(--r);padding:clamp(20px,2.4vw,28px);background:var(--surface)}
.ba__c--a{border-color:color-mix(in srgb,var(--ok) 45%,transparent);background:color-mix(in srgb,var(--ok) 6%,var(--surface))}
.ba__t{font-size:12.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;color:var(--muted)}
.ba__c--a .ba__t{color:var(--ok)}
.ba ul{list-style:none;margin:0;padding:0;display:grid;gap:11px;font-size:15.3px}
.ba li{display:flex;gap:10px;align-items:flex-start}

/* ---------- galería ---------- */
.ggrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ggrid figure{margin:0}
.ggrid img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--r)}
.ggrid figcaption{font-size:13.5px;color:var(--muted);margin-top:8px}

${
  theme.effects.animate
    ? `/* ---------- reveal ---------- */
.lf-anim .reveal{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
.lf-anim .reveal.is-in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.lf-anim .reveal{opacity:1;transform:none;transition:none}
  .marquee__track{animation:none}}`
    : `.reveal{opacity:1}`
}

/* ---------- responsive ---------- */
/* iconos de linea + sellos de confianza (pulido 06-10) */
.lico{display:block;color:var(--accent)}
.card__ico .lico{width:22px;height:22px}
.trust{display:grid;gap:18px}
.trust--1{grid-template-columns:1fr}.trust--2{grid-template-columns:repeat(2,1fr)}
.trust--3{grid-template-columns:repeat(3,1fr)}.trust--4{grid-template-columns:repeat(4,1fr)}
.trust__ico{width:48px;height:48px;margin:0 auto 10px;border-radius:50%;display:grid;place-items:center;
  background:color-mix(in srgb,var(--accent) 12%,transparent)}
.trust__ico .lico{width:24px;height:24px}
@media (max-width:1024px){
  .bento{grid-template-columns:repeat(2,1fr)}
  .bento .span3{grid-column:span 2}
  .plans,.bundles,.steps--h{grid-template-columns:1fr}
  .plan--featured{transform:none}
  .ugc,.ggrid{grid-template-columns:repeat(2,1fr)}
  .g4{grid-template-columns:repeat(2,1fr)}
  .stats{grid-template-columns:repeat(2,1fr)}
  .split{grid-template-columns:1fr;gap:38px}
  .nav__links{display:none}
}
@media (max-width:720px){
  body{font-size:16px}
  .g2,.g3,.duel,.ba,.bento,.ugc,.ggrid{grid-template-columns:1fr}
  /* 4 columnas → 2x2 en móvil: más compacto que apilar todo */
  .g4{grid-template-columns:repeat(2,1fr)}
  .stats{grid-template-columns:repeat(2,1fr)}
  .logos{gap:18px}
  .bento .span2,.bento .span3{grid-column:span 1}
  .frow{grid-template-columns:1fr}
  .guar{flex-direction:column;text-align:center}
  .foot__in{flex-direction:column}
  .cta-row .btn{width:100%}
  .ctable{font-size:14px}
  .ctable th,.ctable td{padding:12px 11px}
  /* Movil: titulos fluidos sin desbordar, secciones con aire pero compactas */
  .h1{font-size:clamp(1.7rem,7.6vw,2.2rem);line-height:1.12}
  .h2{font-size:clamp(1.45rem,6vw,1.8rem)}
  .lead{font-size:1rem}
  .sec{padding-top:42px;padding-bottom:42px}
  .hero .wrap{padding-top:8px}
  .hero__bullets{margin-top:20px}
  .formcard{padding:20px 16px}
  .summary{font-size:14.5px}
  /* beneficios: icono al costado, no seis tarjetas altas que alargan la pagina */
  .bens{gap:12px}
  .bens > .card{display:grid;grid-template-columns:44px 1fr;column-gap:14px;align-items:start;padding:16px 16px}
  .bens > .card .card__ico{grid-row:span 2;margin:0}
  .bens > .card .h3{font-size:16.5px;margin:0 0 4px}
  .bens > .card p{font-size:14.5px;margin:0}
  .trust{gap:10px}
  .trust--4{grid-template-columns:repeat(2,1fr)}
  .trust--3 .trust__i > div:first-of-type + div{font-size:13.5px}
  .trust--3 .small{font-size:12px}
  .trust__ico{width:42px;height:42px;margin-bottom:8px}
  /* Primer pantallazo (390x844, auditoria 07-10): la foto ocupaba toda la
     pantalla y el titular quedaba debajo de la barra fija, sin precio a la
     vista. Ahora entran foto + promesa + precio, y la barra pone el boton. */
  .ann{font-size:13px;padding:8px 34px 8px 14px;line-height:1.35}
  .nav__in{height:58px}
  .hero--product{padding-top:12px;padding-bottom:34px}
  .hero--product .wrap{padding-top:0}
  .hero--product .split{gap:14px}
  .hero--product .gal{gap:8px}
  .hero--product .gal__main{aspect-ratio:auto;height:min(86vw,40svh);min-height:240px;background:var(--bg)}
  .hero--product .gal__main img{object-fit:contain}
  .hero--product .gal__thumbs button{flex-basis:52px;height:52px;border-radius:10px}
  .hero--product .eyebrow{margin-bottom:6px;font-size:11.5px}
  .hero--product .h1{font-size:clamp(1.5rem,6.6vw,2rem);line-height:1.14}
  .hero--product .hero__price{margin-top:10px}
  .hero--product .price__now{font-size:2rem}
  .hero--product .lead{margin-top:12px}
  .hero--product .hero__bullets{margin-top:14px;gap:8px}
  .hero--product .hero__bullets li{font-size:15px}
  /* WhatsApp en movil: solo el icono, para no tapar titulares */
  body.has-sticky .fab{padding:13px;border-radius:50%;bottom:88px;right:14px}
  body.has-sticky .fab span{display:none}
}
.hero__price{margin-top:22px}
.opt{font-weight:400;color:var(--muted)}
.fpacks{display:grid;gap:8px}
.fpack{display:flex;align-items:center;gap:10px;width:100%;text-align:left;cursor:pointer;padding:12px 14px;
  border:1.5px solid var(--border);border-radius:12px;background:var(--bg);color:var(--text);font:inherit}
.fpack[aria-pressed=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--bg))}
.fpack__r{flex:0 0 18px;width:18px;height:18px;border-radius:50%;border:2px solid var(--border);display:grid;place-items:center}
.fpack[aria-pressed=true] .fpack__r{border-color:var(--accent);background:var(--accent)}
.fpack[aria-pressed=true] .fpack__r::after{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent-fg)}
.fpack__l{flex:1;font-weight:600;font-size:15px}
.fpack__l em{font-style:normal;font-size:11.5px;font-weight:700;color:var(--accent);margin-left:4px;white-space:nowrap}
.fpack b{font-family:var(--ff-display);font-size:16px}
.bundle--featured{border-color:color-mix(in srgb,var(--accent) 55%,var(--border))}
`.trim();
}
