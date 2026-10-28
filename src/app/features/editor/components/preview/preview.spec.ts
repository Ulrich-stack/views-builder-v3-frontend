import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Preview } from './preview';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';

describe('Preview', () => {
  let fixture: ComponentFixture<Preview>;
  let editor: EditorService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [Preview] }).compileComponents();
    editor = TestBed.inject(EditorService);
    editor.addWidget({ id: 't1', type: 'text', element: 'h1', name: 'Titre', styles: {}, config: {}, content: 'Bonjour' }, null, 'page-1');
    fixture = TestBed.createComponent(Preview);
    await fixture.whenStable();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it("n'affiche rien hors du mode aperçu", () => {
    expect(root().querySelector('.preview')).toBeNull();
  });

  it('affiche la page exportée dans une iframe isolée, puis se ferme avec Échap', async () => {
    editor.openPreview('page-1');
    await fixture.whenStable();
    const frame = root().querySelector('iframe')!;
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-popups allow-popups-to-escape-sandbox');
    expect(frame.getAttribute('srcdoc')).toContain('<h1>Bonjour</h1>');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(editor.previewPageId()).toBeNull();
    expect(root().querySelector('.preview')).toBeNull();
  });
});
