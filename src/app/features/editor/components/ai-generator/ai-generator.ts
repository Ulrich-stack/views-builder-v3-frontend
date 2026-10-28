import { Component, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DEFAULT_PAGE_WIDTH, EditorService } from '../../../../../core/services/EditorService/editor-service';
import { AiPalette, AiService, ReferenceImage } from '../../../../../core/services/AiService/ai-service';
import { AiEditor } from '../../../../../core/services/AiService/ai-editor';
import { generatePalette, personalityOf, presetNameOf, strengthenContrast } from '../../../../../core/data/themes.data';
import { readableOn } from '../../../../../core/utils/color';
import { auditReadability, groupIssues, ReadabilityGroup, ReadabilityIssue } from '../../../../../core/utils/readability-audit';

const MODE_LABELS: Record<string, string> = {
  persuader: 'page vitrine',
  operer: 'page pratique',
  lire: 'page de lecture',
  experience: 'page immersive',
};

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Au-delà, corriger bloc par bloc avec l'IA serait trop long : mieux vaut agir sur le thème
const MAX_AI_FIXES = 5;

interface AttachedImage extends ReferenceImage {
  name: string;
  /** data: URL pour la miniature */
  preview: string;
}

@Component({
  selector: 'app-ai-generator',
  imports: [LucideAngularModule],
  templateUrl: './ai-generator.html',
  styleUrl: './ai-generator.css',
})
export class AiGenerator {
  editor = inject(EditorService);
  aiEditor = inject(AiEditor);
  private ai = inject(AiService);

  readonly examples = [
    'Page d\'accueil pour un salon de thé à Lyon',
    'Formulaire de réservation pour un cours de yoga',
    'Portfolio d\'une photographe de mariage',
  ];

  prompt = signal('');
  /** L'IA choisit les couleurs de la page ; le thème est mis à jour à la fin de la génération */
  chooseColors = signal(true);
  image = signal<AttachedImage | null>(null);
  loading = signal(false);
  /** Nombre de sections déjà arrivées pendant la génération en direct */
  received = signal(0);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  issues = signal<ReadabilityIssue[] | null>(null);
  groups = computed(() => groupIssues(this.issues() ?? []));
  /** Groupe en cours de correction (clé couleur|fond) */
  fixingKey = signal<string | null>(null);
  auditError = signal<string | null>(null);

  private abort: AbortController | null = null;

  themeName = computed(() => presetNameOf(this.editor.designSystem()));
  /** Famille de sections que l'IA privilégie pour ce thème (déduite pour un thème personnalisé) */
  personality = computed(() => personalityOf(this.editor.designSystem()));

  private targetPage = computed(() => {
    const id = this.editor.targetPageId();
    return this.editor.pages().find(p => p.id === id) ?? null;
  });

  targetPageName = computed(() => this.targetPage()?.name ?? null);

  canGenerate = computed(() =>
    !this.loading() && (this.prompt().trim().length > 0 || !!this.image()) && !!this.targetPageName()
  );

  useExample(example: string) {
    this.prompt.set(example);
    this.error.set(null);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.generate();
    }
  }

  // CAPTURE D'ÉCRAN DE RÉFÉRENCE
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.attach(file);
  }

  onPaste(event: ClipboardEvent) {
    const file = [...(event.clipboardData?.files ?? [])].find(f => f.type.startsWith('image/'));
    if (file) {
      event.preventDefault();
      this.attach(file);
    }
  }

  private attach(file: File) {
    this.error.set(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      this.error.set('Format non pris en charge : utilisez une image PNG, JPEG ou WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.error.set('Image trop lourde : 5 Mo maximum.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      this.image.set({ name: file.name, mimeType: file.type, data: dataUrl.slice(dataUrl.indexOf(',') + 1), preview: dataUrl });
    };
    reader.onerror = () => this.error.set("Impossible de lire l'image.");
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.image.set(null);
  }

  // GÉNÉRATION EN DIRECT
  async generate() {
    if (!this.canGenerate()) return;
    // La page cible est figée au lancement : l'utilisateur peut continuer à naviguer pendant la génération
    const pageId = this.editor.targetPageId();
    const pageName = this.targetPageName();
    const pageWidth = this.targetPage()?.width ?? DEFAULT_PAGE_WIDTH;
    const image = this.image();

    this.abort = new AbortController();
    this.loading.set(true);
    this.received.set(0);
    this.error.set(null);
    this.success.set(null);
    this.issues.set(null);

    let mode = '';
    let incomplete = false;
    let palette: AiPalette | null = null;
    try {
      const count = await this.ai.generateStream(
        {
          prompt: this.prompt().trim(),
          theme: this.themeName(),
          personality: this.personality(),
          chooseColors: this.chooseColors(),
          pageWidth,
          image: image ? { mimeType: image.mimeType, data: image.data } : null,
        },
        {
          onSection: widget => {
            const first = this.received() === 0;
            // Toutes les sections d'une génération forment une seule étape « Annuler »
            this.editor.addGeneratedWidgets([widget], pageId, { continueStep: !first, select: first });
            this.received.update(n => n + 1);
          },
          onMode: m => (mode = m),
          onPalette: p => (palette = p),
          onIncomplete: () => (incomplete = true),
        },
        this.abort.signal
      );
      const kind = MODE_LABELS[mode] ? ` (${MODE_LABELS[mode]})` : '';
      const recolored = this.applyPalette(palette);
      if (incomplete) {
        this.error.set(`L'IA s'est arrêtée avant la fin : ${count} section${count > 1 ? 's' : ''} reçue${count > 1 ? 's' : ''}. ` +
          'Relancez la génération, ou complétez la page avec la boîte à composants.');
        return;
      }
      this.success.set(`${count} section${count > 1 ? 's' : ''} ajoutée${count > 1 ? 's' : ''} à « ${pageName} »${kind}. ` +
        (recolored ? 'Les couleurs du thème ont été mises à jour : Ctrl+Z pour revenir aux précédentes.' : 'Ctrl+Z pour tout annuler.'));
    } catch (e) {
      const added = this.received();
      if (added) this.applyPalette(palette);
      const message = e instanceof Error ? e.message : 'La génération a échoué.';
      this.error.set(added ? `${message} Les ${added} sections déjà reçues ont été gardées.` : message);
    } finally {
      this.loading.set(false);
      this.abort = null;
    }
  }

  /**
   * Met à jour le design system avec la palette choisie par l'IA, une fois les sections arrivées.
   * Polices, arrondis et espacements restent ceux du thème ; l'étape s'annule à part (Ctrl+Z).
   */
  private applyPalette(palette: AiPalette | null): boolean {
    if (!palette || !this.chooseColors() || this.received() === 0) return false;
    const ds = this.editor.designSystem();
    this.editor.applyDesignSystem({ ...ds, colors: strengthenContrast(generatePalette(palette.primary, palette.mode)) });
    return true;
  }

  stop() {
    this.abort?.abort();
  }

  // AUDIT DE LISIBILITÉ
  runAudit() {
    this.auditError.set(null);
    const page = this.targetPage();
    const firstWidget = page?.widgets[0];
    const pageElement = firstWidget ? document.getElementById(firstWidget.id)?.closest<HTMLElement>('.page-paper') : null;
    if (!page || !pageElement) {
      this.issues.set([]);
      return;
    }
    this.issues.set(auditReadability(pageElement));
  }

  groupKey(group: ReadabilityGroup): string {
    return `${group.color}|${group.background}|${group.minimum}`;
  }

  selectIssue(issue: ReadabilityIssue) {
    this.editor.selectWidget(issue.widgetId);
  }

  /** Les deux couleurs du problème viennent directement du thème : c'est le thème qu'il faut corriger. */
  comesFromTheme(group: ReadabilityGroup): boolean {
    const c = this.editor.designSystem().colors;
    const texts = [c.text, c.muted, c.primary, c.secondary, readableOn(c.primary), readableOn(c.secondary)].map(x => x.toLowerCase());
    const backgrounds = [c.bg, c.surface, c.primary, c.secondary].map(x => x.toLowerCase());
    return texts.includes(group.color) && backgrounds.includes(group.background);
  }

  canFix(group: ReadabilityGroup): boolean {
    return this.comesFromTheme(group) || group.issues.length <= MAX_AI_FIXES;
  }

  async fixGroup(group: ReadabilityGroup) {
    this.fixingKey.set(this.groupKey(group));
    this.auditError.set(null);
    try {
      if (this.comesFromTheme(group)) {
        // Une seule correction du thème règle tous les blocs concernés, en une étape annulable
        const ds = this.editor.designSystem();
        this.editor.applyDesignSystem({ ...ds, colors: strengthenContrast(ds.colors) });
      } else {
        for (const issue of group.issues.slice(0, MAX_AI_FIXES)) {
          await this.aiEditor.edit(
            issue.widgetId,
            `Le texte de ce bloc manque de contraste (${issue.ratio.toFixed(1)}:1 au lieu de ${issue.minimum}:1 minimum). ` +
            `Corrige uniquement les couleurs pour atteindre ce contraste, sans changer le contenu ni la mise en page.`
          );
        }
      }
      // Laisse le rendu se mettre à jour avant de revérifier
      requestAnimationFrame(() => this.runAudit());
    } catch (e) {
      this.auditError.set(e instanceof Error ? e.message : 'La correction a échoué.');
    } finally {
      this.fixingKey.set(null);
    }
  }

  formatRatio(ratio: number): string {
    return ratio.toFixed(1).replace('.', ',');
  }
}
