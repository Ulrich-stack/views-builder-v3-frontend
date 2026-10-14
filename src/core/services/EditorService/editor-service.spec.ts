import { TestBed } from '@angular/core/testing';

import { EditorService, STORAGE_KEY } from './editor-service';
import { Widget } from '../../models/widget.model';

function container(id: string, children: Widget[] = []): Widget {
  return { id, type: 'container', name: id, element: 'div', styles: {}, config: {}, children };
}

function text(id: string): Widget {
  return { id, type: 'text', name: id, element: 'p', styles: {}, config: {}, content: id };
}

describe('EditorService', () => {
  let service: EditorService;

  const rootIds = () => service.pages().find(p => p.id === 'page-1')!.widgets.map(w => w.id);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('ajout et déplacement', () => {
    it('insère un bloc à la position demandée', () => {
      service.addWidget(text('a'), null, 'page-1');
      service.addWidget(text('c'), null, 'page-1');
      service.addWidget(text('b'), null, 'page-1', 1);
      expect(rootIds()).toEqual(['a', 'b', 'c']);
    });

    it("ne modifie pas l'état précédent (immuabilité)", () => {
      service.addWidget(container('box'), null, 'page-1');
      const before = service.pages();
      const boxBefore = before[1].widgets[0];
      service.addWidget(text('child'), 'box', 'page-1');
      expect(boxBefore.children).toEqual([]);
      expect(service.pages()).not.toBe(before);
    });

    it('refuse de déposer un conteneur dans un de ses enfants', () => {
      service.addWidget(container('outer', [container('inner')]), null, 'page-1');
      service.moveWidget('outer', 'inner', 'page-1');
      expect(rootIds()).toEqual(['outer']);
      expect(service.selectedWidgetId()).toBeNull();
    });

    it('réordonne dans le même parent en tenant compte du retrait', () => {
      ['a', 'b', 'c'].forEach(id => service.addWidget(text(id), null, 'page-1'));
      // "a" déposé avant "c" (index 2 calculé avant le retrait)
      service.moveWidget('a', null, 'page-1', 2);
      expect(rootIds()).toEqual(['b', 'a', 'c']);
    });

    it('monte et descend un bloc', () => {
      ['a', 'b', 'c'].forEach(id => service.addWidget(text(id), null, 'page-1'));
      service.moveWidgetBy('a', 1);
      expect(rootIds()).toEqual(['b', 'a', 'c']);
      service.moveWidgetBy('c', -1);
      expect(rootIds()).toEqual(['b', 'c', 'a']);
      expect(service.canMoveBy('b', -1)).toBe(false);
    });

    it('dépose avant, après ou dans un bloc', () => {
      service.addWidget(container('box'), null, 'page-1');
      service.addWidget(text('t'), null, 'page-1');
      service.dropRelativeTo({ widgetId: 'box', position: 'before' }, { id: 't' });
      expect(rootIds()).toEqual(['t', 'box']);
      service.dropRelativeTo({ widgetId: 'box', position: 'inside' }, { id: 't' });
      expect(rootIds()).toEqual(['box']);
      expect(service.getParentId('t')).toBe('box');
    });
  });

  describe('modification', () => {
    beforeEach(() => service.addWidget(container('box', [text('t')]), null, 'page-1'));

    it('change et retire un style', () => {
      service.setWidgetStyle('t', 'color', 'red');
      expect(service.findLocation('t')).not.toBeNull();
      service.selectWidget('t');
      expect(service.selectedWidget()!.styles['color']).toBe('red');
      service.setWidgetStyle('t', 'color', null);
      expect(service.selectedWidget()!.styles['color']).toBeUndefined();
    });

    it('duplique un bloc et ses enfants avec de nouveaux identifiants', () => {
      const copy = service.duplicateWidget('box')!;
      expect(rootIds()).toEqual(['box', copy.id]);
      expect(copy.children![0].id).not.toBe('t');
      expect(copy.children![0].content).toBe('t');
      expect(service.selectedWidgetId()).toBe(copy.id);
    });

    it('supprime un bloc et le désélectionne', () => {
      service.selectWidget('t');
      service.removeWidget('t');
      expect(service.findLocation('t')).toBeNull();
      expect(service.selectedWidgetId()).toBeNull();
    });
  });

  describe('ajout au clic', () => {
    const item = { type: 'text', label: 'Paragraphe', icon: '', element: 'p' } as const;

    it("ajoute à la fin de la page quand rien n'est sélectionné", () => {
      service.addWidget(text('a'), null, 'page-1');
      service.selectWidget(null);
      const added = service.addFromToolbox(item)!;
      expect(rootIds()).toEqual(['a', added.id]);
      expect(service.selectedWidgetId()).toBe(added.id);
    });

    it('ajoute dans le conteneur sélectionné', () => {
      service.addWidget(container('box'), null, 'page-1');
      service.selectWidget('box');
      const added = service.addFromToolbox(item)!;
      expect(service.getParentId(added.id)).toBe('box');
    });

    it('ajoute juste après le bloc sélectionné', () => {
      ['a', 'b'].forEach(id => service.addWidget(text(id), null, 'page-1'));
      service.selectWidget('a');
      const added = service.addFromToolbox(item)!;
      expect(rootIds()).toEqual(['a', added.id, 'b']);
    });

    it("donne le chemin du bloc (fil d'Ariane)", () => {
      service.addWidget(container('outer', [container('inner', [text('t')])]), null, 'page-1');
      expect(service.getPath('t').map(w => w.id)).toEqual(['outer', 'inner', 't']);
    });

    it('remet le style par défaut', () => {
      service.addWidget(text('t'), null, 'page-1');
      service.setWidgetStyle('t', 'color', 'red');
      service.resetWidgetStyles('t');
      service.selectWidget('t');
      expect(service.selectedWidget()!.styles['color']).toBe('var(--text)');
    });
  });

  describe('historique', () => {
    it('annule et rétablit', () => {
      service.addWidget(text('a'), null, 'page-1');
      service.addWidget(text('b'), null, 'page-1');
      service.undo();
      expect(rootIds()).toEqual(['a']);
      service.undo();
      expect(rootIds()).toEqual([]);
      expect(service.canUndo()).toBe(false);
      service.redo();
      expect(rootIds()).toEqual(['a']);
    });

    it('regroupe les modifications successives de même clé', () => {
      service.addWidget(text('a'), null, 'page-1');
      service.setWidgetStyle('a', 'color', 'red');
      service.setWidgetStyle('a', 'color', 'blue');
      service.setWidgetStyle('a', 'color', 'green');
      service.undo();
      service.selectWidget('a');
      expect(service.selectedWidget()!.styles['color']).toBeUndefined();
    });

    it('une nouvelle action efface les étapes à rétablir', () => {
      service.addWidget(text('a'), null, 'page-1');
      service.undo();
      service.addWidget(text('b'), null, 'page-1');
      expect(service.canRedo()).toBe(false);
    });
  });

  describe('pages', () => {
    it('ajoute une page à droite des autres et la sélectionne', () => {
      const page = service.addPage();
      expect(service.pages().map(p => p.id)).toContain(page.id);
      expect(page.x).toBeGreaterThan(4100 + 800);
      expect(service.selectedPageId()).toBe(page.id);
    });

    it('ne supprime jamais la page du design system', () => {
      service.deletePage('ds-page');
      expect(service.pages().some(p => p.id === 'ds-page')).toBe(true);
    });
  });

  describe('sauvegarde', () => {
    it('enregistre le projet et le recharge', () => {
      service.addWidget(text('saved'), null, 'page-1');
      TestBed.tick();
      expect(localStorage.getItem(STORAGE_KEY)).toContain('saved');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const reloaded = TestBed.inject(EditorService);
      expect(reloaded.findLocation('saved')).not.toBeNull();
    });

    it('ignore une sauvegarde corrompue', () => {
      localStorage.setItem(STORAGE_KEY, '{pas du json');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const reloaded = TestBed.inject(EditorService);
      expect(reloaded.pages().length).toBe(2);
    });
  });
});
