import { afterNextRender, Component, computed, DestroyRef, ElementRef, HostListener, inject, signal } from '@angular/core';
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

  offsetX = signal(-4000);
  offsetY = signal(-4000);
  zoom = signal(1);

  /** Espace maintenu : mode « main » pour se déplacer, comme sur Figma */
  spaceHeld = signal(false);
  isPanning = signal(false);

  zoomPercent = computed(() => Math.round(this.zoom() * 100));

  surfaceTransform = computed(() => {
    return `translate(${this.offsetX()}px, ${this.offsetY()}px) scale(${this.zoom()})`;
  });

  labelScale = computed(() => {
    const currentZoom = this.zoom();
    return 1 / currentZoom;
  });

  private animationFrame = 0;
  private animationFallback?: ReturnType<typeof setTimeout>;

  constructor() {
    // Écoute en phase de capture : Espace + clic ou clic molette déplacent la vue
    // même au-dessus d'une page ou d'un bloc (sans les sélectionner ni les glisser).
    const el = this.host.nativeElement;
    const onMouseDown = (event: MouseEvent) => this.onViewportMouseDown(event);
    el.addEventListener('mousedown', onMouseDown, { capture: true });

    const onBlur = () => this.spaceHeld.set(false);
    window.addEventListener('blur', onBlur);

    inject(DestroyRef).onDestroy(() => {
      el.removeEventListener('mousedown', onMouseDown, { capture: true });
      window.removeEventListener('blur', onBlur);
      this.stopAnimation();
    });

    // Au démarrage, on affiche toutes les pages
    afterNextRender(() => this.zoomToFit(false));
  }

  // NAVIGATION (FAÇON FIGMA)
  // - Molette / deux doigts : se déplacer (Maj : horizontalement)
  // - Ctrl (ou ⌘) + molette / pincer : zoomer sous le curseur
  @HostListener("wheel", ["$event"])
  onWheel(event: WheelEvent) {
    event.preventDefault();

    // Certaines souris comptent en lignes plutôt qu'en pixels
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
    const dx = event.deltaX * unit;
    const dy = event.deltaY * unit;

    if (event.ctrlKey || event.metaKey) {
      // Pincement du trackpad = petits deltas, molette = gros deltas : on lisse les deux
      const delta = Math.max(-50, Math.min(50, dy));
      const point = this.toLocal(event.clientX, event.clientY);
      this.zoomAt(this.zoom() * Math.exp(-delta * 0.01), point.x, point.y);
      return;
    }

    this.stopAnimation();
    if (event.shiftKey && !dx) {
      this.offsetX.update(x => x - dy);
    } else {
      this.offsetX.update(x => x - dx);
      this.offsetY.update(y => y - dy);
    }
  }

  private onViewportMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const onBackground = target.classList.contains('viewport') || target.classList.contains('infinite-surface');
    const isPan = event.button === 1 || (event.button === 0 && (this.spaceHeld() || onBackground));
    if (!isPan) return;

    event.preventDefault();
    event.stopPropagation();
    this.stopAnimation();
    this.isPanning.set(true);

    let moved = false;
    const onMove = (e: MouseEvent) => {
      if (e.movementX || e.movementY) moved = true;
      this.offsetX.update(x => x + e.movementX);
      this.offsetY.update(y => y + e.movementY);
    };
    const onUp = () => {
      this.isPanning.set(false);
      // Un simple clic sur le fond désélectionne
      if (!moved && onBackground && !this.spaceHeld()) this.editor.selectWidget(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  @HostListener('window:keyup', ['$event'])
  onKeyup(event: KeyboardEvent) {
    if (event.code === 'Space') this.spaceHeld.set(false);
  }

  // ZOOM
  /** Zoome en gardant fixe le point (x, y) de l'écran (coordonnées dans le canvas). */
  zoomAt(newZoom: number, x: number, y: number) {
    this.stopAnimation();
    const oldZoom = this.zoom();
    const zoom = this.clampZoom(newZoom);
    if (zoom === oldZoom) return;
    const worldX = (x - this.offsetX()) / oldZoom;
    const worldY = (y - this.offsetY()) / oldZoom;
    this.zoom.set(zoom);
    this.offsetX.set(x - worldX * zoom);
    this.offsetY.set(y - worldY * zoom);
  }

  /** Zoom par paliers depuis le centre de l'écran (boutons + / − et Ctrl + / −). */
  zoomStep(direction: 1 | -1) {
    const steps = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
    const current = this.zoom();
    const next = direction > 0
      ? steps.find(s => s > current + 0.001) ?? steps[steps.length - 1]
      : [...steps].reverse().find(s => s < current - 0.001) ?? steps[0];
    this.zoomFromCenter(next);
  }

  zoomTo100() {
    this.zoomFromCenter(1);
  }

  private zoomFromCenter(zoom: number) {
    const { width, height } = this.viewportSize();
    const current = this.zoom();
    const worldX = (width / 2 - this.offsetX()) / current;
    const worldY = (height / 2 - this.offsetY()) / current;
    this.animateTo(zoom, width / 2 - worldX * zoom, height / 2 - worldY * zoom);
  }

  /** Affiche toutes les pages à l'écran (Maj + 1). */
  zoomToFit(animate = true) {
    const boxes = this.editor.pages().map(page => this.pageBounds(page));
    if (!boxes.length) return;
    this.fitBox({
      x: Math.min(...boxes.map(b => b.x)),
      y: Math.min(...boxes.map(b => b.y)),
      right: Math.max(...boxes.map(b => b.x + b.width)),
      bottom: Math.max(...boxes.map(b => b.y + b.height)),
    }, animate, 1);
  }

  /** Cadre la sélection : bloc ou page sélectionné (Maj + 2). */
  zoomToSelection() {
    const widgetId = this.editor.selectedWidgetId();
    const el = widgetId ? document.getElementById(widgetId) : null;
    if (el) {
      const rect = el.getBoundingClientRect();
      const topLeft = this.toWorld(rect.left, rect.top);
      const bottomRight = this.toWorld(rect.right, rect.bottom);
      this.fitBox({ x: topLeft.x, y: topLeft.y, right: bottomRight.x, bottom: bottomRight.y }, true, 2);
      return;
    }
    const page = this.editor.selectedPage();
    if (page) {
      const b = this.pageBounds(page);
      this.fitBox({ x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height }, true, 1);
    } else {
      this.zoomToFit();
    }
  }

  private fitBox(box: { x: number; y: number; right: number; bottom: number }, animate: boolean, maxZoom: number) {
    const { width, height: fullHeight } = this.viewportSize();
    // On laisse la place à la barre d'outils en haut du canvas
    const toolbarHeight = 64;
    const height = fullHeight - toolbarHeight;
    // Marge autour du cadrage, réduite sur les petits écrans
    const padding = Math.min(80, width * 0.08, height * 0.08);
    const boxWidth = Math.max(1, box.right - box.x);
    const boxHeight = Math.max(1, box.bottom - box.y);
    const zoom = this.clampZoom(Math.min((width - padding * 2) / boxWidth, (height - padding * 2) / boxHeight, maxZoom));
    const offsetX = width / 2 - (box.x + boxWidth / 2) * zoom;
    const offsetY = toolbarHeight + height / 2 - (box.y + boxHeight / 2) * zoom;
    if (animate) {
      this.animateTo(zoom, offsetX, offsetY);
    } else {
      this.zoom.set(zoom);
      this.offsetX.set(offsetX);
      this.offsetY.set(offsetY);
    }
  }

  /** Position et taille d'une page sur la surface (étiquette du nom comprise). */
  private pageBounds(page: Page) {
    const el = this.host.nativeElement.querySelector<HTMLElement>(`[data-page-id="${page.id}"]`);
    const width = el?.offsetWidth || page.width || (page.isDesignSystem ? DS_PAGE_WIDTH : 800);
    const height = el?.offsetHeight || page.height || 1000;
    const labelHeight = 45;
    return { x: page.x, y: page.y - labelHeight, width, height: height + labelHeight };
  }

  /** Transition douce vers un zoom et une position. */
  private animateTo(zoom: number, offsetX: number, offsetY: number) {
    this.stopAnimation();
    const from = { zoom: this.zoom(), x: this.offsetX(), y: this.offsetY() };
    const start = performance.now();
    const duration = 220;
    const apply = (ease: number) => {
      this.zoom.set(from.zoom + (zoom - from.zoom) * ease);
      this.offsetX.set(from.x + (offsetX - from.x) * ease);
      this.offsetY.set(from.y + (offsetY - from.y) * ease);
    };
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      apply(1 - Math.pow(1 - t, 3));
      if (t < 1) this.animationFrame = requestAnimationFrame(step);
      else clearTimeout(this.animationFallback);
    };
    this.animationFrame = requestAnimationFrame(step);
    // Si l'onglet est en arrière-plan, le navigateur suspend les animations : on arrive quand même au bon endroit
    this.animationFallback = setTimeout(() => {
      cancelAnimationFrame(this.animationFrame);
      apply(1);
    }, duration + 100);
  }

  /** Interrompt une transition en cours (l'utilisateur reprend la main). */
  private stopAnimation() {
    cancelAnimationFrame(this.animationFrame);
    clearTimeout(this.animationFallback);
  }

  private clampZoom(zoom: number): number {
    return Math.min(4, Math.max(0.05, zoom));
  }

  private viewportSize() {
    const rect = this.host.nativeElement.getBoundingClientRect();
    return { width: rect.width || 800, height: rect.height || 600 };
  }

  /** Coordonnées écran → coordonnées dans le canvas. */
  private toLocal(clientX: number, clientY: number) {
    const rect = this.host.nativeElement.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  /** Coordonnées écran → coordonnées sur la surface infinie. */
  private toWorld(clientX: number, clientY: number) {
    const local = this.toLocal(clientX, clientY);
    return { x: (local.x - this.offsetX()) / this.zoom(), y: (local.y - this.offsetY()) / this.zoom() };
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

    // Navigation et zoom (mêmes raccourcis que Figma)
    if (event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) this.spaceHeld.set(true);
      return;
    }
    if (mod && (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd')) {
      event.preventDefault();
      this.zoomStep(1);
      return;
    }
    if (mod && (event.key === '-' || event.code === 'NumpadSubtract')) {
      event.preventDefault();
      this.zoomStep(-1);
      return;
    }
    if (mod && (event.code === 'Digit0' || event.code === 'Numpad0')) {
      event.preventDefault();
      this.zoomTo100();
      return;
    }
    if (event.shiftKey && !mod && event.code === 'Digit1') {
      event.preventDefault();
      this.zoomToFit();
      return;
    }
    if (event.shiftKey && !mod && event.code === 'Digit2') {
      event.preventDefault();
      this.zoomToSelection();
      return;
    }

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
    // On attend que la page soit affichée pour connaître sa taille
    requestAnimationFrame(() => this.focusPage(page));
  }

  /** Cadre la vue sur une page, avec une transition douce. */
  focusPage(page: Page) {
    const b = this.pageBounds(page);
    this.fitBox({ x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height }, true, 1);
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
