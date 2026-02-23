import { computed, Injectable, signal } from '@angular/core';
import { Widget, WidgetType } from '../../models/widget.model';
import { ToolboxItem } from '../../data/toolbox.data';
import { v4 as uuidv4 } from 'uuid';

export interface Page {
  id: string;
  name: string;
  x: number;
  y: number;
  widgets: Widget[]
}

@Injectable({
  providedIn: 'root',
})
export class EditorService {

  pages = signal<Page[]>([
    { id: 'page-1', name: 'Home Page', x: 4100, y: 4100, widgets: [] }
  ])

  selectedWidgetId = signal<string | null>(null);
  selectedPageId = signal<string | null>('page-1');

  selectedWidget = computed(() => {
    const id = this.selectedWidgetId();
    if (!id) return null;
    
    for (const page of this.pages()) {
      const found = this.findWidgetRecursive(page.widgets, id);
      if (found) return found;
    }
    return null;
  });


  createWidgetFromToolboxItem(item: ToolboxItem): Widget {
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


  addWidget(widget: Widget, parentId: string | null = null, pageId: string | null = null) {
    const targetPageId = pageId || this.selectedPageId();
    
    this.pages.update(currentPages => {
      return currentPages.map(page => {
        if (page.id !== targetPageId) return page;

        // Si on ajoute à la racine de la page
        if (!parentId) {
          return { ...page, widgets: [...page.widgets, widget] };
        }
        
        // Sinon, on cherche récursivement dans les containers de la page
        const newWidgets = [...page.widgets];
        this.insertInParentRecursive(newWidgets, parentId, widget);
        return { ...page, widgets: newWidgets };
      });
    });
  }


  moveWidget(widgetId: string, targetParentId: string | null, targetPageId: string) {
    this.pages.update(currentPages => {
      let draggedWidget: Widget | null = null;
      
      // On nettoie toutes les pages pour être sûr de supprimer l'ancienne instance
      const cleanedPages = currentPages.map(page => {
        const found = this.findWidgetRecursive(page.widgets, widgetId);
        if (found) draggedWidget = { ...found }; // On garde une copie
        return { ...page, widgets: this.removeRecursive(page.widgets, widgetId) };
      });

      if (!draggedWidget) return currentPages;

      // 2. L'insérer dans la destination
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
      case 'text': return 'Double-cliquez pour éditer';
      case 'action': return 'Bouton';
      default: return '';
    }
  }

  private getDefaultStyles(item: ToolboxItem): Record<string, string> {
    const base = { padding: '10px', margin: '5px' };
    if (item.type === 'container') {
      return { ...base, 'min-height': '100px', border: '1px dashed #ccc', width: '100%' };
    }
    return base;
  }

}
