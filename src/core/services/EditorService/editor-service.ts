import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { Widget, WidgetType } from '../../models/widget.model';
import { ToolboxItem } from '../../data/toolbox.data';
import { v4 as uuidv4 } from 'uuid';
import { DesignSystem } from '../../models/design-sytem.model';
import { Page } from '../../models/page.model';
import { GOOGLE_FONTS_URL, THEME_PRESETS } from '../../data/themes.data';
import { readableOn } from '../../utils/color';
import { retargetActions, sanitizeActions } from '../../utils/interactions';

export const DS_PAGE_ID = 'ds-page';
export const STORAGE_KEY = 'views-builder:project:v1';
export const DS_PAGE_WIDTH = 520;

export const DEFAULT_PAGE_WIDTH = 800;
const HISTORY_LIMIT = 100;
// Les modifications successives avec la même clé (glisser un slider, taper un texte,
// déplacer une page...) sont regroupées en une seule étape d'historique.
const HISTORY_MERGE_DELAY = 800;

export type DropPosition = 'before' | 'after' | 'inside';

export interface DropTarget {
  widgetId: string;
  position: DropPosition;
}

interface Snapshot {
  pages: Page[];
  designSystem: DesignSystem;
}

/** Repères (« ref ») d'un arbre de blocs venu de l'IA, pour retrouver les identifiants et les cibles des actions. */
interface RefContext {
  known: Record<string, string>; // ref envoyé à l'IA → identifiant du bloc existant
  assigned: Map<string, string>; // ref reçu → identifiant final
  used: Set<string>;
}

interface WidgetLocation {
  pageId: string;
  parentId: string | null;
  index: number;
}

// Thème « Minuit » par défaut
const DEFAULT_DESIGN_SYSTEM: DesignSystem = THEME_PRESETS[0].designSystem;

const DEFAULT_PAGES: Page[] = [
  {
    id: DS_PAGE_ID,
    name: '🎨 Global Design System',
    x: 3500,
    y: 4000,
    widgets: [],
    isDesignSystem: true
  },
  { id: 'page-1', name: 'Home Page', x: 4100, y: 4100, widgets: [] }
];

@Injectable({
  providedIn: 'root',
})
export class EditorService {
  pages = signal<Page[]>(DEFAULT_PAGES);
  designSystem = signal<DesignSystem>(DEFAULT_DESIGN_SYSTEM);

  selectedWidgetId = signal<string | null>(null);
  selectedPageId = signal<string | null>('page-1');

  // Bloc survolé pendant un glisser-déposer, pour afficher le repère d'insertion
  dropTarget = signal<DropTarget | null>(null);

  // Bloc survolé dans le panneau Calques, mis en évidence sur la page
  hoveredWidgetId = signal<string | null>(null);

  // Page affichée en mode aperçu (sans l'éditeur, interactions actives)
  previewPageId = signal<string | null>(null);
  previewPage = computed(() => this.pages().find(p => p.id === this.previewPageId()) ?? null);

  private undoStack = signal<Snapshot[]>([]);
  private redoStack = signal<Snapshot[]>([]);
  private lastHistoryKey: string | null = null;
  private lastHistoryTime = 0;

  canUndo = computed(() => this.undoStack().length > 0);
  canRedo = computed(() => this.redoStack().length > 0);

  private document = inject(DOCUMENT);

  constructor() {
    this.loadFromStorage();
    this.loadFonts();

    // Sauvegarde automatique à chaque modification
    effect(() => {
      const snapshot: Snapshot = { pages: this.pages(), designSystem: this.designSystem() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Stockage indisponible (navigation privée, quota...) : on continue sans sauvegarde
      }
    });
  }

  globalVariables = computed(() => {
    const ds = this.designSystem();
    return {
      '--primary': ds.colors.primary,
      '--secondary': ds.colors.secondary,
      '--bg-page': ds.colors.bg,
      '--surface': ds.colors.surface,
      '--text': ds.colors.text,
      '--text-muted': ds.colors.muted,
      '--font-family': ds.typography.family,
      '--font-family-heading': ds.typography.headingFamily ?? ds.typography.family,
      // Couleur de texte lisible sur les boutons, calculée automatiquement
      '--on-primary': readableOn(ds.colors.primary),
      '--on-secondary': readableOn(ds.colors.secondary),
      '--font-size-base': ds.typography.sizeBase + 'px',
      '--radius-main': ds.spacing.radius + 'px',
      '--spacing-base': ds.spacing.padding + 'px',
      '--font-size-lg': (ds.typography.sizeBase * 1.5) + 'px',
      '--font-size-xl': (ds.typography.sizeBase * 2.5) + 'px',
    };
  });

  selectedWidget = computed(() => {
    const id = this.selectedWidgetId();
    if (!id) return null;
    for (const page of this.pages()) {
      const found = this.findWidgetRecursive(page.widgets, id);
      if (found) return found;
    }
    return null;
  });

  selectedPage = computed(() => {
    const id = this.selectedPageId();
    return this.pages().find(p => p.id === id) ?? null;
  });

  // HISTORIQUE (ANNULER / RÉTABLIR)
  undo() {
    const stack = this.undoStack();
    if (!stack.length) return;
    this.redoStack.update(r => [...r, this.currentSnapshot()]);
    this.restore(stack[stack.length - 1]);
    this.undoStack.set(stack.slice(0, -1));
  }

  redo() {
    const stack = this.redoStack();
    if (!stack.length) return;
    this.undoStack.update(u => [...u, this.currentSnapshot()]);
    this.restore(stack[stack.length - 1]);
    this.redoStack.set(stack.slice(0, -1));
  }

  /** Enregistre l'état actuel avant une modification. */
  private checkpoint(mergeKey?: string) {
    const now = Date.now();
    if (mergeKey && mergeKey === this.lastHistoryKey && now - this.lastHistoryTime < HISTORY_MERGE_DELAY) {
      this.lastHistoryTime = now;
      return;
    }
    this.undoStack.update(u => [...u, this.currentSnapshot()].slice(-HISTORY_LIMIT));
    this.redoStack.set([]);
    this.lastHistoryKey = mergeKey ?? null;
    this.lastHistoryTime = now;
  }

  private currentSnapshot(): Snapshot {
    return { pages: this.pages(), designSystem: this.designSystem() };
  }

  private restore(snapshot: Snapshot) {
    this.pages.set(snapshot.pages);
    this.designSystem.set(snapshot.designSystem);
    this.lastHistoryKey = null;
    if (this.selectedWidgetId() && !this.selectedWidget()) this.selectedWidgetId.set(null);
    if (this.selectedPageId() && !this.selectedPage()) this.selectedPageId.set(null);
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<Snapshot>;
      if (!Array.isArray(saved.pages) || !saved.designSystem?.colors) return;
      this.pages.set(saved.pages);
      this.designSystem.set(saved.designSystem);
      if (!saved.pages.some(p => p.id === this.selectedPageId())) {
        this.selectedPageId.set(saved.pages.find(p => !p.isDesignSystem)?.id ?? null);
      }
    } catch {
      // Sauvegarde illisible : on repart du projet par défaut
    }
  }

  /** Repart d'un projet vierge (l'action reste annulable). */
  resetProject() {
    this.checkpoint();
    this.pages.set(DEFAULT_PAGES);
    this.designSystem.set(DEFAULT_DESIGN_SYSTEM);
    this.selectedWidgetId.set(null);
    this.selectedPageId.set('page-1');
  }

  // DESIGN SYSTEM
  /** Remplace tout le design system (thème prêt à l'emploi, palette générée...). */
  applyDesignSystem(ds: DesignSystem) {
    this.checkpoint();
    this.designSystem.set(structuredClone(ds));
  }

  /** Charge une fois les polices Google proposées dans le design system. */
  private loadFonts() {
    if (this.document.getElementById('ds-google-fonts')) return;
    const link = this.document.createElement('link');
    link.id = 'ds-google-fonts';
    link.rel = 'stylesheet';
    link.href = GOOGLE_FONTS_URL;
    this.document.head.appendChild(link);
  }

  updateTheme(path: string, value: any) {
    this.checkpoint('theme:' + path);
    this.designSystem.update(ds => {
      const newDs = structuredClone(ds);
      const keys = path.split('.');
      let current: any = newDs;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newDs;
    });
  }

  // PAGES
  addPage(): Page {
    this.checkpoint();
    const pages = this.pages();
    const regularPages = pages.filter(p => !p.isDesignSystem);
    const rightEdge = Math.max(
      ...pages.map(p => p.x + (p.width ?? (p.isDesignSystem ? DS_PAGE_WIDTH : DEFAULT_PAGE_WIDTH)))
    );
    const page: Page = {
      id: uuidv4(),
      name: `Page ${regularPages.length + 1}`,
      x: rightEdge + 150,
      y: regularPages[0]?.y ?? 4100,
      widgets: []
    };
    this.pages.update(ps => [...ps, page]);
    this.selectedPageId.set(page.id);
    this.selectedWidgetId.set(null);
    return page;
  }

  updatePage(pageId: string, patch: Partial<Omit<Page, 'id' | 'widgets'>>, mergeKey?: string) {
    this.checkpoint(mergeKey);
    this.pages.update(pages => pages.map(p => (p.id === pageId ? { ...p, ...patch } : p)));
  }

  deletePage(pageId: string) {
    if (pageId === DS_PAGE_ID) return;
    this.checkpoint();
    const page = this.pages().find(p => p.id === pageId);
    this.pages.update(pages => pages.filter(p => p.id !== pageId));
    if (this.selectedPageId() === pageId) {
      this.selectedPageId.set(null);
    }
    const selected = this.selectedWidgetId();
    if (page && selected && this.findWidgetRecursive(page.widgets, selected)) {
      this.selectedWidgetId.set(null);
    }
  }

  // SÉLECTION
  selectWidget(widgetId: string | null) {
    this.selectedWidgetId.set(widgetId);
    if (widgetId) {
      const location = this.findLocation(widgetId);
      if (location) this.selectedPageId.set(location.pageId);
    }
  }

  selectParent() {
    const id = this.selectedWidgetId();
    if (!id) return;
    const location = this.findLocation(id);
    if (location?.parentId) this.selectedWidgetId.set(location.parentId);
  }

  getParentId(widgetId: string): string | null {
    return this.findLocation(widgetId)?.parentId ?? null;
  }

  // CRÉATION DES WIDGETS ET BLUEPRINTS
  createWidgetFromToolboxItem(item: ToolboxItem): Widget {
    if (item.type === 'blueprint' && item.blueprint) {
      return this.mapBlueprintToWidget(item.blueprint, item.label);
    }

    const isContainer = item.type === 'container';
    return {
      id: uuidv4(),
      type: item.type as WidgetType,
      element: item.element,
      name: item.label,
      content: this.getDefaultContent(item),
      styles: this.getDefaultStyles(item),
      config: this.getDefaultConfig(item),
      children: isContainer ? [] : undefined
    };
  }

  // APERÇU
  openPreview(pageId: string | null = this.targetPageId()) {
    if (!pageId || !this.pages().some(p => p.id === pageId && !p.isDesignSystem)) return;
    this.previewPageId.set(pageId);
  }

  closePreview() {
    this.previewPageId.set(null);
  }

  // MÉTHODE RÉCURSIVE POUR LES BLUEPRINTS
  private mapBlueprintToWidget(bp: any, label: string, refs?: RefContext, forcedId?: string): Widget {
    const id = forcedId ?? this.idForRef(bp.ref, refs);
    if (forcedId) refs?.used.add(forcedId);
    if (refs && typeof bp.ref === 'string') refs.assigned.set(bp.ref, id);
    return {
      id: id,
      type: (bp.children ? 'container' : bp.type) as WidgetType,
      element: bp.element || 'div',
      name: bp.name || label,
      content: bp.content || '',
      // Les boutons des blueprints reprennent le style par défaut (couleur principale, arrondis...)
      styles: bp.type === 'action' && !bp.children
        ? { ...this.getDefaultStyles({ type: 'action' } as ToolboxItem), ...bp.styles }
        : { ...bp.styles },
      config: this.blueprintConfig(bp.config),
      children: bp.children ? bp.children.map((c: any) => this.mapBlueprintToWidget(c, this.labelFor(c), refs)) : undefined
    };
  }

  /** Garde l'identifiant d'un bloc existant si l'IA a recopié son repère, sinon en crée un. */
  private idForRef(ref: unknown, refs?: RefContext): string {
    const known = refs && typeof ref === 'string' ? refs.known[ref] : undefined;
    if (known && !refs!.used.has(known)) {
      refs!.used.add(known);
      return known;
    }
    return uuidv4();
  }

  /** Les actions et la visibilité venues de l'extérieur sont revérifiées (liste blanche). */
  private blueprintConfig(config: any): Record<string, any> {
    const clean: Record<string, any> = { ...(config || {}) };
    if ('actions' in clean) {
      const actions = sanitizeActions(clean['actions']);
      if (actions.length) clean['actions'] = actions;
      else delete clean['actions'];
    }
    if ('hidden' in clean) {
      if (clean['hidden'] === true || clean['hidden'] === 'true') clean['hidden'] = true;
      else delete clean['hidden'];
    }
    return clean;
  }

  /**
   * Transforme des blocs venus de l'IA en widgets : les repères sont convertis en identifiants,
   * et les actions dont la cible n'existe pas sont retirées.
   * @param stale identifiants qui vont disparaître (ancienne version du bloc modifié)
   */
  private materialize(
    blueprints: any[],
    labelOf: (bp: any) => string,
    known: Record<string, string> = {},
    forcedRootId?: string,
    stale: Set<string> = new Set()
  ): Widget[] {
    const refs: RefContext = { known, assigned: new Map(), used: new Set() };
    const widgets = blueprints.map((bp, i) => this.mapBlueprintToWidget(bp, labelOf(bp), refs, i === 0 ? forcedRootId : undefined));
    const created = new Set<string>();
    const collect = (w: Widget) => { created.add(w.id); w.children?.forEach(collect); };
    widgets.forEach(collect);
    const resolve = (target: string): string | null => {
      const id = refs.assigned.get(target) ?? target;
      if (created.has(id)) return id;
      return !stale.has(id) && this.findWidgetInPages(this.pages(), id) ? id : null;
    };
    return widgets.map(w => retargetActions(w, resolve));
  }

  private labelFor(bp: any): string {
    if (bp.children) return 'Conteneur';
    switch (bp.type) {
      case 'text': return 'Texte';
      case 'action': return 'Bouton';
      case 'input': return 'Champ';
      case 'media': return 'Image';
      default: return 'Bloc';
    }
  }

  /**
   * Ajout par simple clic depuis la boîte à composants : dans le bloc sélectionné
   * s'il peut contenir des éléments, juste après lui sinon, ou à la fin de la page.
   */
  addFromToolbox(item: ToolboxItem): Widget | null {
    const widget = this.createWidgetFromToolboxItem(item);
    const selected = this.selectedWidget();
    const location = selected ? this.findLocation(selected.id) : null;

    if (selected && location) {
      if (selected.type === 'container' && selected.children) {
        this.addWidget(widget, selected.id, location.pageId);
      } else {
        this.addWidget(widget, location.parentId, location.pageId, location.index + 1);
      }
    } else {
      const pageId = this.targetPageId();
      if (!pageId) return null;
      this.addWidget(widget, null, pageId);
    }
    this.selectWidget(widget.id);
    return widget;
  }

  /** Page qui reçoit les ajouts : la page sélectionnée, sinon la première page de contenu. */
  targetPageId(): string | null {
    const page = this.selectedPage();
    return page && !page.isDesignSystem
      ? page.id
      : this.pages().find(p => !p.isDesignSystem)?.id ?? null;
  }

  /**
   * Ajoute à la fin de la page les sections générées par l'IA, en une seule étape d'historique
   * (un seul « Annuler » retire toute la génération). Renvoie le nombre de sections ajoutées.
   */
  addGeneratedWidgets(
    blueprints: any[],
    pageId: string | null = this.targetPageId(),
    options: { continueStep?: boolean; select?: boolean } = {}
  ): number {
    if (!pageId || !blueprints.length) return 0;
    const widgets = this.materialize(blueprints, bp => bp.children ? 'Section' : this.labelFor(bp));
    // En génération en direct, les sections suivantes rejoignent l'étape d'historique de la première
    if (!options.continueStep) this.checkpoint();
    this.pages.update(pages =>
      widgets.reduce((acc, widget) => this.insertInPages(acc, widget, pageId, null) ?? acc, pages)
    );
    if (options.select !== false) {
      this.selectedPageId.set(pageId);
      this.selectWidget(widgets[0].id);
    }
    return widgets.length;
  }

  /**
   * Remplace un bloc par sa version modifiée par l'IA, en une étape annulable.
   * Le bloc garde son identifiant pour rester sélectionné ; ses enfants gardent le leur quand l'IA
   * a recopié leur repère (`refs` : repère → identifiant), ce qui préserve les cibles des actions.
   */
  replaceWithBlueprint(widgetId: string, blueprint: any, refs: Record<string, string> = {}): boolean {
    const current = this.findWidgetInPages(this.pages(), widgetId);
    if (!current) return false;
    const stale = new Set<string>();
    const collect = (w: Widget) => { stale.add(w.id); w.children?.forEach(collect); };
    collect(current);
    const [replacement] = this.materialize([blueprint], () => current.name, refs, widgetId, stale);
    this.checkpoint();
    this.pages.update(pages => this.mapWidgetInPages(pages, widgetId, () => replacement));
    return true;
  }

  /** Chemin du bloc sélectionné, du plus haut parent jusqu'à lui (fil d'Ariane). */
  getPath(widgetId: string): Widget[] {
    for (const page of this.pages()) {
      const path = this.pathRecursive(page.widgets, widgetId);
      if (path) return path;
    }
    return [];
  }

  private pathRecursive(widgets: Widget[], id: string): Widget[] | null {
    for (const w of widgets) {
      if (w.id === id) return [w];
      if (w.children) {
        const sub = this.pathRecursive(w.children, id);
        if (sub) return [w, ...sub];
      }
    }
    return null;
  }

  /** Remet les styles par défaut du bloc (selon son type). */
  resetWidgetStyles(widgetId: string) {
    const widget = this.findWidgetInPages(this.pages(), widgetId);
    if (!widget) return;
    const styles = this.getDefaultStyles({ type: widget.type, element: widget.element } as ToolboxItem);
    this.updateWidget(widgetId, { styles });
  }

  // MODIFICATION DES WIDGETS
  addWidget(widget: Widget, parentId: string | null = null, pageId: string | null = null, index?: number) {
    const targetPageId = pageId || this.selectedPageId();
    if (!targetPageId) return;
    this.checkpoint();
    this.pages.update(pages => this.insertInPages(pages, widget, targetPageId, parentId, index) ?? pages);
  }

  moveWidget(widgetId: string, targetParentId: string | null, targetPageId: string, index?: number) {
    const source = this.findLocation(widgetId);
    if (!source) return;

    if (targetParentId) {
      // Impossible de déposer un bloc dans lui-même ou dans un de ses enfants
      const dragged = this.findWidgetInPages(this.pages(), widgetId)!;
      if (targetParentId === widgetId || this.findWidgetRecursive(dragged.children ?? [], targetParentId)) return;
    }

    // L'index cible est calculé avant le retrait : on le corrige si on reste dans le même parent
    let targetIndex = index;
    if (
      targetIndex !== undefined &&
      source.pageId === targetPageId &&
      source.parentId === targetParentId &&
      source.index < targetIndex
    ) {
      targetIndex--;
    }
    if (
      source.pageId === targetPageId &&
      source.parentId === targetParentId &&
      (targetIndex ?? Infinity) === source.index
    ) {
      return;
    }

    const current = this.pages();
    const dragged = this.findWidgetInPages(current, widgetId)!;
    const cleaned = current.map(page => ({ ...page, widgets: this.removeRecursive(page.widgets, widgetId) }));
    const result = this.insertInPages(cleaned, dragged, targetPageId, targetParentId, targetIndex);
    if (!result) return;

    this.checkpoint();
    this.pages.set(result);
  }

  /** Dépose un bloc (nouveau ou existant) avant, après ou dans un autre bloc. */
  dropRelativeTo(target: DropTarget, data: { id?: string } & Partial<ToolboxItem>) {
    const location = this.findLocation(target.widgetId);
    if (!location) return;

    let parentId: string | null;
    let index: number | undefined;
    if (target.position === 'inside') {
      parentId = target.widgetId;
      index = undefined;
    } else {
      parentId = location.parentId;
      index = location.index + (target.position === 'after' ? 1 : 0);
    }

    if (data.id) {
      if (data.id === target.widgetId) return;
      this.moveWidget(data.id, parentId, location.pageId, index);
    } else {
      const widget = this.createWidgetFromToolboxItem(data as ToolboxItem);
      this.addWidget(widget, parentId, location.pageId, index);
      this.selectWidget(widget.id);
    }
  }

  updateWidget(widgetId: string, patch: Partial<Omit<Widget, 'id'>>, mergeKey?: string) {
    this.checkpoint(mergeKey);
    this.pages.update(pages => this.mapWidgetInPages(pages, widgetId, w => ({ ...w, ...patch })));
  }

  /** Change une propriété CSS du bloc. `null` la retire. */
  setWidgetStyle(widgetId: string, property: string, value: string | null, mergeKey?: string) {
    this.checkpoint(mergeKey ?? `style:${widgetId}:${property}`);
    this.pages.update(pages =>
      this.mapWidgetInPages(pages, widgetId, w => {
        const styles = { ...w.styles };
        if (value === null || value === '') delete styles[property];
        else styles[property] = value;
        return { ...w, styles };
      })
    );
  }

  setWidgetStyles(widgetId: string, patch: Record<string, string | null>) {
    this.checkpoint();
    this.pages.update(pages =>
      this.mapWidgetInPages(pages, widgetId, w => {
        const styles = { ...w.styles };
        for (const [property, value] of Object.entries(patch)) {
          if (value === null || value === '') delete styles[property];
          else styles[property] = value;
        }
        return { ...w, styles };
      })
    );
  }

  setWidgetConfig(widgetId: string, key: string, value: any) {
    this.checkpoint(`config:${widgetId}:${key}`);
    this.pages.update(pages =>
      this.mapWidgetInPages(pages, widgetId, w => ({ ...w, config: { ...w.config, [key]: value } }))
    );
  }

  removeWidget(widgetId: string) {
    if (!this.findLocation(widgetId)) return;
    this.checkpoint();
    this.pages.update(pages => pages.map(page => ({ ...page, widgets: this.removeRecursive(page.widgets, widgetId) })));
    const selected = this.selectedWidgetId();
    if (selected && !this.selectedWidget()) this.selectedWidgetId.set(null);
  }

  duplicateWidget(widgetId: string): Widget | null {
    const location = this.findLocation(widgetId);
    const original = this.findWidgetInPages(this.pages(), widgetId);
    if (!location || !original) return null;
    const copy = this.cloneWithNewIds(original);
    this.addWidget(copy, location.parentId, location.pageId, location.index + 1);
    this.selectedWidgetId.set(copy.id);
    return copy;
  }

  /** Monte (-1) ou descend (+1) un bloc parmi ses voisins. */
  moveWidgetBy(widgetId: string, delta: -1 | 1) {
    const location = this.findLocation(widgetId);
    if (!location) return;
    const siblings = this.getSiblings(location);
    const newIndex = location.index + delta;
    if (newIndex < 0 || newIndex >= siblings.length) return;
    this.moveWidget(widgetId, location.parentId, location.pageId, delta > 0 ? newIndex + 1 : newIndex);
  }

  canMoveBy(widgetId: string, delta: -1 | 1): boolean {
    const location = this.findLocation(widgetId);
    if (!location) return false;
    const newIndex = location.index + delta;
    return newIndex >= 0 && newIndex < this.getSiblings(location).length;
  }

  // OUTILS SUR L'ARBRE DES WIDGETS
  findLocation(widgetId: string): WidgetLocation | null {
    for (const page of this.pages()) {
      const found = this.locateRecursive(page.widgets, widgetId, null);
      if (found) return { pageId: page.id, ...found };
    }
    return null;
  }

  private locateRecursive(
    widgets: Widget[],
    id: string,
    parentId: string | null
  ): { parentId: string | null; index: number } | null {
    for (let i = 0; i < widgets.length; i++) {
      const w = widgets[i];
      if (w.id === id) return { parentId, index: i };
      if (w.children) {
        const found = this.locateRecursive(w.children, id, w.id);
        if (found) return found;
      }
    }
    return null;
  }

  private getSiblings(location: WidgetLocation): Widget[] {
    const page = this.pages().find(p => p.id === location.pageId);
    if (!page) return [];
    if (!location.parentId) return page.widgets;
    return this.findWidgetRecursive(page.widgets, location.parentId)?.children ?? [];
  }

  private findWidgetInPages(pages: Page[], id: string): Widget | null {
    for (const page of pages) {
      const found = this.findWidgetRecursive(page.widgets, id);
      if (found) return found;
    }
    return null;
  }

  private findWidgetRecursive(widgets: Widget[], id: string): Widget | null {
    for (const w of widgets) {
      if (w.id === id) return w;
      if (w.children) {
        const found = this.findWidgetRecursive(w.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /** Insère un widget sans modifier les objets existants. Renvoie null si la cible est introuvable. */
  private insertInPages(
    pages: Page[],
    widget: Widget,
    pageId: string,
    parentId: string | null,
    index?: number
  ): Page[] | null {
    let inserted = false;
    const result = pages.map(page => {
      if (page.id !== pageId) return page;
      if (!parentId) {
        inserted = true;
        return { ...page, widgets: this.insertAt(page.widgets, widget, index) };
      }
      const widgets = this.mapWidgetRecursive(page.widgets, parentId, parent => {
        if (!parent.children) return parent;
        inserted = true;
        return { ...parent, children: this.insertAt(parent.children, widget, index) };
      });
      return { ...page, widgets };
    });
    return inserted ? result : null;
  }

  private insertAt(list: Widget[], widget: Widget, index?: number): Widget[] {
    const copy = [...list];
    copy.splice(index === undefined ? copy.length : Math.max(0, Math.min(index, copy.length)), 0, widget);
    return copy;
  }

  private mapWidgetInPages(pages: Page[], id: string, fn: (w: Widget) => Widget): Page[] {
    return pages.map(page => {
      const widgets = this.mapWidgetRecursive(page.widgets, id, fn);
      return widgets === page.widgets ? page : { ...page, widgets };
    });
  }

  /** Remplace le widget `id` par fn(widget) en recopiant uniquement le chemin modifié. */
  private mapWidgetRecursive(widgets: Widget[], id: string, fn: (w: Widget) => Widget): Widget[] {
    let changed = false;
    const result = widgets.map(w => {
      if (w.id === id) {
        changed = true;
        return fn(w);
      }
      if (w.children) {
        const children = this.mapWidgetRecursive(w.children, id, fn);
        if (children !== w.children) {
          changed = true;
          return { ...w, children };
        }
      }
      return w;
    });
    return changed ? result : widgets;
  }

  private removeRecursive(widgets: Widget[], id: string): Widget[] {
    return widgets
      .filter(w => w.id !== id)
      .map(w => ({
        ...w,
        children: w.children ? this.removeRecursive(w.children, id) : undefined
      }));
  }

  /** Copie avec de nouveaux identifiants ; les actions qui visent un bloc de la copie suivent la copie. */
  private cloneWithNewIds(widget: Widget): Widget {
    const ids = new Map<string, string>();
    const clone = (w: Widget): Widget => {
      const id = uuidv4();
      ids.set(w.id, id);
      return { ...structuredClone(w), id, children: w.children?.map(clone) };
    };
    const copy = clone(widget);
    return retargetActions(copy, target => ids.get(target) ?? target);
  }

  private getDefaultContent(item: ToolboxItem): string {
    switch (item.type) {
      case 'text': return item.element === 'a' ? 'Lien' : 'Texte';
      case 'action': return 'Bouton';
      default: return '';
    }
  }

  private getDefaultConfig(item: ToolboxItem): Record<string, any> {
    switch (item.element) {
      case 'img': return { src: '', alt: '' };
      case 'icon': return { icon: 'sparkles' };
      case 'a': return { href: '' };
      case 'input':
      case 'textarea': return { placeholder: 'Votre réponse...' };
      case 'checkbox': return { label: 'J\'accepte' };
      default: return {};
    }
  }

  private getDefaultStyles(item: ToolboxItem): Record<string, string> {
    const base = {
      'padding': 'var(--spacing-base)',
      'font-family': 'var(--font-family)',
      'color': 'var(--text)'
    };

    if (item.type === 'container') {
      switch (item.element) {
        case 'section':
          return { ...base, 'padding': '48px 24px', 'min-height': '160px', 'width': '100%', 'display': 'flex', 'flex-direction': 'column', 'gap': 'var(--spacing-base)' };
        case 'grid':
          return { ...base, 'min-height': '100px', 'width': '100%', 'display': 'grid', 'grid-template-columns': 'repeat(2, 1fr)', 'gap': 'var(--spacing-base)' };
        case 'nav':
          return { ...base, 'min-height': '60px', 'width': '100%', 'display': 'flex', 'flex-direction': 'row', 'flex-wrap': 'wrap', 'align-items': 'center', 'gap': 'var(--spacing-base)' };
      }
      return {
        ...base,
        'min-height': '100px',
        'border': '1px dashed var(--text-muted)',
        'background-color': 'var(--surface)',
        'border-radius': 'var(--radius-main)',
        'width': '100%'
      };
    }

    if (item.type === 'media' && item.element === 'icon') return { 'width': '40px', 'height': '40px', 'color': 'var(--primary)' };
    if (item.type === 'media') return { ...base, 'padding': '0', 'border-radius': 'var(--radius-main)', 'overflow': 'hidden' };

    if (item.type === 'action') {
      return {
        ...base,
        'display': 'inline-block',
        'background-color': 'var(--primary)',
        'color': 'var(--on-primary)',
        'border-radius': 'var(--radius-main)',
        'border': 'none',
        'cursor': 'pointer'
      };
    }

    if (item.element === 'h1') return { ...base, 'font-size': 'var(--font-size-xl)', 'font-weight': '700' };
    if (item.element === 'h2') return { ...base, 'font-size': 'var(--font-size-lg)', 'font-weight': '700' };

    return base;
  }
}
