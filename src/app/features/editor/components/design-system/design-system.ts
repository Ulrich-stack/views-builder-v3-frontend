import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { DesignSystem } from '../../../../../core/models/design-sytem.model';
import {
  checkReadability,
  fixReadability,
  FONT_PAIRINGS,
  FontPairing,
  fontName,
  FONTS,
  generatePalette,
  THEME_PRESETS,
  ThemePreset,
} from '../../../../../core/data/themes.data';
import { hslToHex, isDark } from '../../../../../core/utils/color';

type ColorKey = keyof DesignSystem['colors'];

interface ColorRole {
  key: ColorKey;
  label: string;
  hint: string;
}

interface NumberPreset {
  label: string;
  value: number;
}

@Component({
  selector: 'app-design-system',
  imports: [FormsModule],
  templateUrl: './design-system.html',
  styleUrl: './design-system.css',
})
export class DesignSystemPanel {
  editor = inject(EditorService);
  ds = this.editor.designSystem;

  readonly themes = THEME_PRESETS;
  readonly pairings = FONT_PAIRINGS;
  readonly fonts = FONTS;

  readonly colorRoles: ColorRole[] = [
    { key: 'primary', label: 'Principale', hint: 'Boutons, liens, éléments importants' },
    { key: 'secondary', label: 'Accent', hint: 'Seconde couleur, pour varier' },
    { key: 'bg', label: 'Fond de page', hint: 'Couleur derrière tout le contenu' },
    { key: 'surface', label: 'Cartes', hint: 'Encadrés posés sur le fond' },
    { key: 'text', label: 'Texte', hint: 'Titres et paragraphes' },
    { key: 'muted', label: 'Texte discret', hint: 'Sous-titres, légendes' },
  ];

  readonly textSizes: NumberPreset[] = [
    { label: 'Petite', value: 14 },
    { label: 'Normale', value: 16 },
    { label: 'Grande', value: 18 },
  ];

  readonly radiuses: NumberPreset[] = [
    { label: 'Carré', value: 0 },
    { label: 'Doux', value: 6 },
    { label: 'Arrondi', value: 14 },
    { label: 'Très rond', value: 24 },
  ];

  readonly spacings: NumberPreset[] = [
    { label: 'Compact', value: 10 },
    { label: 'Normal', value: 16 },
    { label: 'Aéré', value: 24 },
  ];

  // Générateur de palette
  seedColor = signal('#6366f1');
  seedMode = signal<'light' | 'dark'>('dark');
  showCustomFonts = signal(false);

  readability = computed(() => checkReadability(this.ds().colors));
  readabilityIssues = computed(() => this.readability().filter(c => !c.ok).length);

  headingFont = computed(() => this.ds().typography.headingFamily ?? this.ds().typography.family);
  fontSummary = computed(() => {
    const heading = fontName(this.headingFont());
    const body = fontName(this.ds().typography.family);
    return heading === body ? heading : `${heading} + ${body}`;
  });

  // THÈMES
  isActiveTheme(theme: ThemePreset): boolean {
    return JSON.stringify(this.normalize(theme.designSystem)) === JSON.stringify(this.normalize(this.ds()));
  }

  applyTheme(theme: ThemePreset) {
    this.editor.applyDesignSystem(theme.designSystem);
    this.seedColor.set(theme.designSystem.colors.primary);
    this.seedMode.set(isDark(theme.designSystem.colors.bg) ? 'dark' : 'light');
  }

  // GÉNÉRATION
  generate() {
    this.editor.applyDesignSystem({ ...this.ds(), colors: generatePalette(this.seedColor(), this.seedMode()) });
  }

  surprise() {
    const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
    const primary = hslToHex({ h: Math.random() * 360, s: 55 + Math.random() * 30, l: 50 + Math.random() * 8 });
    const mode = Math.random() < 0.5 ? 'light' : 'dark';
    const pairing = pick(FONT_PAIRINGS);
    this.seedColor.set(primary);
    this.seedMode.set(mode);
    this.editor.applyDesignSystem({
      colors: fixReadability(generatePalette(primary, mode)),
      typography: { ...this.ds().typography, family: pairing.body, headingFamily: pairing.heading },
      spacing: { radius: pick(this.radiuses).value, padding: pick(this.spacings).value },
    });
  }

  fixColors() {
    this.editor.applyDesignSystem({ ...this.ds(), colors: fixReadability(this.ds().colors) });
  }

  // COULEURS
  setColor(key: ColorKey, value: string) {
    this.editor.updateTheme(`colors.${key}`, value);
  }

  // TYPOGRAPHIE
  isActivePairing(pairing: FontPairing): boolean {
    return this.headingFont() === pairing.heading && this.ds().typography.family === pairing.body;
  }

  applyPairing(pairing: FontPairing) {
    this.editor.applyDesignSystem({
      ...this.ds(),
      typography: { ...this.ds().typography, family: pairing.body, headingFamily: pairing.heading },
    });
  }

  setHeadingFont(css: string) {
    this.editor.updateTheme('typography.headingFamily', css);
  }

  setBodyFont(css: string) {
    this.editor.updateTheme('typography.family', css);
  }

  setNumber(path: string, value: number) {
    this.editor.updateTheme(path, value);
  }

  private normalize(ds: DesignSystem): DesignSystem {
    return {
      colors: Object.fromEntries(
        Object.entries(ds.colors).map(([k, v]) => [k, v.toLowerCase()])
      ) as DesignSystem['colors'],
      typography: {
        family: ds.typography.family,
        headingFamily: ds.typography.headingFamily ?? ds.typography.family,
        sizeBase: ds.typography.sizeBase,
      },
      spacing: { radius: ds.spacing.radius, padding: ds.spacing.padding },
    };
  }
}
