import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { Widget } from '../../../../../core/models/widget.model';
import { Page } from '../../../../../core/models/page.model';

const TYPE_ICONS: Record<string, string> = {
  container: 'box',
  text: 'type',
  action: 'mouse-pointer-2',
  input: 'text-cursor-input',
  media: 'image',
};

@Component({
  selector: 'app-layers',
  imports: [LucideAngularModule, NgTemplateOutlet],
  templateUrl: './layers.html',
  styleUrl: './layers.css',
})
export class Layers {
  editor = inject(EditorService);

  pages = computed(() => this.editor.pages().filter(p => !p.isDesignSystem));

  /** Blocs repliés (on garde l'ouverture par défaut pour tout voir d'un coup d'œil) */
  collapsed = signal<Set<string>>(new Set());

  /** Parents du bloc sélectionné : toujours dépliés pour qu'on le voie */
  private selectedAncestors = computed(() => {
    const id = this.editor.selectedWidgetId();
    if (!id) return new Set<string>();
    return new Set(this.editor.getPath(id).slice(0, -1).map(w => w.id));
  });

  icon(widget: Widget): string {
    if (widget.element === 'img') return 'image';
    if (widget.element === 'video') return 'video';
    if (widget.element === 'a') return 'link';
    if (widget.element === 'h1') return 'heading-1';
    if (widget.element === 'h2') return 'heading-2';
    return TYPE_ICONS[widget.type] ?? 'box';
  }

  /** Aperçu du texte pour reconnaître un bloc facilement. */
  preview(widget: Widget): string {
    const text = widget.content?.trim();
    if (!text) return '';
    return text.length > 28 ? text.slice(0, 28) + '…' : text;
  }

  isOpen(id: string): boolean {
    return !this.collapsed().has(id) || this.selectedAncestors().has(id);
  }

  toggle(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.collapsed.update(set => {
      const next = new Set(set);
      if (next.has(id) && !this.selectedAncestors().has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  select(widget: Widget) {
    this.editor.selectWidget(widget.id);
  }

  selectPage(page: Page) {
    this.editor.selectWidget(null);
    this.editor.selectedPageId.set(page.id);
  }

  remove(event: MouseEvent, widget: Widget) {
    event.stopPropagation();
    this.editor.removeWidget(widget.id);
  }

  hover(widget: Widget | null) {
    this.editor.hoveredWidgetId.set(widget?.id ?? null);
  }
}
