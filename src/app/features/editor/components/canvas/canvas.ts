import { Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { DS_PAGE_WIDTH, EditorService } from '../../../../../core/services/EditorService/editor-service';
import { DesignSystemPanel } from '../design-system/design-system';
import { DRAG_DATA_TYPE, WidgetRenderer } from '../widget-renderer/widget-renderer';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Page } from '../../../../../core/models/page.model';

@Component({
  selector: 'app-canvas',
  imports: [CommonModule, FormsModule, WidgetRenderer, DesignSystemPanel],
  templateUrl: './canvas.html',
  styleUrl: './canvas.css',
})
export class Canvas {
  editor = inject(EditorService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly dsPageWidth = DS_PAGE_WIDTH;

  offsetX = signal(-4000); // Pour centrer au milieu de l'écran infini
  offsetY = signal(-4000);

  zoom = signal(1);

  isDragging = false;

  surfaceTransform = computed(() => {
    return `translate(${this.offsetX()}px, ${this.offsetY()}px) scale(${this.zoom()})`;
  });

  labelScale = computed(() => {
    const currentZoom = this.zoom();
    return 1 / currentZoom;
  });

  @HostListener("wheel", ["$event"])
  onWheel(event: WheelEvent) {
    event.preventDefault();

    const zoomSpeed = 0.01;
    const delta = -event.deltaY;
    const oldZoom = this.zoom();

    const newZoom = Math.min(Math.max(0.1, oldZoom + delta * zoomSpeed * oldZoom), 3);

    if (oldZoom === newZoom) return;

    // Position de la souris relative au canvas (et non à la fenêtre, à cause de la sidebar)
    const rect = this.host.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldX = (mouseX - this.offsetX()) / oldZoom;
    const worldY = (mouseY - this.offsetY()) / oldZoom;

    this.zoom.set(newZoom);

    this.offsetX.set(mouseX - worldX * newZoom);
    this.offsetY.set(mouseY - worldY * newZoom);
  }

  // RACCOURCIS CLAVIER
  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isTyping = !!target && (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
    );
    if (isTyping) return;

    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const selected = this.editor.selectedWidgetId();

    if (mod && key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.editor.undo();
    } else if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) {
      event.preventDefault();
      this.editor.redo();
    } else if (mod && key === 'd' && selected) {
      event.preventDefault();
      this.editor.duplicateWidget(selected);
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
      event.preventDefault();
      this.editor.removeWidget(selected);
    } else if (event.key === 'Escape') {
      this.editor.selectWidget(null);
    }
  }

  // PAGES
  addPage() {
    const page = this.editor.addPage();
    this.focusPage(page);
  }

  /** Centre la vue sur une page. */
  focusPage(page: Page) {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const width = page.width || 800;
    this.offsetX.set(rect.width / 2 - (page.x + width / 2) * this.zoom());
    this.offsetY.set(120 - page.y * this.zoom());
  }

  selectPage(page: Page) {
    this.editor.selectWidget(null);
    this.editor.selectedPageId.set(page.id);
  }

  renamePage(page: Page, name: string) {
    this.editor.updatePage(page.id, { name }, 'rename:' + page.id);
  }

  startPageDrag(event: MouseEvent, page: Page) {
    // Empêche la surface infinie de bouger en même temps
    event.stopPropagation();
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const initialPageX = page.x;
    const initialPageY = page.y;
    const gestureKey = `page-move:${page.id}:${Date.now()}`;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Calcul de la distance parcourue ajustée par le zoom
      const deltaX = (moveEvent.clientX - startX) / this.zoom();
      const deltaY = (moveEvent.clientY - startY) / this.zoom();

      // Mise à jour de la position de la page
      this.editor.updatePage(page.id, { x: initialPageX + deltaX, y: initialPageY + deltaY }, gestureKey);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  startResizing(event: MouseEvent, page: Page) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = page.width || 800;
    const startHeight = page.height || 1000;
    const gestureKey = `page-resize:${page.id}:${Date.now()}`;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // On divise par le zoom pour que le redimensionnement soit fidèle au curseur
      const deltaX = (moveEvent.clientX - startX) / this.zoom();
      const deltaY = (moveEvent.clientY - startY) / this.zoom();

      this.editor.updatePage(page.id, {
        width: Math.max(200, startWidth + deltaX),
        height: Math.max(200, startHeight + deltaY)
      }, gestureKey);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
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

  // GLISSER-DÉPOSER SUR LA PAGE (zone vide → ajout à la fin)
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.editor.dropTarget.set(null);

    if (event.dataTransfer)
      event.dataTransfer.effectAllowed = "move";
  }

  @HostListener('window:dragend')
  @HostListener('window:drop')
  clearDropTarget() {
    this.editor.dropTarget.set(null);
  }

  onDrop(event: DragEvent, pageId: string) {
    event.preventDefault();
    this.editor.dropTarget.set(null);
    const data = event.dataTransfer?.getData(DRAG_DATA_TYPE);

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
        this.editor.selectWidget(newWidget.id);
      }
    }
  }
}
