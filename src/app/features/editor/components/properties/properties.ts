import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { NgTemplateOutlet } from '@angular/common';
import { DS_PAGE_ID, EditorService } from '../../../../../core/services/EditorService/editor-service';
import { Widget } from '../../../../../core/models/widget.model';
import { AiEditBox } from '../ai-edit-box/ai-edit-box';
import { ICON_NAMES, ICONS } from '../../../../../core/data/icons.data';
import { ActionsEditor } from '../actions-editor/actions-editor';

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
  imports: [FormsModule, LucideAngularModule, NgTemplateOutlet, AiEditBox, ActionsEditor],
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

  typeIcon = computed(() => {
    const w = this.widget();
    if (!w) return 'box';
    if (w.element === 'img') return 'image';
    if (w.element === 'video') return 'video';
    if (w.element === 'a') return 'link';
    return { container: 'box', text: 'type', action: 'mouse-pointer-2', input: 'text-cursor-input', media: 'image' }[w.type] ?? 'box';
  });

  /** Fil d'Ariane : page puis blocs parents jusqu'au bloc sélectionné */
  path = computed(() => {
    const w = this.widget();
    return w ? this.editor.getPath(w.id) : [];
  });

  pageName = computed(() => this.editor.selectedPage()?.name ?? '');

  // Sections repliables du panneau (toutes ouvertes par défaut)
  private closedSections = signal<Set<string>>(new Set());
  showShortcuts = signal(false);

  isOpen(section: string): boolean {
    return !this.closedSections().has(section);
  }

  toggleSection(section: string) {
    this.closedSections.update(set => {
      const next = new Set(set);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

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

  readonly shadows: Preset[] = [
    { label: 'Aucune', value: null },
    { label: 'Légère', value: '0 2px 8px rgba(0, 0, 0, 0.12)' },
    { label: 'Moyenne', value: '0 8px 24px rgba(0, 0, 0, 0.18)' },
    { label: 'Forte', value: '0 20px 50px rgba(0, 0, 0, 0.3)' },
  ];

  readonly margins: Preset[] = [
    { label: 'Aucun', value: null },
    { label: 'Petit', value: '8px 0' },
    { label: 'Moyen', value: '24px 0' },
    { label: 'Grand', value: '48px 0' },
  ];

  readonly maxWidths: Preset[] = [
    { label: 'Libre', value: null },
    { label: 'Étroit', value: '480px' },
    { label: 'Moyen', value: '720px' },
  ];

  /** Icônes proposées pour le bloc « Icône » */
  readonly icons = ICON_NAMES.map(name => ({ name, data: ICONS[name] }));

  readonly imageHeights: Preset[] = [
    { label: 'Auto', value: null },
    { label: 'Petite', value: '160px' },
    { label: 'Moyenne', value: '280px' },
    { label: 'Grande', value: '420px' },
  ];

  blockPosition = computed(() => {
    const left = this.style('margin-left');
    const right = this.style('margin-right');
    if (left === 'auto' && right === 'auto') return 'center';
    if (left === 'auto') return 'right';
    return 'left';
  });

  setBlockPosition(position: 'left' | 'center' | 'right') {
    const w = this.widget();
    if (!w) return;
    this.editor.setWidgetStyles(w.id, {
      'margin-left': position === 'left' ? null : 'auto',
      'margin-right': position === 'right' ? null : 'auto',
    });
  }

  rename(name: string) {
    const w = this.widget();
    if (w) this.editor.updateWidget(w.id, { name }, 'rename:' + w.id);
  }

  resetStyles() {
    const w = this.widget();
    if (w && confirm('Remettre le style par défaut de ce bloc ? (Ctrl+Z pour annuler)')) {
      this.editor.resetWidgetStyles(w.id);
    }
  }

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
