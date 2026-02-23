import { computed, Injectable, signal } from '@angular/core';
import { Widget, WidgetType } from '../../models/widget.model';
import { ToolboxItem } from '../../data/toolbox.data';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class EditorService {

  //Le contenu de notre page
  project = signal<Widget[]>([]);

  //Le composant sélectionné
  selectedWidgetId = signal<string | null>(null);

  selectedWidget = computed(() => {
    const id = this.selectedWidgetId();
    if (!id)
      return null;
    return this.findWidgetRecursive(this.project(), id);
  })

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
    }
  }

  updateProject(newWidgets: Widget[]) {
    this.project.set(newWidgets);
  }

  private getDefaultContent(item: ToolboxItem): string {
    switch (item.type) {
      case 'text': return 'Double-cliquez pour éditer le text';
      case 'action': return 'Mon bouton';
      default: return '';
    }
  }

  private getDefaultStyles(item: ToolboxItem): Record<string, string> {
    const baseStyles = {
      'border': '1px solid transparent'
    }

    if (item.type === 'container') {
      return {
        ...baseStyles,
        'min-height': '100px',
        'width': '100%',
        'display': 'block',
        'border': '1px dashed #ccc'
      }
    }

    if (item.element === 'button') {
      return {
        ...baseStyles,
        'background-color': '#3b82f6',
        'color': 'white',
        'border-radius': '6px'
      }
    }

    return baseStyles;
  }

  addWidget(widget: Widget, parentId: string | null = null, index?: number) {
    this.project.update(currentProject => {
      const newProject = [...currentProject];

      if (!parentId) {
        if (index !== undefined)
          //insère à index
          newProject.splice(index, 0, widget);
        else
          newProject.push(widget);//à la fin
      }
      else
        this.insertInParentRecursive(newProject, parentId, widget, index) //Cherche le parent et l'ajoute dedans
      return newProject;
    })

  }

  moveWidget(widgetId: string, targetParentId: string | null = null) {
    this.project.update(currentProject => {
      const widgetToMove = this.findWidgetRecursive(currentProject, widgetId);
      if (!widgetToMove) return currentProject;

      const widgetCopy = { ...widgetToMove };
      // On nettoie l'ancien emplacement
      const cleanedProject = this.removeRecursive(currentProject, widgetId);

      // Si targetParentId est null, on pousse à la racine du projet
      if (!targetParentId) {
        return [...cleanedProject, widgetCopy];
      } else {
        // Sinon on insère dans le container cible
        this.insertInParentRecursive(cleanedProject, targetParentId, widgetCopy);
        return cleanedProject;
      }
    });
  }

  //Supprime son widget par son id
  removeWidget(id: string) {
    this.project.update(currentProject => {
      const updated = this.removeRecursive(currentProject, id);
      if (this.selectedWidgetId() === id)
        this.selectedWidgetId.set(null);
      return updated;
    })
  }

  private findWidgetRecursive(widgets: Widget[], id: string): Widget | null {
    for (const w of widgets) {
      if (w.id === id)
        return w;
      else if (w.children) {
        const found = this.findWidgetRecursive(w.children, id);
        if (found)
          return found;
      }
    }
    return null;
  }

  private insertInParentRecursive(widgets: Widget[], parentId: string, newWidget: Widget, index?: number) {
    for (const w of widgets) {
      if (w.id === parentId && w.children) {
        if (index !== undefined) {
          w.children.splice(index, 0, newWidget);
        } else {
          w.children.push(newWidget);
        }
        return true;
      }
      if (w.children && this.insertInParentRecursive(w.children, parentId, newWidget, index)) {
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

}
