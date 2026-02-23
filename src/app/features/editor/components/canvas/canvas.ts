import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { WidgetRenderer } from '../widget-renderer/widget-renderer';
import { ToolboxItem } from '../../../../../core/data/toolbox.data';

@Component({
  selector: 'app-canvas',
  imports: [WidgetRenderer],
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
  onWheel(event: WheelEvent){
    event.preventDefault();
    const zoomSpeed = 0.001;
    const newZoom = this.zoom() - event.deltaY * zoomSpeed;
    // On limite le zoom entre 0.1 (10%) et 3 (300%)
    this.zoom.set(Math.min(Math.max(0.1, newZoom), 3));
  }

  startDragging(event: MouseEvent){
    if(event.button === 1 || event.shiftKey){
      this.isDragging = true;
      event.preventDefault();
    }
  }

  @HostListener("window:mousemove", ["$event"])
  onMouseMove(event: MouseEvent){
    if(this.isDragging){
      this.offsetX.update(x => x + event.movementX);
      this.offsetY.update(y => y + event.movementY);
    }
  }

  @HostListener("window:mouseup")
  stopDragging(){
    this.isDragging = false;
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
