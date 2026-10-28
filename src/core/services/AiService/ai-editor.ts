import { inject, Injectable, signal } from '@angular/core';
import { AiService } from './ai-service';
import { DEFAULT_PAGE_WIDTH, EditorService } from '../EditorService/editor-service';
import { presetNameOf } from '../../data/themes.data';
import { Widget } from '../../models/widget.model';
import { actionsOf } from '../../utils/interactions';

/**
 * Copie d'un bloc telle qu'envoyée à l'IA : les identifiants internes sont remplacés par des repères
 * courts (« ref ») que les actions utilisent comme cibles. `refs` reçoit la correspondance repère → identifiant.
 */
export function toBlueprint(widget: Widget, refs: Record<string, string> = {}): any {
  const refOf = new Map<string, string>();
  const number = (w: Widget) => {
    const ref = 'b' + (refOf.size + 1);
    refOf.set(w.id, ref);
    refs[ref] = w.id;
    w.children?.forEach(number);
  };
  number(widget);

  const convert = (w: Widget): any => {
    const { id, children, ...rest } = w;
    const actions = actionsOf(w);
    const config = actions.length
      ? { ...w.config, actions: actions.map(a => (a.target ? { ...a, target: refOf.get(a.target) ?? a.target } : a)) }
      : w.config;
    const bp = { ref: refOf.get(id), ...rest, config };
    return children ? { ...bp, children: children.map(convert) } : bp;
  };
  return convert(widget);
}

/** Modification d'un bloc existant par l'IA (« Modifier avec l'IA »). */
@Injectable({
  providedIn: 'root',
})
export class AiEditor {
  private ai = inject(AiService);
  private editor = inject(EditorService);

  /** Bloc en cours de modification, pour afficher l'attente au bon endroit */
  busyWidgetId = signal<string | null>(null);

  /** Modifie le bloc selon la consigne ; le résultat remplace le bloc en une étape annulable. */
  async edit(widgetId: string, instruction: string): Promise<void> {
    const widget = this.findWidget(widgetId);
    if (!widget) throw new Error("Ce bloc n'existe plus.");
    const pageId = this.editor.findLocation(widgetId)?.pageId;
    const page = this.editor.pages().find(p => p.id === pageId);

    this.busyWidgetId.set(widgetId);
    try {
      const refs: Record<string, string> = {};
      const edited = await this.ai.edit(
        instruction,
        toBlueprint(widget, refs),
        presetNameOf(this.editor.designSystem()),
        page?.width ?? DEFAULT_PAGE_WIDTH
      );
      if (!this.editor.replaceWithBlueprint(widgetId, edited, refs)) {
        throw new Error('Le bloc a été supprimé pendant la modification.');
      }
    } finally {
      this.busyWidgetId.set(null);
    }
  }

  private findWidget(id: string): Widget | null {
    const path = this.editor.getPath(id);
    return path.length ? path[path.length - 1] : null;
  }
}
