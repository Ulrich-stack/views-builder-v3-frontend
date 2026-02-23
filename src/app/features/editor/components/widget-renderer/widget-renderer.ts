import { Component, inject, input } from '@angular/core';
import { Widget } from '../../../../../core/models/widget.model';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-widget-renderer',
  imports: [CommonModule, WidgetRenderer],
  templateUrl: './widget-renderer.html',
  styleUrl: './widget-renderer.css',
})
export class WidgetRenderer {
  widget = input.required<Widget>();
  pageId = input.required<string>();

  editor = inject(EditorService);

  selectWidget(event: MouseEvent) {
    event.stopPropagation();
    this.editor.selectedWidgetId.set(this.widget().id);
  }

  onDragStart(event: DragEvent) {
    event.stopPropagation();
    event.dataTransfer?.setData("widget-item", JSON.stringify(this.widget()))

    if (event.dataTransfer)
      event.dataTransfer.effectAllowed = "move";
  }

  onDragOver(event: DragEvent) {
    if (this.widget().type === "container") {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  onDrop(event: DragEvent) {
    if (this.widget().type === 'container') {
      event.preventDefault();
      event.stopPropagation();

      const data = event.dataTransfer?.getData("widget-item");
      if (data) {
        const draggedData = JSON.parse(data);
        //Pour ne pas se lâcher sur soi-même
        if (draggedData.id === this.widget().id) return;

        if (draggedData.id) {
          // Déplacement
          this.editor.moveWidget(draggedData.id, this.widget().id, this.pageId());
        } else {
          // Création
          const newWidget = this.editor.createWidgetFromToolboxItem(draggedData);
          this.editor.addWidget(newWidget, this.widget().id, this.pageId());
        }
      }
    }
  }
}
