import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DS_PAGE_ID, EditorService } from '../../../../../core/services/EditorService/editor-service';
import { Widget } from '../../../../../core/models/widget.model';

export interface Preset {
  label: string;
  value: string | null;
  hint?: string;
}

interface Swatch {
  label: string;
  value: string | null;
  /** Clé de la couleur dans le design system, pour afficher l'aperçu */
  token?: 'primary' | 'secondary' | 'bg' | 'surface' | 'text' | 'muted';
  color?: string;
}

const TYPE_LABELS: Record<string, string> = {
  container: 'Conteneur',
  text: 'Texte',
  action: 'Bouton',
  input: 'Champ de formulaire',
  media: 'Média',
};

@Component({
  selector: 'app-properties',
  imports: [FormsModule],
  templateUrl: './properties.html',
  styleUrl: './properties.css',
})
export class Properties {
  editor = inject(EditorService);

  widget = this.editor.selectedWidget;
  page = computed(() => {
    const page = this.editor.selectedPage();
    return page && page.id !== DS_PAGE_ID ? page : null;
  });

  typeLabel = computed(() => {
    const w = this.widget();
    if (!w) return '';
    if (w.element === 'img') return 'Image';
    if (w.element === 'video') return 'Vidéo';
    if (w.element === 'a') return 'Lien';
    return TYPE_LABELS[w.type] ?? 'Bloc';
  });

  hasText = computed(() => ['text', 'action'].includes(this.widget()?.type ?? ''));
  isContainer = computed(() => this.widget()?.type === 'container');
  hasParent = computed(() => {
    const w = this.widget();
    return !!w && !!this.editor.getParentId(w.id);
  });

  layout = computed(() => {
    const styles = this.widget()?.styles ?? {};
    if (styles['display'] === 'grid') return 'grid';
    if (styles['display'] === 'flex') return styles['flex-direction'] === 'row' ? 'row' : 'column';
    return 'free';
  });

  gridColumns = computed(() => {
    const match = /repeat\((\d+)/.exec(this.widget()?.styles['grid-template-columns'] ?? '');
    return match ? Number(match[1]) : 2;
  });

  // PRÉRÉGLAGES (en langage simple, liés au design system)
  readonly fontSizes: Preset[] = [
    { label: 'S', value: 'calc(var(--font-size-base) * 0.875)', hint: 'Petit' },
    { label: 'M', value: 'var(--font-size-base)', hint: 'Normal' },
    { label: 'L', value: 'var(--font-size-lg)', hint: 'Grand' },
    { label: 'XL', value: 'var(--font-size-xl)', hint: 'Très grand' },
  ];

  readonly fontWeights: Preset[] = [
    { label: 'Normal', value: '400' },
    { label: 'Gras', value: '700' },
  ];

  readonly textAligns: Preset[] = [
    { label: '⇤', value: 'left', hint: 'À gauche' },
    { label: '↔', value: 'center', hint: 'Centré' },
    { label: '⇥', value: 'right', hint: 'À droite' },
  ];

  readonly textColors: Swatch[] = [
    { label: 'Texte', value: 'var(--text)', token: 'text' },
    { label: 'Discret', value: 'var(--text-muted)', token: 'muted' },
    { label: 'Primaire', value: 'var(--primary)', token: 'primary' },
    { label: 'Accent', value: 'var(--secondary)', token: 'secondary' },
    { label: 'Blanc', value: '#ffffff', color: '#ffffff' },
  ];

  readonly backgrounds: Swatch[] = [
    { label: 'Aucun', value: null },
    { label: 'Carte', value: 'var(--surface)', token: 'surface' },
    { label: 'Fond', value: 'var(--bg-page)', token: 'bg' },
    { label: 'Primaire', value: 'var(--primary)', token: 'primary' },
    { label: 'Accent', value: 'var(--secondary)', token: 'secondary' },
  ];

  readonly paddings: Preset[] = [
    { label: 'Aucun', value: '0' },
    { label: 'Petit', value: '8px' },
    { label: 'Moyen', value: 'var(--spacing-base)' },
    { label: 'Grand', value: '40px' },
  ];

  readonly radiuses: Preset[] = [
    { label: 'Carré', value: '0' },
    { label: 'Thème', value: 'var(--radius-main)' },
    { label: 'Arrondi', value: '24px' },
    { label: 'Pilule', value: '999px' },
  ];

  readonly borders: Preset[] = [
    { label: 'Aucune', value: 'none' },
    { label: 'Fine', value: '1px solid var(--text-muted)' },
    { label: 'Pointillés', value: '1px dashed var(--text-muted)' },
  ];

  readonly widths: Preset[] = [
    { label: 'Auto', value: null },
    { label: 'Pleine largeur', value: '100%' },
  ];

  readonly gaps: Preset[] = [
    { label: 'Aucun', value: '0' },
    { label: 'Petit', value: '8px' },
    { label: 'Moyen', value: 'var(--spacing-base)' },
    { label: 'Grand', value: '32px' },
  ];

  readonly alignItems: Preset[] = [
    { label: 'Début', value: 'flex-start' },
    { label: 'Centre', value: 'center' },
    { label: 'Fin', value: 'flex-end' },
    { label: 'Étirer', value: 'stretch' },
  ];

  readonly pageWidths: Preset[] = [
    { label: '📱 Mobile', value: '390' },
    { label: '📲 Tablette', value: '768' },
    { label: '💻 Ordinateur', value: '1280' },
  ];

  // LECTURE / ÉCRITURE DES STYLES
  style(property: string): string | null {
    return this.widget()?.styles[property] ?? null;
  }

  isActive(property: string, value: string | null): boolean {
    return this.style(property) === value;
  }

  setStyle(property: string, value: string | null) {
    const w = this.widget();
    if (w) this.editor.setWidgetStyle(w.id, property, value);
  }

  swatchColor(swatch: Swatch): string {
    if (swatch.color) return swatch.color;
    if (swatch.token) return this.editor.designSystem().colors[swatch.token];
    return 'transparent';
  }

  /** Valeur hexadécimale pour le sélecteur de couleur personnalisée. */
  customColor(property: string): string {
    const value = this.style(property);
    return value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff';
  }

  isCustomColor(property: string, swatches: Swatch[]): boolean {
    const value = this.style(property);
    return !!value && !swatches.some(s => s.value === value);
  }

  setLayout(layout: 'free' | 'column' | 'row' | 'grid') {
    const w = this.widget();
    if (!w) return;
    const reset = { 'display': null, 'flex-direction': null, 'flex-wrap': null, 'grid-template-columns': null };
    switch (layout) {
      case 'free':
        this.editor.setWidgetStyles(w.id, reset);
        break;
      case 'column':
        this.editor.setWidgetStyles(w.id, { ...reset, 'display': 'flex', 'flex-direction': 'column', 'gap': this.style('gap') ?? 'var(--spacing-base)' });
        break;
      case 'row':
        this.editor.setWidgetStyles(w.id, { ...reset, 'display': 'flex', 'flex-direction': 'row', 'flex-wrap': 'wrap', 'gap': this.style('gap') ?? 'var(--spacing-base)' });
        break;
      case 'grid':
        this.editor.setWidgetStyles(w.id, { ...reset, 'display': 'grid', 'grid-template-columns': `repeat(${this.gridColumns()}, 1fr)`, 'gap': this.style('gap') ?? 'var(--spacing-base)' });
        break;
    }
  }

  setGridColumns(columns: number) {
    this.setStyle('grid-template-columns', `repeat(${columns}, 1fr)`);
  }

  // CONTENU
  setContent(value: string) {
    const w = this.widget();
    if (w) this.editor.updateWidget(w.id, { content: value }, 'content:' + w.id);
  }

  config(key: string): string {
    return this.widget()?.config[key] ?? '';
  }

  setConfig(key: string, value: any) {
    const w = this.widget();
    if (w) this.editor.setWidgetConfig(w.id, key, value);
  }

  useSampleImage() {
    this.setConfig('src', `https://picsum.photos/seed/${Math.random().toString(36).slice(2, 8)}/800/500`);
  }

  // ACTIONS
  moveBy(widget: Widget, delta: -1 | 1) {
    this.editor.moveWidgetBy(widget.id, delta);
  }

  canMoveBy(widget: Widget, delta: -1 | 1): boolean {
    return this.editor.canMoveBy(widget.id, delta);
  }

  // PAGE
  renamePage(name: string) {
    const page = this.page();
    if (page) this.editor.updatePage(page.id, { name }, 'rename:' + page.id);
  }

  isPageWidth(width: string | null): boolean {
    return Math.round(this.page()?.width ?? 800) === Number(width);
  }

  setPageWidth(width: string | null) {
    const page = this.page();
    if (page && width) this.editor.updatePage(page.id, { width: Number(width) });
  }

  deletePage() {
    const page = this.page();
    if (page && confirm(`Supprimer la page « ${page.name} » ? (Vous pourrez annuler avec Ctrl+Z)`)) {
      this.editor.deletePage(page.id);
    }
  }

  resetProject() {
    if (confirm('Repartir d\'un projet vierge ? (Vous pourrez annuler avec Ctrl+Z)')) {
      this.editor.resetProject();
    }
  }
}
