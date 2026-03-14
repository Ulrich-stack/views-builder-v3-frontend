import { computed, Injectable, signal } from '@angular/core';
import { Widget, WidgetType } from '../../models/widget.model';
import { ToolboxItem } from '../../data/toolbox.data';
import { v4 as uuidv4 } from 'uuid';
import { DesignSystem } from '../../models/design-sytem.model';
import { Page } from '../../models/page.model';

@Injectable({
  providedIn: 'root',
})
export class EditorService {
  pages = signal<Page[]>([]);

  designSystem = signal<DesignSystem>({
    colors: {
      primary: '#6366f1',
      secondary: '#94a3b8',
      bg: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      muted: '#64748b'
    },
    typography: {
      family: "'Inter', sans-serif",
      sizeBase: 16
    },
    spacing: {
      radius: 8, // Mis à 8 pour de jolis arrondis par défaut
      padding: 16
    }
  });

  constructor() {
    this.pages.set([
      {
        id: 'ds-page',
        name: '🎨 Global Design System',
        x: 3500,
        y: 4000,
        widgets: [],
        isDesignSystem: true
      },
      { id: 'page-1', name: 'Home Page', x: 4100, y: 4100, widgets: [] }
    ]);
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
      '--font-size-base': ds.typography.sizeBase + 'px',
      '--radius-main': ds.spacing.radius + 'px',
      '--spacing-base': ds.spacing.padding + 'px',
      '--font-size-lg': (ds.typography.sizeBase * 1.5) + 'px',
      '--font-size-xl': (ds.typography.sizeBase * 2.5) + 'px',
    };
  });

  selectedWidgetId = signal<string | null>(null);
  selectedPageId = signal<string | null>('page-1');

  deletePage(pageId: string) {
    if (pageId === 'ds-page') return;
    this.saveHistory();
    this.pages.update(pages => pages.filter(p => p.id !== pageId));
    if (this.selectedPageId() === pageId) {
      this.selectedPageId.set(null);
    }
  }

  updateTheme(path: string, value: any) {
    this.designSystem.update(ds => {
      const newDs = JSON.parse(JSON.stringify(ds));
      const keys = path.split('.');
      let current: any = newDs;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newDs;
    });
  }

  selectedWidget = computed(() => {
    const id = this.selectedWidgetId();
    if (!id) return null;
    for (const page of this.pages()) {
      const found = this.findWidgetRecursive(page.widgets, id);
      if (found) return found;
    }
    return null;
  });

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
      config: {},
      children: isContainer ? [] : undefined
    };
  }

  // MÉTHODE RÉCURSIVE POUR LES BLUEPRINTS
  private mapBlueprintToWidget(bp: any, label: string): Widget {
    const id = uuidv4();
    return {
      id: id,
      type: (bp.children ? 'container' : bp.type) as WidgetType,
      element: bp.element || 'div',
      name: label,
      content: bp.content || '',
      styles: { ...bp.styles },
      config: bp.config || {},
      children: bp.children ? bp.children.map((c: any) => this.mapBlueprintToWidget(c, 'Child Component')) : undefined
    };
  }

  addWidget(widget: Widget, parentId: string | null = null, pageId: string | null = null) {
    this.saveHistory(); 

    const targetPageId = pageId || this.selectedPageId();
    this.pages.update(currentPages => {
      return currentPages.map(page => {
        if (page.id !== targetPageId) return page;
        if (!parentId) {
          return { ...page, widgets: [...page.widgets, widget] };
        }
        const newWidgets = [...page.widgets];
        this.insertInParentRecursive(newWidgets, parentId, widget);
        return { ...page, widgets: newWidgets };
      });
    });
  }

  moveWidget(widgetId: string, targetParentId: string | null, targetPageId: string) {
    this.saveHistory();
    
    this.pages.update(currentPages => {
      let draggedWidget: Widget | null = null;
      const cleanedPages = currentPages.map(page => {
        const found = this.findWidgetRecursive(page.widgets, widgetId);
        if (found) draggedWidget = { ...found };
        return { ...page, widgets: this.removeRecursive(page.widgets, widgetId) };
      });

      if (!draggedWidget) return currentPages;

      return cleanedPages.map(page => {
        if (page.id !== targetPageId) return page;
        if (!targetParentId) {
          return { ...page, widgets: [...page.widgets, draggedWidget!] };
        } else {
          const newWidgets = [...page.widgets];
          this.insertInParentRecursive(newWidgets, targetParentId, draggedWidget!);
          return { ...page, widgets: newWidgets };
        }
      });
    });
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

  private insertInParentRecursive(widgets: Widget[], parentId: string, newWidget: Widget): boolean {
    for (const w of widgets) {
      if (w.id === parentId && w.children) {
        w.children.push(newWidget);
        return true;
      }
      if (w.children && this.insertInParentRecursive(w.children, parentId, newWidget)) {
        return true;
      }
    }
    return false;
  }

  private removeRecursive(widgets: Widget[], id: string): Widget[] {
    return widgets
      .filter(w => w.id !== id)
      .map(w => ({
        ...w,
        children: w.children ? this.removeRecursive(w.children, id) : undefined
      }));
  }

  private getDefaultContent(item: ToolboxItem): string {
    switch (item.type) {
      case 'text': return 'Texte';
      case 'action': return 'Bouton';
      default: return '';
    }
  }

  private getDefaultStyles(item: ToolboxItem): Record<string, string> {
    const base = {
      'padding': 'var(--spacing-base)',
      'font-family': 'var(--font-family)',
      'color': 'var(--text)'
    };

    if (item.type === 'container') {
      return {
        ...base,
        'min-height': '100px',
        'border': '1px dashed var(--text-muted)',
        'background-color': 'var(--surface)',
        'border-radius': 'var(--radius-main)',
        'width': '100%'
      };
    }

    if (item.type === 'action') {
      return {
        ...base,
        'background-color': 'var(--primary)',
        'color': '#ffffff',
        'border-radius': 'var(--radius-main)',
        'border': 'none',
        'cursor': 'pointer'
      };
    }

    return base;
  }

  
  private past = signal<string[]>([]);
  private future = signal<string[]>([]);

  saveHistory() {
    const currentState = JSON.stringify(this.pages());
    
    this.past.update(history => [...history, currentState]);
    
    this.future.set([]);
  }

  undo() {
    const pastStates = this.past();
    if (pastStates.length === 0) return;

    const previousStateStr = pastStates[pastStates.length - 1];
    
    const currentStateStr = JSON.stringify(this.pages());
    this.future.update(f => [...f, currentStateStr]);

    this.past.update(h => h.slice(0, -1));

    this.pages.set(JSON.parse(previousStateStr));
    
    this.selectedWidgetId.set(null); 
  }

  redo() {
    const futureStates = this.future();
    if (futureStates.length === 0) return; // Rien à refaire

    const nextStateStr = futureStates[futureStates.length - 1];
    
    const currentStateStr = JSON.stringify(this.pages());
    this.past.update(h => [...h, currentStateStr]);

    this.future.update(f => f.slice(0, -1));

    this.pages.set(JSON.parse(nextStateStr));
    this.selectedWidgetId.set(null);
  }
}