import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { WidgetRenderer } from '../widget-renderer/widget-renderer';
import { ToolboxItem } from '../../../../../core/data/toolbox.data';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-canvas',
  imports: [CommonModule, FormsModule, WidgetRenderer],
  templateUrl: './canvas.html',
  styleUrl: './canvas.css',
})
export class Canvas {
  editor = inject(EditorService);

  offsetX = signal(-4000); // Pour centrer au milieu de l'écran infini
  offsetY = signal(-4000);

  zoom = signal(1);

  isDragging = false;

  // Calcul dynamique du style de la surface
  surfaceTransform = computed(() => {
    return `translate(${this.offsetX()}px, ${this.offsetY()}px) scale(${this.zoom()})`;
  });

  @HostListener("wheel", ["$event"])
  onWheel(event: WheelEvent) {
    event.preventDefault();

    const zoomSpeed = 0.01;
    const delta = -event.deltaY;
    const oldZoom = this.zoom();

    const newZoom = Math.min(Math.max(0.1, oldZoom + delta * zoomSpeed * oldZoom), 3);

    if (oldZoom === newZoom) return;

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    const worldX = (mouseX - this.offsetX()) / oldZoom;
    const worldY = (mouseY - this.offsetY()) / oldZoom;

    this.zoom.set(newZoom);

    this.offsetX.set(mouseX - worldX * newZoom);
    this.offsetY.set(mouseY - worldY * newZoom);
  }

startDragging(event: MouseEvent) {
  // On ne déclenche le "Pan" (déplacement canvas) QUE si :
  // - On utilise le clic milieu (molette)
  // - OU on utilise le clic gauche mais avec la touche SHIFT
  const isPanCommand = event.button === 1 || (event.button === 0 && event.shiftKey);

  if (isPanCommand) {
    this.isDragging = true;
    document.body.style.cursor = 'grabbing';
    event.preventDefault();
    event.stopPropagation();
  }
}

  @HostListener("window:mousemove", ["$event"])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      this.offsetX.update(x => x + event.movementX);
      this.offsetY.update(y => y + event.movementY);
    }
  }

  @HostListener("window:mouseup")
  stopDragging() {
    this.isDragging = false;
    document.body.style.cursor = 'default';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();

    if (event.dataTransfer)
      event.dataTransfer.effectAllowed = "move";
  }

  onDrop(event: DragEvent, pageId: string) {
    event.preventDefault();
    const data = event.dataTransfer?.getData("widget-item");

    if (data) {
      const draggedData = JSON.parse(data);

      // Si l'objet a un ID, c'est un déplacement vers la racine
      if (draggedData.id) {
        // On utilise moveWidget
        this.editor.moveWidget(draggedData.id, null, pageId); // null = racine
      }
      // Sinon, c'est un nouvel élément de la Toolbox
      else {
        const newWidget = this.editor.createWidgetFromToolboxItem(draggedData);
        this.editor.addWidget(newWidget, null, pageId);
      }
    }
  }
}
