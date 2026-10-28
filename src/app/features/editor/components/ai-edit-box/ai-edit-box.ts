import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AiEditor } from '../../../../../core/services/AiService/ai-editor';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';

/** Consignes proposées selon le type de bloc sélectionné. */
const SUGGESTIONS: Record<string, string[]> = {
  container: ['Rends cette section plus audacieuse', 'Plus aérée', 'Passe en deux colonnes', 'Ajoute une photo',
    "Au clic sur le bouton : vérifie l'e-mail, affiche un message de confirmation et masque le formulaire"],
  text: ['Plus court et plus percutant', 'Plus grand et plus marqué', 'Ton plus chaleureux'],
  action: ['Libellé plus engageant', 'Bouton plus visible', 'Au clic, affiche « Merci ! » en message'],
  input: ['Libellé plus clair', 'Champ plus grand'],
  media: ['Format panoramique', 'Coins plus arrondis'],
};

@Component({
  selector: 'app-ai-edit-box',
  imports: [LucideAngularModule],
  templateUrl: './ai-edit-box.html',
  styleUrl: './ai-edit-box.css',
})
export class AiEditBox {
  widgetId = input.required<string>();
  widgetType = input.required<string>();

  private aiEditor = inject(AiEditor);
  private editor = inject(EditorService);

  instruction = signal('');
  error = signal<string | null>(null);
  done = signal(false);

  busy = computed(() => this.aiEditor.busyWidgetId() === this.widgetId());
  /** Une autre modification est en cours ailleurs : on évite d'en lancer deux à la fois */
  otherBusy = computed(() => !!this.aiEditor.busyWidgetId() && !this.busy());
  suggestions = computed(() => SUGGESTIONS[this.widgetType()] ?? []);

  constructor() {
    // Nouveau bloc sélectionné : on repart d'une zone vide
    effect(() => {
      this.widgetId();
      untracked(() => {
        this.instruction.set('');
        this.error.set(null);
        this.done.set(false);
      });
    });
  }

  useSuggestion(text: string) {
    this.instruction.set(text);
    this.submit();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey || !event.shiftKey)) {
      event.preventDefault();
      this.submit();
    }
  }

  async submit() {
    const instruction = this.instruction().trim();
    if (!instruction || this.busy() || this.otherBusy()) return;
    const id = this.widgetId();
    this.error.set(null);
    this.done.set(false);
    try {
      await this.aiEditor.edit(id, instruction);
      // L'utilisateur a pu sélectionner un autre bloc entre-temps
      if (this.widgetId() === id) {
        this.done.set(true);
        this.instruction.set('');
      }
    } catch (e) {
      if (this.widgetId() === id) this.error.set(e instanceof Error ? e.message : 'La modification a échoué.');
    }
  }

  undo() {
    this.editor.undo();
    this.done.set(false);
  }
}
