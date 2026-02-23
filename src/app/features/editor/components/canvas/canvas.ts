import { Component, inject } from '@angular/core';
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

  onDragOver(event: DragEvent){
    event.preventDefault();

    if(event.dataTransfer)
      event.dataTransfer.effectAllowed = "move";
  }

onDrop(event: DragEvent) {
  event.preventDefault();
  const data = event.dataTransfer?.getData("widget-item");

  if (data) {
    const draggedData = JSON.parse(data);

    // Si l'objet a un ID, c'est un déplacement vers la racine
    if (draggedData.id) {
      // On utilise moveWidget
      this.editor.moveWidget(draggedData.id, null); // null = racine
    } 
    // Sinon, c'est un nouvel élément de la Toolbox
    else {
      const newWidget = this.editor.createWidgetFromToolboxItem(draggedData);
      this.editor.addWidget(newWidget);
    }
  }
}
}
