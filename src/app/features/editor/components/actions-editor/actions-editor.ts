import { Component, computed, inject, input } from '@angular/core';
import { ActionKind, ValidationRule, Widget, WidgetAction } from '../../../../../core/models/widget.model';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { ACTION_KINDS, actionsOf, MAX_ACTIONS, TARGETED_KINDS, VALIDATION_RULES } from '../../../../../core/utils/interactions';

export interface TargetOption {
  id: string;
  label: string;
  type: string;
}

/** Interactions d'un bloc (« quand on clique ») et sa visibilité au départ. */
@Component({
  selector: 'app-actions-editor',
  templateUrl: './actions-editor.html',
  styleUrl: './actions-editor.css',
})
export class ActionsEditor {
  widget = input.required<Widget>();

  private editor = inject(EditorService);

  readonly kinds = ACTION_KINDS;
  readonly rules = VALIDATION_RULES;
  readonly maxActions = MAX_ACTIONS;

  actions = computed(() => actionsOf(this.widget()));
  hidden = computed(() => this.widget().config?.['hidden'] === true);

  /** Blocs de la même page, dans l'ordre de l'arbre, avec un retrait selon la profondeur. */
  targets = computed<TargetOption[]>(() => {
    const pageId = this.editor.findLocation(this.widget().id)?.pageId;
    const page = this.editor.pages().find(p => p.id === pageId);
    const options: TargetOption[] = [];
    const walk = (list: Widget[], depth: number) => list.forEach(w => {
      const text = (w.content ?? '').trim();
      const excerpt = text ? ` « ${text.length > 28 ? text.slice(0, 27) + '…' : text} »` : '';
      const self = w.id === this.widget().id ? ' (ce bloc)' : '';
      options.push({ id: w.id, type: w.type, label: '  '.repeat(depth) + w.name + excerpt + self });
      walk(w.children ?? [], depth + 1);
    });
    walk(page?.widgets ?? [], 0);
    return options;
  });

  /** Seuls les champs de formulaire peuvent être vérifiés. */
  inputTargets = computed(() => this.targets().filter(t => t.type === 'input'));

  needsTarget(kind: ActionKind): boolean {
    return TARGETED_KINDS.includes(kind);
  }

  targetsFor(action: WidgetAction): TargetOption[] {
    return action.do === 'validate' ? this.inputTargets() : this.targets();
  }

  /** Cible choisie mais supprimée depuis, ou pas encore choisie. */
  targetProblem(action: WidgetAction): string | null {
    if (!this.needsTarget(action.do)) return null;
    if (!action.target) return action.do === 'validate' ? 'Choisissez le champ à vérifier.' : 'Choisissez un bloc.';
    return this.targets().some(t => t.id === action.target) ? null : "Ce bloc n'existe plus : choisissez-en un autre.";
  }

  add() {
    if (this.actions().length >= MAX_ACTIONS) return;
    this.save([...this.actions(), { on: 'click', do: 'toast', message: 'Merci, c’est envoyé !' }], false);
  }

  remove(index: number) {
    this.save(this.actions().filter((_, i) => i !== index), false);
  }

  move(index: number, delta: -1 | 1) {
    const list = [...this.actions()];
    const to = index + delta;
    if (to < 0 || to >= list.length) return;
    [list[index], list[to]] = [list[to], list[index]];
    this.save(list, false);
  }

  /** Changer de type d'action repart des champs utiles à ce type. */
  setKind(index: number, kind: ActionKind) {
    const previous = this.actions()[index];
    const next: WidgetAction = { on: 'click', do: kind };
    if (this.needsTarget(kind)) {
      const candidates = kind === 'validate' ? this.inputTargets() : this.targets();
      next.target = candidates.some(t => t.id === previous.target) ? previous.target : candidates[0]?.id;
    }
    if (kind === 'validate') next.rule = 'required';
    if (kind === 'toast') next.message = previous.message || 'Merci, c’est envoyé !';
    if (kind === 'link') next.url = 'https://';
    this.patch(index, next, true);
  }

  setTarget(index: number, target: string) {
    this.patch(index, { ...this.actions()[index], target });
  }

  setRule(index: number, rule: ValidationRule) {
    this.patch(index, { ...this.actions()[index], rule });
  }

  setMessage(index: number, message: string) {
    const action: WidgetAction = { ...this.actions()[index], message };
    if (!message) delete action.message;
    this.patch(index, action);
  }

  setUrl(index: number, url: string) {
    this.patch(index, { ...this.actions()[index], url });
  }

  setNewTab(index: number, newTab: boolean) {
    const action: WidgetAction = { ...this.actions()[index], newTab };
    if (!newTab) delete action.newTab;
    this.patch(index, action);
  }

  setHidden(hidden: boolean) {
    this.editor.setWidgetConfig(this.widget().id, 'hidden', hidden || undefined);
  }

  private patch(index: number, action: WidgetAction, separateStep = false) {
    this.save(this.actions().map((a, i) => (i === index ? action : a)), !separateStep);
  }

  /** @param merge regroupe la saisie (texte, URL) en une seule étape d'historique */
  private save(actions: WidgetAction[], merge: boolean) {
    const id = this.widget().id;
    if (merge) {
      this.editor.setWidgetConfig(id, 'actions', actions);
    } else {
      this.editor.updateWidget(id, { config: { ...this.widget().config, actions } });
    }
  }
}
