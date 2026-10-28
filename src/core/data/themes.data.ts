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

/**
 * Personnalité d'un thème : la famille de sections que l'IA privilégie pour lui.
 * - editorial : magazine calme, serif, grandes photos, beaucoup d'air (Aesop, Kinfolk)
 * - audacieux : minimal et affirmé, typographie géante, contrastes forts (Apple, Linear)
 * - expressif : compositions asymétriques, photos qui se chevauchent, blocs de couleur (Awwwards)
 * - chaleureux : artisanal, photos d'ambiance plein cadre, pictogrammes fins, rassurant
 */
export type ThemePersonality = 'editorial' | 'audacieux' | 'expressif' | 'chaleureux';

export const PERSONALITY_LABELS: Record<ThemePersonality, string> = {
  editorial: 'Éditorial calme',
  audacieux: 'Minimal audacieux',
  expressif: 'Expressif',
  chaleureux: 'Chaleureux artisanal',
};

export interface ThemePreset {
  name: string;
  emoji: string;
  description: string;
  personality: ThemePersonality;
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
    name: 'Minuit', emoji: '🌙', description: 'Sombre et moderne', personality: 'audacieux',
    designSystem: theme(
      { primary: '#6366f1', secondary: '#94a3b8', bg: '#0f172a', surface: '#1e293b', text: '#f8fafc', muted: '#94a3b8' },
      "'Inter', sans-serif", "'Inter', sans-serif", 6
    ),
  },
  {
    name: 'Minimal', emoji: '◻️', description: 'Blanc, sobre, épuré', personality: 'audacieux',
    designSystem: theme(
      { primary: '#18181b', secondary: '#52525b', bg: '#ffffff', surface: '#f4f4f5', text: '#18181b', muted: '#71717a' },
      "'Inter', sans-serif", "'Inter', sans-serif", 6
    ),
  },
  {
    name: 'Élégant', emoji: '🥂', description: 'Crème et serif chic', personality: 'editorial',
    designSystem: theme(
      { primary: '#8b5e3c', secondary: '#2b2620', bg: '#faf7f2', surface: '#f0ebe3', text: '#2b2620', muted: '#7a7066' },
      "'Playfair Display', serif", "'Lora', serif", 0, 24
    ),
  },
  {
    name: 'Fun', emoji: '🎈', description: 'Coloré et joyeux', personality: 'expressif',
    designSystem: theme(
      { primary: '#f0386b', secondary: '#7c3aed', bg: '#fff8e7', surface: '#ffe4ec', text: '#1f1147', muted: '#6b5b95' },
      "'Poppins', sans-serif", "'Nunito', sans-serif", 24
    ),
  },
  {
    name: 'Nature', emoji: '🌿', description: 'Doux et organique', personality: 'chaleureux',
    designSystem: theme(
      { primary: '#2f7d4f', secondary: '#a3672b', bg: '#f3f6ef', surface: '#ffffff', text: '#1c2b1e', muted: '#5f7462' },
      "'Fraunces', serif", "'DM Sans', sans-serif", 14
    ),
  },
  {
    name: 'Océan', emoji: '🌊', description: 'Bleu profond et frais', personality: 'chaleureux',
    designSystem: theme(
      { primary: '#00b4d8', secondary: '#f4a261', bg: '#03223a', surface: '#073b5c', text: '#ecf9ff', muted: '#8fb8c9' },
      "'Montserrat', sans-serif", "'Nunito', sans-serif", 14
    ),
  },
  {
    name: 'Néon', emoji: '⚡', description: 'Tech, contrasté', personality: 'audacieux',
    designSystem: theme(
      { primary: '#a3e635', secondary: '#22d3ee', bg: '#0a0a0a', surface: '#171717', text: '#fafafa', muted: '#a3a3a3' },
      "'Space Grotesk', sans-serif", "'Plus Jakarta Sans', sans-serif", 0
    ),
  },
  {
    name: 'Pro', emoji: '💼', description: 'Sérieux et rassurant', personality: 'editorial',
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

/** Nom du thème prêt à l'emploi correspondant exactement au design system, ou null s'il a été personnalisé. */
export function presetNameOf(ds: DesignSystem): string | null {
  const key = JSON.stringify(ds);
  return THEME_PRESETS.find(p => JSON.stringify(p.designSystem) === key)?.name ?? null;
}

/**
 * Personnalité du thème : celle du thème prêt à l'emploi, sinon déduite de la police des titres et des arrondis
 * (serif → éditorial, ronde → expressive, technique → audacieuse, grands arrondis → chaleureuse).
 */
export function personalityOf(ds: DesignSystem): ThemePersonality {
  const preset = THEME_PRESETS.find(p => p.name === presetNameOf(ds));
  if (preset) return preset.personality;
  const category = FONTS.find(f => f.css === (ds.typography.headingFamily ?? ds.typography.family))?.category;
  const rounded = ds.spacing.radius >= 12;
  switch (category) {
    case 'Élégante': return rounded ? 'chaleureux' : 'editorial';
    case 'Amicale': return rounded ? 'expressif' : 'chaleureux';
    case 'Technique': return 'audacieux';
    default: return rounded ? 'chaleureux' : 'audacieux';
  }
}

/**
 * Ajuste les couleurs du thème pour que tous les textes atteignent le niveau WCAG AA (4,5:1) :
 * texte discret sur le fond et les cartes, couleur principale utilisée comme texte, et texte des boutons.
 * Plus strict que fixReadability, qui garde des seuils réduits pour les éléments secondaires.
 */
export function strengthenContrast(colors: DesignSystem['colors']): DesignSystem['colors'] {
  const fixed = fixReadability(colors);
  const darkBg = isDark(fixed.bg);
  const readableEverywhere = (c: string) => contrastRatio(c, fixed.bg) >= 4.5 && contrastRatio(c, fixed.surface) >= 4.5;

  if (!readableEverywhere(fixed.muted)) {
    for (const ratio of [0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0]) {
      fixed.muted = mix(fixed.text, fixed.bg, ratio);
      if (readableEverywhere(fixed.muted)) break;
    }
  }

  // La couleur principale sert de texte (liens, prix) et de fond de bouton : les deux doivent rester lisibles
  const primaryOk = (c: string) => readableEverywhere(c) && contrastRatio(readableOn(c), c) >= 4.5;
  if (!primaryOk(fixed.primary)) {
    const hsl = hexToHsl(fixed.primary);
    for (let step = 1; step <= 20; step++) {
      const candidate = hslToHex({ ...hsl, l: Math.max(0, Math.min(100, hsl.l + (darkBg ? 3 : -3) * step)) });
      if (primaryOk(candidate)) {
        fixed.primary = candidate;
        break;
      }
    }
  }
  return fixed;
}
