import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { exportPageHtml } from '../../../../../core/utils/export-html';

export type PreviewDevice = 'desktop' | 'mobile';

/**
 * Mode aperçu : la page telle qu'elle sera exportée, sans l'éditeur, interactions actives.
 * Elle est affichée dans une iframe isolée (sans allow-same-origin) : son script ne peut pas toucher l'éditeur.
 */
@Component({
  selector: 'app-preview',
  templateUrl: './preview.html',
  styleUrl: './preview.css',
})
export class Preview {
  editor = inject(EditorService);
  private sanitizer = inject(DomSanitizer);

  device = signal<PreviewDevice>('desktop');
  /** Change à chaque « Recommencer » pour recharger l'iframe (état initial de la page) */
  private reloads = signal(0);

  page = this.editor.previewPage;

  html = computed<SafeHtml | null>(() => {
    const page = this.page();
    if (!page) return null;
    const html = exportPageHtml(page, this.editor.globalVariables()) + `<!-- ${this.reloads()} -->`;
    // Contenu produit par l'éditeur (textes échappés), exécuté dans une iframe isolée
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  reload() {
    this.reloads.update(n => n + 1);
  }

  close() {
    this.editor.closePreview();
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.close();
  }
}
