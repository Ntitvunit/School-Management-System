// School colour themes. Each school picks a preset or two custom colours.
export type ThemePreset = { id: string; name: string; primary: string; accent: string };

export const THEMES: ThemePreset[] = [
  { id: "chalkboard", name: "Chalkboard Green", primary: "#1d5c4a", accent: "#c98a00" },
  { id: "royal", name: "Royal Blue & Gold", primary: "#2b3a8f", accent: "#e0a100" },
  { id: "sunrise", name: "Sunrise Orange & Purple", primary: "#c2410c", accent: "#7c3aed" },
  { id: "ocean", name: "Ocean Teal & Coral", primary: "#0e7490", accent: "#e85d4a" },
  { id: "berry", name: "Berry & Teal", primary: "#a21caf", accent: "#0d9488" },
  { id: "crimson", name: "Crimson & Navy", primary: "#9f1239", accent: "#1e40af" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (s?: string | null) => !!s && HEX.test(s);

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
/** Blend colour a towards colour b by t (0..1). */
function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  return hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
function luminance(h: string) {
  const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
/** Darken a colour until white text on it is readable. */
function readableOnWhite(h: string) {
  let c = h;
  for (let i = 0; i < 10 && luminance(c) > 0.18; i++) c = mix(c, "#000000", 0.12);
  return c;
}

export function resolveTheme(school?: { theme?: string | null; brand_primary?: string | null; brand_accent?: string | null } | null) {
  const preset = THEMES.find((t) => t.id === school?.theme) || THEMES[0];
  const custom = school?.theme === "custom";
  const primary = custom && isHex(school?.brand_primary) ? school!.brand_primary! : preset.primary;
  const accent = custom && isHex(school?.brand_accent) ? school!.brand_accent! : preset.accent;
  return { primary, accent };
}

/** CSS variables for a school's theme, light and dark. Values are validated hex colours only. */
export function themeCss(school?: Parameters<typeof resolveTheme>[0]) {
  const { primary, accent } = resolveTheme(school);
  const p = readableOnWhite(primary);
  const a = accent;
  const darkBg = "#0d1311";
  return `:root{--board:${p};--board-soft:${mix(p, "#ffffff", 0.87)};--on-board:#ffffff;--mark:${readableOnWhite(a)};--mark-soft:${mix(a, "#ffffff", 0.84)};--paper:${mix(p, "#ffffff", 0.955)};--line:${mix(p, "#ffffff", 0.8)};--band:${p};--band-ink:#ffffff;--band-2:${a}}
@media (prefers-color-scheme: dark){:root{--board:${mix(p, "#ffffff", 0.45)};--board-soft:${mix(p, darkBg, 0.78)};--on-board:${darkBg};--mark:${mix(a, "#ffffff", 0.3)};--mark-soft:${mix(a, darkBg, 0.75)};--paper:${mix(p, darkBg, 0.9)};--surface:${mix(p, darkBg, 0.84)};--line:${mix(p, darkBg, 0.65)};--band:${mix(p, darkBg, 0.35)};--band-ink:#ffffff;--band-2:${mix(a, "#ffffff", 0.2)}}}`;
}
