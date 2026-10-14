import { Component, computed, inject, signal } from '@angular/core';
import { BLUEPRINT_CATEGORY, ToolboxCategory, ToolboxItem, WIDGET_CATALOG } from '../../../../../core/data/toolbox.data';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { DRAG_DATA_TYPE } from '../widget-renderer/widget-renderer';
import { Layers } from '../layers/layers';

/** Minuscules sans accents, pour une recherche tolérante. */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

@Component({
  selector: 'app-toolbox',
  imports: [CommonModule, LucideAngularModule, Layers],
  templateUrl: './toolbox.html',
  styleUrl: './toolbox.css',
})
export class Toolbox {
  editor = inject(EditorService);

  readonly blueprintCategory = BLUEPRINT_CATEGORY;

  tab = signal<'add' | 'layers'>('add');
  search = signal('');
  collapsed = signal<Set<string>>(new Set());

  categories = computed<ToolboxCategory[]>(() => {
    const query = normalize(this.search().trim());
    if (!query) return WIDGET_CATALOG;
    return WIDGET_CATALOG
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          normalize(`${item.label} ${item.description ?? ''} ${item.keywords ?? ''} ${cat.name}`).includes(query)
        ),
      }))
      .filter(cat => cat.items.length > 0);
  });

  /** Où l'élément sera ajouté en cas de clic, pour guider l'utilisateur. */
  addTargetHint = computed(() => {
    const selected = this.editor.selectedWidget();
    if (selected?.type === 'container') return `dans « ${selected.name} »`;
    if (selected) return `après « ${selected.name} »`;
    const page = this.editor.selectedPage();
    return page && !page.isDesignSystem ? `à la fin de « ${page.name} »` : 'à la fin de la page';
  });

  isCollapsed(name: string): boolean {
    return !this.search() && this.collapsed().has(name);
  }

  toggleCategory(name: string) {
    this.collapsed.update(set => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  add(item: ToolboxItem) {
    this.editor.addFromToolbox(item);
  }

  onDragStart(event: DragEvent, item: ToolboxItem){
    event.dataTransfer?.setData(DRAG_DATA_TYPE, JSON.stringify(item));

    if(event.dataTransfer){
      event.dataTransfer.effectAllowed = 'move'
    }
  }
}
