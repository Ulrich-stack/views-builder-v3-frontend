import { checkReadability, fixReadability, generatePalette, GOOGLE_FONTS_URL, FONT_PAIRINGS, FONTS, THEME_PRESETS, strengthenContrast } from './themes.data';
import { contrastRatio, hexToHsl, hslToHex, readableOn } from '../utils/color';

describe('Couleurs', () => {
  it('convertit hex ⇄ hsl sans perte visible', () => {
    for (const hex of ['#6366f1', '#0f172a', '#ffffff', '#f0386b']) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex);
    }
  });

  it('calcule le contraste WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('choisit un texte lisible sur un fond', () => {
    expect(readableOn('#0f172a')).toBe('#ffffff');
    expect(readableOn('#fff8e7')).toBe('#111111');
  });
});

describe('Thèmes', () => {
  it('tous les thèmes prêts à l\'emploi sont lisibles', () => {
    for (const theme of THEME_PRESETS) {
      const issues = checkReadability(theme.designSystem.colors).filter(c => !c.ok).map(c => c.label);
      expect(issues, theme.name).toEqual([]);
    }
  });

  it('les palettes générées sont lisibles en clair comme en sombre', () => {
    for (const seed of ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9']) {
      for (const mode of ['light', 'dark'] as const) {
        const colors = fixReadability(generatePalette(seed, mode));
        const issues = checkReadability(colors).filter(c => !c.ok).map(c => c.label);
        expect(issues, `${seed} ${mode}`).toEqual([]);
      }
    }
  });

  it('corrige un thème illisible', () => {
    const bad = { primary: '#1e1e1e', secondary: '#888888', bg: '#111111', surface: '#111111', text: '#222222', muted: '#1a1a1a' };
    expect(checkReadability(bad).some(c => !c.ok)).toBe(true);
    expect(checkReadability(fixReadability(bad)).filter(c => !c.ok)).toEqual([]);
  });

  it('toutes les polices des associations sont chargées', () => {
    const loaded = new Set(FONTS.map(f => f.css));
    for (const pairing of FONT_PAIRINGS) {
      expect(loaded.has(pairing.heading)).toBe(true);
      expect(loaded.has(pairing.body)).toBe(true);
    }
    for (const theme of THEME_PRESETS) {
      expect(loaded.has(theme.designSystem.typography.family)).toBe(true);
      expect(loaded.has(theme.designSystem.typography.headingFamily!)).toBe(true);
    }
    expect(GOOGLE_FONTS_URL).toContain('family=Playfair+Display');
  });
});

describe('strengthenContrast', () => {
  it('amène tous les textes du thème au niveau WCAG AA (4,5:1)', () => {
    const colors = strengthenContrast({
      primary: '#3b8fd0', secondary: '#312e81', bg: '#f8fafc', surface: '#e9edf2', text: '#1e293b', muted: '#64748b',
    });
    for (const background of [colors.bg, colors.surface]) {
      expect(contrastRatio(colors.muted, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.primary, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(readableOn(colors.primary), colors.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('ne touche pas à un thème déjà lisible', () => {
    const colors = { primary: '#1d4ed8', secondary: '#0f172a', bg: '#ffffff', surface: '#f1f5f9', text: '#0f172a', muted: '#475569' };
    expect(strengthenContrast(colors)).toEqual(colors);
  });
});
