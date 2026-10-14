import { DesignSystem } from '../models/design-sytem.model';
import { contrastRatio, hexToHsl, hslToHex, isDark, mix, readableOn } from '../utils/color';

export interface FontOption {
  name: string;
  css: string;
  category: 'Moderne' | 'Élégante' | 'Amicale' | 'Technique';
  /** Graisses à charger depuis Google Fonts */
  weights: string;
}

export const FONTS: FontOption[] = [
  { name: 'Inter', css: "'Inter', sans-serif", category: 'Moderne', weights: '400;600;700' },
  { name: 'Plus Jakarta Sans', css: "'Plus Jakarta Sans', sans-serif", category: 'Moderne', weights: '400;600;700' },
  { name: 'DM Sans', css: "'DM Sans', sans-serif", category: 'Moderne', weights: '400;600;700' },
  { name: 'Montserrat', css: "'Montserrat', sans-serif", category: 'Moderne', weights: '400;600;700' },
  { name: 'Poppins', css: "'Poppins', sans-serif", category: 'Amicale', weights: '400;600;700' },
  { name: 'Nunito', css: "'Nunito', sans-serif", category: 'Amicale', weights: '400;600;700' },
  { name: 'Playfair Display', css: "'Playfair Display', serif", category: 'Élégante', weights: '400;600;700' },
  { name: 'DM Serif Display', css: "'DM Serif Display', serif", category: 'Élégante', weights: '400' },
  { name: 'Fraunces', css: "'Fraunces', serif", category: 'Élégante', weights: '400;600;700' },
  { name: 'Lora', css: "'Lora', serif", category: 'Élégante', weights: '400;600;700' },
  { name: 'Merriweather', css: "'Merriweather', serif", category: 'Élégante', weights: '400;700' },
  { name: 'Space Grotesk', css: "'Space Grotesk', sans-serif", category: 'Technique', weights: '400;600;700' },
  { name: 'JetBrains Mono', css: "'JetBrains Mono', monospace", category: 'Technique', weights: '400;700' },
];

/** URL Google Fonts chargeant toutes les polices proposées. */
export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  FONTS.map(f => `family=${f.name.replace(/ /g, '+')}:wght@${f.weights}`).join('&') +
  '&display=swap';

export function fontName(css: string | undefined): string {
  if (!css) return '';
  return FONTS.find(f => f.css === css)?.name ?? css.split(',')[0].replace(/['"]/g, '');
}

export interface FontPairing {
  name: string;
  description: string;
  heading: string;
  body: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  { name: 'Moderne', description: 'Net et lisible', heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
  { name: 'Élégant', description: 'Raffiné, magazine', heading: "'Playfair Display', serif", body: "'Lora', serif" },
  { name: 'Amical', description: 'Rond et chaleureux', heading: "'Poppins', sans-serif", body: "'Nunito', sans-serif" },
  { name: 'Éditorial', description: 'Caractère, artisanal', heading: "'Fraunces', serif", body: "'DM Sans', sans-serif" },
  { name: 'Prestige', description: 'Luxe, haut de gamme', heading: "'DM Serif Display', serif", body: "'Montserrat', sans-serif" },
  { name: 'Tech', description: 'Startup, produit', heading: "'Space Grotesk', sans-serif", body: "'Plus Jakarta Sans', sans-serif" },
];

export interface ThemePreset {
  name: string;
  emoji: string;
  description: string;
  designSystem: DesignSystem;
}

function theme(
  colors: DesignSystem['colors'],
  heading: string,
  body: string,
  radius: number,
  padding = 16,
  sizeBase = 16
): DesignSystem {
  return { colors, typography: { family: body, headingFamily: heading, sizeBase }, spacing: { radius, padding } };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: 'Minuit', emoji: '🌙', description: 'Sombre et moderne',
    designSystem: theme(
      { primary: '#6366f1', secondary: '#94a3b8', bg: '#0f172a', surface: '#1e293b', text: '#f8fafc', muted: '#94a3b8' },
      "'Inter', sans-serif", "'Inter', sans-serif", 6
    ),
  },
  {
    name: 'Minimal', emoji: '◻️', description: 'Blanc, sobre, épuré',
    designSystem: theme(
      { primary: '#18181b', secondary: '#52525b', bg: '#ffffff', surface: '#f4f4f5', text: '#18181b', muted: '#71717a' },
      "'Inter', sans-serif", "'Inter', sans-serif", 6
    ),
  },
  {
    name: 'Élégant', emoji: '🥂', description: 'Crème et serif chic',
    designSystem: theme(
      { primary: '#8b5e3c', secondary: '#2b2620', bg: '#faf7f2', surface: '#f0ebe3', text: '#2b2620', muted: '#7a7066' },
      "'Playfair Display', serif", "'Lora', serif", 0, 24
    ),
  },
  {
    name: 'Fun', emoji: '🎈', description: 'Coloré et joyeux',
    designSystem: theme(
      { primary: '#f0386b', secondary: '#7c3aed', bg: '#fff8e7', surface: '#ffe4ec', text: '#1f1147', muted: '#6b5b95' },
      "'Poppins', sans-serif", "'Nunito', sans-serif", 24
    ),
  },
  {
    name: 'Nature', emoji: '🌿', description: 'Doux et organique',
    designSystem: theme(
      { primary: '#2f7d4f', secondary: '#a3672b', bg: '#f3f6ef', surface: '#ffffff', text: '#1c2b1e', muted: '#5f7462' },
      "'Fraunces', serif", "'DM Sans', sans-serif", 14
    ),
  },
  {
    name: 'Océan', emoji: '🌊', description: 'Bleu profond et frais',
    designSystem: theme(
      { primary: '#00b4d8', secondary: '#f4a261', bg: '#03223a', surface: '#073b5c', text: '#ecf9ff', muted: '#8fb8c9' },
      "'Montserrat', sans-serif", "'Nunito', sans-serif", 14
    ),
  },
  {
    name: 'Néon', emoji: '⚡', description: 'Tech, contrasté',
    designSystem: theme(
      { primary: '#a3e635', secondary: '#22d3ee', bg: '#0a0a0a', surface: '#171717', text: '#fafafa', muted: '#a3a3a3' },
      "'Space Grotesk', sans-serif", "'Plus Jakarta Sans', sans-serif", 0
    ),
  },
  {
    name: 'Pro', emoji: '💼', description: 'Sérieux et rassurant',
    designSystem: theme(
      { primary: '#2563eb', secondary: '#0f172a', bg: '#eef2f7', surface: '#ffffff', text: '#0f172a', muted: '#64748b' },
      "'Montserrat', sans-serif", "'Inter', sans-serif", 6
    ),
  },
];

/** Génère une palette complète et harmonieuse à partir d'une seule couleur. */
export function generatePalette(primary: string, mode: 'light' | 'dark'): DesignSystem['colors'] {
  const { h, s } = hexToHsl(primary);
  const tint = Math.min(s, 40);
  const accentHue = h + 35;

  if (mode === 'dark') {
    return {
      primary,
      secondary: hslToHex({ h: accentHue, s: Math.min(s, 70), l: 62 }),
      bg: hslToHex({ h, s: tint, l: 8 }),
      surface: hslToHex({ h, s: tint * 0.85, l: 14 }),
      text: hslToHex({ h, s: 20, l: 96 }),
      muted: hslToHex({ h, s: 12, l: 65 }),
    };
  }
  return {
    primary,
    secondary: hslToHex({ h: accentHue, s: Math.min(s, 70), l: 40 }),
    bg: hslToHex({ h, s: tint * 0.8, l: 98 }),
    surface: hslToHex({ h, s: tint * 0.6, l: 94 }),
    text: hslToHex({ h, s: 30, l: 12 }),
    muted: hslToHex({ h, s: 10, l: 42 }),
  };
}

export interface ReadabilityCheck {
  label: string;
  ok: boolean;
  ratio: number;
}

/** Vérifie que les couleurs du thème restent lisibles (normes WCAG simplifiées). */
export function checkReadability(colors: DesignSystem['colors']): ReadabilityCheck[] {
  const check = (label: string, a: string, b: string, min: number): ReadabilityCheck => {
    const ratio = contrastRatio(a, b);
    return { label, ok: ratio >= min, ratio };
  };
  return [
    check('Texte sur le fond', colors.text, colors.bg, 4.5),
    check('Texte sur les cartes', colors.text, colors.surface, 4.5),
    check('Texte discret sur le fond', colors.muted, colors.bg, 3),
    check('Couleur principale visible sur le fond', colors.primary, colors.bg, 3),
    check('Cartes visibles sur le fond', colors.surface, colors.bg, 1.08),
  ];
}

/** Ajuste les couleurs qui posent un problème de lisibilité, sans toucher aux autres. */
export function fixReadability(colors: DesignSystem['colors']): DesignSystem['colors'] {
  const fixed = { ...colors };
  const darkBg = isDark(fixed.bg);

  if (contrastRatio(fixed.surface, fixed.bg) < 1.08) {
    fixed.surface = darkBg ? mix(fixed.bg, '#ffffff', 0.08) : mix(fixed.bg, '#000000', 0.05);
  }
  if (contrastRatio(fixed.text, fixed.bg) < 4.5 || contrastRatio(fixed.text, fixed.surface) < 4.5) {
    fixed.text = darkBg ? mix(fixed.bg, '#ffffff', 0.95) : mix(fixed.bg, '#000000', 0.88);
  }
  if (contrastRatio(fixed.muted, fixed.bg) < 3) {
    for (const ratio of [0.4, 0.3, 0.2, 0.1, 0]) {
      fixed.muted = mix(fixed.text, fixed.bg, ratio);
      if (contrastRatio(fixed.muted, fixed.bg) >= 3) break;
    }
  }
  if (contrastRatio(fixed.primary, fixed.bg) < 3) {
    const hsl = hexToHsl(fixed.primary);
    // On éclaircit (fond sombre) ou assombrit (fond clair) la couleur principale jusqu'à ce qu'elle ressorte
    for (let step = 1; step <= 10; step++) {
      const candidate = hslToHex({ ...hsl, l: hsl.l + (darkBg ? 4 : -4) * step });
      if (contrastRatio(candidate, fixed.bg) >= 3) {
        fixed.primary = candidate;
        break;
      }
    }
  }
  return fixed;
}
