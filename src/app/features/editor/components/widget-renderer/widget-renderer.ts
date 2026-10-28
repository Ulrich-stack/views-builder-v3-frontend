import { Component, computed, ElementRef, inject, input, signal } from '@angular/core';
import { Widget } from '../../../../../core/models/widget.model';
import { DropPosition, EditorService } from '../../../../../core/services/EditorService/editor-service';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { iconData } from '../../../../../core/data/icons.data';

export const DRAG_DATA_TYPE = 'widget-item';

@Component({
  selector: 'app-widget-renderer',
  imports: [CommonModule, WidgetRenderer, LucideAngularModule],
  templateUrl: './widget-renderer.html',
  styleUrl: './widget-renderer.css',
})
export class WidgetRenderer {
  widget = input.required<Widget>();
  pageId = input.required<string>();

  editor = inject(EditorService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  editing = signal(false);

  isEditable = computed(() => ['text', 'action'].includes(this.widget().type));

  /** Dessin de l'icône choisie (bloc média « icon »), ou d'une icône par défaut si le nom est inconnu. */
  icon = computed(() => iconData(this.widget().config?.['icon']));

  /** Champ de formulaire dont le bloc porte déjà son propre cadre (bordure ou fond) : le champ intérieur s'efface. */
  hasOwnFieldFrame = computed(() => {
    const w = this.widget();
    return w.type === 'input' && Object.keys(w.styles).some(k => k.startsWith('border') || k.startsWith('background'));
  });

  dropPosition = computed<DropPosition | null>(() => {
    const target = this.editor.dropTarget();
    return target?.widgetId === this.widget().id ? target.position : null;
  });

  selectWidget(event: MouseEvent) {
    event.stopPropagation();
    this.editor.selectWidget(this.widget().id);
  }

  // ÉDITION DU TEXTE DIRECTEMENT SUR LA PAGE
  startEditing(event: MouseEvent) {
    if (!this.isEditable()) return;
    event.stopPropagation();
    this.editor.selectWidget(this.widget().id);
    this.editing.set(true);

    setTimeout(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>('[data-editable]');
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }

  onEditKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    }
    if (event.key === 'Escape') {
      (event.target as HTMLElement).textContent = this.widget().content ?? '';
      this.editing.set(false);
    }
  }

  finishEditing(event: FocusEvent) {
    if (!this.editing()) return;
    this.editing.set(false);
    const text = (event.target as HTMLElement).innerText.trim();
    if (text !== (this.widget().content ?? '')) {
      this.editor.updateWidget(this.widget().id, { content: text });
    }
  }

  // GLISSER-DÉPOSER
  onDragStart(event: DragEvent) {
    event.stopPropagation();
    event.dataTransfer?.setData(DRAG_DATA_TYPE, JSON.stringify({ id: this.widget().id }));

    if (event.dataTransfer)
      event.dataTransfer.effectAllowed = "move";
  }

  onDragEnd() {
    this.editor.dropTarget.set(null);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const position = this.computeDropPosition(event);
    const current = this.editor.dropTarget();
    if (current?.widgetId !== this.widget().id || current.position !== position) {
      this.editor.dropTarget.set({ widgetId: this.widget().id, position });
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const target = this.editor.dropTarget() ?? { widgetId: this.widget().id, position: this.computeDropPosition(event) };
    this.editor.dropTarget.set(null);

    const data = event.dataTransfer?.getData(DRAG_DATA_TYPE);
    if (data) this.editor.dropRelativeTo(target, JSON.parse(data));
  }

  /** Haut du bloc → avant, bas → après, milieu d'un conteneur → dedans. */
  private computeDropPosition(event: DragEvent): DropPosition {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;

    if (this.widget().type === 'container') {
      if (ratio < 0.2) return 'before';
      if (ratio > 0.8) return 'after';
      return 'inside';
    }
    return ratio < 0.5 ? 'before' : 'after';
  }
}
