import { TestBed } from '@angular/core/testing';
import { AiGenerator } from './ai-generator';
import { AiService, PageRequest, StreamHandlers } from '../../../../../core/services/AiService/ai-service';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { generatePalette, strengthenContrast } from '../../../../../core/data/themes.data';

describe('AiGenerator : couleurs choisies par l\'IA', () => {
  let requests: PageRequest[];

  function setup(palette: { primary: string; mode: 'light' | 'dark' } | null) {
    localStorage.clear();
    requests = [];
    TestBed.configureTestingModule({
      imports: [AiGenerator],
      providers: [{
        provide: AiService,
        useValue: {
          generateStream: async (request: PageRequest, handlers: StreamHandlers) => {
            requests.push(request);
            if (palette) handlers.onPalette?.(palette);
            handlers.onSection({ type: 'container', element: 'section', name: 'Bandeau', styles: {}, config: {}, children: [] });
            return 1;
          },
        },
      }],
    });
    const fixture = TestBed.createComponent(AiGenerator);
    fixture.componentInstance.prompt.set('Studio de yoga à Bordeaux');
    return { generator: fixture.componentInstance, editor: TestBed.inject(EditorService) };
  }

  it('met à jour le design system avec la palette de l\'IA à la fin de la génération, en gardant polices et arrondis', async () => {
    const { generator, editor } = setup({ primary: '#7a8b6f', mode: 'light' });
    const before = editor.designSystem();
    await generator.generate();

    expect(requests[0].chooseColors).toBe(true);
    const after = editor.designSystem();
    expect(after.colors).toEqual(strengthenContrast(generatePalette('#7a8b6f', 'light')));
    expect(after.typography).toEqual(before.typography);
    expect(after.spacing).toEqual(before.spacing);
    expect(generator.success()).toContain('couleurs du thème ont été mises à jour');

    // Première annulation : les couleurs reviennent, les sections restent
    editor.undo();
    expect(editor.designSystem().colors).toEqual(before.colors);
  });

  it('garde les couleurs du thème quand l\'option est décochée', async () => {
    const { generator, editor } = setup({ primary: '#7a8b6f', mode: 'dark' });
    const before = editor.designSystem().colors;
    generator.chooseColors.set(false);
    await generator.generate();
    expect(requests[0].chooseColors).toBe(false);
    expect(editor.designSystem().colors).toEqual(before);
  });
});
