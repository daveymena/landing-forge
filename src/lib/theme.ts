import type { Theme } from "./schema";

export interface Preset {
  id: string;
  name: string;
  hint: string;
  theme: Partial<Theme> & { colors: Theme["colors"]; fonts: Theme["fonts"] };
}

const f = (display: string, sans: string) => ({ display, sans, webfonts: true });

export const PRESETS: Preset[] = [
  {
    id: "midnight",
    name: "Midnight",
    hint: "Oscuro violeta · SaaS moderno tipo Linear",
    theme: {
      mode: "dark",
      radius: 18,
      colors: {
        bg: "#07070a", surface: "#0e0e13", surfaceAlt: "#15151d", border: "#24242f",
        text: "#f6f6f8", muted: "#9a9aa8", accent: "#7c6cff", accentFg: "#ffffff",
        accent2: "#22d3ee", success: "#34d399", danger: "#fb7185",
      },
      fonts: f("Space Grotesk", "Inter"),
    },
  },
  {
    id: "obsidian",
    name: "Obsidian",
    hint: "Negro con acento ácido · agresivo, para infoproducto",
    theme: {
      mode: "dark",
      radius: 14,
      colors: {
        bg: "#050505", surface: "#0d0d0d", surfaceAlt: "#141414", border: "#232323",
        text: "#fafafa", muted: "#8f8f8f", accent: "#d4ff3f", accentFg: "#0a0a0a",
        accent2: "#ff5c35", success: "#4ade80", danger: "#ef4444",
      },
      fonts: f("Archivo", "Inter"),
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    hint: "Azul profundo con degradado cian · tecnología",
    theme: {
      mode: "dark",
      radius: 22,
      colors: {
        bg: "#060a16", surface: "#0c1222", surfaceAlt: "#111a2e", border: "#1e2a44",
        text: "#eef3ff", muted: "#8fa0bf", accent: "#3b82f6", accentFg: "#ffffff",
        accent2: "#06b6d4", success: "#34d399", danger: "#f87171",
      },
      fonts: f("Outfit", "Inter"),
    },
  },
  {
    id: "clean",
    name: "Clean",
    hint: "Claro, mucho aire · B2B y servicios",
    theme: {
      mode: "light",
      radius: 16,
      colors: {
        bg: "#ffffff", surface: "#f6f7f9", surfaceAlt: "#eef0f4", border: "#e2e5ea",
        text: "#0b0d12", muted: "#616878", accent: "#111827", accentFg: "#ffffff",
        accent2: "#2563eb", success: "#16a34a", danger: "#dc2626",
      },
      fonts: f("Instrument Sans", "Inter"),
    },
  },
  {
    id: "retail",
    name: "Retail COD",
    hint: "Claro con urgencia naranja · contraentrega LATAM",
    theme: {
      mode: "light",
      radius: 14,
      colors: {
        bg: "#ffffff", surface: "#fff7ed", surfaceAlt: "#ffedd5", border: "#f1e4d6",
        text: "#1a1511", muted: "#6b6256", accent: "#ea580c", accentFg: "#ffffff",
        accent2: "#16a34a", success: "#16a34a", danger: "#dc2626",
      },
      fonts: f("Plus Jakarta Sans", "Inter"),
    },
  },
  {
    id: "sand",
    name: "Sand",
    hint: "Cálido editorial · belleza, bienestar, hogar",
    theme: {
      mode: "light",
      radius: 20,
      colors: {
        bg: "#fdfbf7", surface: "#f5efe6", surfaceAlt: "#ece3d6", border: "#e3d9c9",
        text: "#1c1917", muted: "#6f655a", accent: "#b45309", accentFg: "#fffaf3",
        accent2: "#0f766e", success: "#15803d", danger: "#b91c1c",
      },
      fonts: f("Fraunces", "Inter"),
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    hint: "Oscuro verde · finanzas, salud, suscripción",
    theme: {
      mode: "dark",
      radius: 18,
      colors: {
        bg: "#05100c", surface: "#0a1a14", surfaceAlt: "#0f241b", border: "#1b3a2c",
        text: "#f0fdf6", muted: "#8aa89a", accent: "#10b981", accentFg: "#04140d",
        accent2: "#a3e635", success: "#22c55e", danger: "#f87171",
      },
      fonts: f("Sora", "Inter"),
    },
  },
  {
    id: "mono",
    name: "Mono Brutal",
    hint: "Alto contraste, bordes duros · marcas con carácter",
    theme: {
      mode: "light",
      radius: 4,
      colors: {
        bg: "#fafaf7", surface: "#ffffff", surfaceAlt: "#f0f0eb", border: "#111111",
        text: "#111111", muted: "#555555", accent: "#ffd400", accentFg: "#111111",
        accent2: "#0047ff", success: "#00a455", danger: "#e5002b",
      },
      fonts: f("Space Grotesk", "IBM Plex Sans"),
    },
  },
  {
    id: "urgency",
    name: "Urgency Red",
    hint: "Rojo oferta flash · dropshipping agresivo, 2x1, stock",
    theme: {
      mode: "light",
      radius: 12,
      colors: {
        bg: "#fffafa", surface: "#fff1f1", surfaceAlt: "#ffe1e1", border: "#f3c8c8",
        text: "#1a0d0d", muted: "#7a5a5a", accent: "#dc2626", accentFg: "#ffffff",
        accent2: "#f59e0b", success: "#16a34a", danger: "#b91c1c",
      },
      fonts: f("Archivo", "Inter"),
    },
  },
  {
    id: "premium",
    name: "Premium Gold",
    hint: "Negro + dorado · belleza, relojes, aspiracional",
    theme: {
      mode: "dark",
      radius: 20,
      colors: {
        bg: "#0b0906", surface: "#141008", surfaceAlt: "#1e1709", border: "#33270f",
        text: "#faf5e9", muted: "#a89c7d", accent: "#d4af37", accentFg: "#0b0906",
        accent2: "#f5e6b8", success: "#4ade80", danger: "#f87171",
      },
      fonts: f("Fraunces", "Inter"),
    },
  },
  {
    id: "vsl",
    name: "VSL Night",
    hint: "Azul noche + video · cursos, mentorías, webinars",
    theme: {
      mode: "dark",
      radius: 16,
      colors: {
        bg: "#04070f", surface: "#0a1020", surfaceAlt: "#101a33", border: "#1d2c52",
        text: "#eef3ff", muted: "#93a0c0", accent: "#8b5cf6", accentFg: "#ffffff",
        accent2: "#f59e0b", success: "#34d399", danger: "#f87171",
      },
      fonts: f("Sora", "Inter"),
    },
  },
  {
    id: "fresh",
    name: "Fresh Mint",
    hint: "Verde claro fresco · ebooks, salud, lead magnets",
    theme: {
      mode: "light",
      radius: 18,
      colors: {
        bg: "#f7fdf9", surface: "#eef9f1", surfaceAlt: "#e0f2e7", border: "#cde6d6",
        text: "#0c1a12", muted: "#5a7263", accent: "#059669", accentFg: "#ffffff",
        accent2: "#84cc16", success: "#16a34a", danger: "#dc2626",
      },
      fonts: f("Plus Jakarta Sans", "Inter"),
    },
  },
];

export const PRESET_BY_ID = Object.fromEntries(PRESETS.map((p) => [p.id, p]));

export function themeFromPreset(id: string, base?: Partial<Theme>): Theme {
  const p = PRESET_BY_ID[id] ?? PRESETS[0];
  return {
    preset: p.id,
    mode: p.theme.mode ?? "dark",
    colors: { ...p.theme.colors },
    fonts: { ...p.theme.fonts },
    radius: p.theme.radius ?? 18,
    maxWidth: 1180,
    density: "normal",
    effects: { grain: true, glow: true, animate: true },
    ...(base || {}),
  } as Theme;
}

/** Sugerencia de preset según el texto del prompt y el vertical */
export function suggestPreset(prompt: string, vertical: string): string {
  const p = prompt
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" })[c] ?? c);
  /** prefijo de palabra: "cosmet" casa con "cosmetica" pero "ia" no casa con "colombia" */
  const has = (...w: string[]) =>
    w.some((x) => new RegExp(`(^|[^a-z0-9])${x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(p));
  if (has("brutal", "brutalis", "alto contraste", "atrevid")) return "mono";
  if (has("belleza", "skincare", "cosmet", "piel", "spa", "bienestar", "aromaterapia", "aroma")) return "sand";
  if (has("salud", "fitness", "ejercicio", "nutric", "finanzas", "ahorro", "inversion", "organic", "eco")) return "emerald";
  if (has("tecnolog", "inteligencia artificial", "software", "saas", "datos", "dashboard", "api", "devs", "cloud")) return "aurora";
  if (has("curso", "masterclass", "mentoria", "ebook", "infoproducto", "reto")) return "obsidian";
  if (vertical === "cod") return "retail";
  if (vertical === "saas") return "midnight";
  if (vertical === "service") return "clean";
  return "midnight";
}

/* ---------------------------------------------------------------- *
 *  Cambio de modo claro/oscuro conservando la identidad del tema
 * ---------------------------------------------------------------- */

/** Paletas neutras por modo. El acento y las fuentes del tema no se tocan:
 *  así «ponlo en oscuro» no destruye la marca que eligió el usuario. */
const NEUTRALS = {
  dark: {
    bg: "#07070a", surface: "#0e0e13", surfaceAlt: "#15151d", border: "#24242f",
    text: "#f6f6f8", muted: "#9a9aa8",
  },
  light: {
    bg: "#ffffff", surface: "#f7f8fa", surfaceAlt: "#eef1f5", border: "#e4e7ee",
    text: "#10131a", muted: "#5d6675",
  },
} as const;

/** Devuelve el tema en el modo pedido. Si existe un preset hermano con ese
 *  modo y el mismo acento se usa tal cual; si no, se intercambian los neutros. */
export function applyMode(theme: Theme, mode: "dark" | "light"): Theme {
  if (!theme || theme.mode === mode) return theme;
  const accent = theme.colors?.accent;

  const sibling = PRESETS.find(
    (p) => p.theme.mode === mode && p.theme.colors?.accent?.toLowerCase() === String(accent).toLowerCase(),
  );
  const neutrals = sibling ? sibling.theme.colors! : NEUTRALS[mode];

  return {
    ...theme,
    mode,
    colors: {
      ...theme.colors,
      bg: neutrals.bg,
      surface: neutrals.surface,
      surfaceAlt: neutrals.surfaceAlt,
      border: neutrals.border,
      text: neutrals.text,
      muted: neutrals.muted,
    },
  };
}

