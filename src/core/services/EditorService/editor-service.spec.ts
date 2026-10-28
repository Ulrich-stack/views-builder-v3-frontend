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

  describe('sections générées par l\'IA', () => {
    const generated = [
      { type: 'container', element: 'section', name: 'Hero', styles: {}, children: [
        { type: 'text', element: 'h1', name: 'Titre', content: 'Bienvenue' },
        { type: 'action', element: 'button', name: 'Bouton', content: 'Réserver', styles: { padding: '12px' } },
      ] },
      { type: 'container', element: 'section', name: 'Contact', styles: {}, children: [] },
    ];

    it('ajoute toutes les sections à la fin de la page, en une seule étape annulable', () => {
      service.addWidget(text('existant'), null, 'page-1');
      const added = service.addGeneratedWidgets(generated, 'page-1');

      const widgets = service.pages().find(p => p.id === 'page-1')!.widgets;
      expect(added).toBe(2);
      expect(widgets.map(w => w.name)).toEqual(['existant', 'Hero', 'Contact']);
      expect(widgets[1].children![1].styles['background-color']).toBe('var(--primary)');
      expect(service.selectedWidgetId()).toBe(widgets[1].id);

      service.undo();
      expect(rootIds()).toEqual(['existant']);
    });

    it('regroupe les sections reçues en direct dans une seule étape annulable', () => {
      service.addGeneratedWidgets([generated[0]], 'page-1');
      service.addGeneratedWidgets([generated[1]], 'page-1', { continueStep: true, select: false });
      expect(rootIds().length).toBe(2);

      service.undo();
      expect(rootIds()).toEqual([]);
    });

    it('remplace un bloc par sa version modifiée en gardant son identifiant', () => {
      service.addWidget(container('box', [text('old')]), null, 'page-1');
      const replaced = service.replaceWithBlueprint('box', {
        type: 'container', element: 'div', name: 'Nouveau', styles: { gap: '16px' },
        children: [{ type: 'text', element: 'h2', content: 'Titre' }],
      });

      const box = service.pages().find(p => p.id === 'page-1')!.widgets[0];
      expect(replaced).toBe(true);
      expect(box.id).toBe('box');
      expect(box.styles['gap']).toBe('16px');
      expect(box.children![0].content).toBe('Titre');

      service.undo();
      expect(service.pages().find(p => p.id === 'page-1')!.widgets[0].children![0].id).toBe('old');
    });

    it("n'ajoute rien sans page de contenu", () => {
      expect(service.addGeneratedWidgets(generated, null)).toBe(0);
    });
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

  describe('interactions', () => {
    const input = (id: string): Widget => ({ id, type: 'input', name: id, element: 'input', styles: {}, config: {} });
    const button = (id: string, actions: any[]): Widget =>
      ({ id, type: 'action', name: id, element: 'button', styles: {}, config: { actions }, content: 'Envoyer' });
    const findIn = (id: string) => service.getPath(id).at(-1);

    it("garde les identifiants des blocs dont l'IA a recopié le repère, et relie les nouvelles cibles", () => {
      service.addWidget(container('form', [input('mail'), button('btn', [])]), null, 'page-1');
      service.addWidget(text('dehors'), null, 'page-1');
      const ok = service.replaceWithBlueprint('form', {
        ref: 'b1', type: 'container', element: 'div', name: 'Formulaire', children: [
          { ref: 'b2', type: 'input', element: 'input', name: 'E-mail' },
          { ref: 'b3', type: 'action', element: 'button', name: 'Bouton', content: 'Envoyer', config: { actions: [
            { on: 'click', do: 'validate', target: 'b2', rule: 'email' },
            { on: 'click', do: 'show', target: 'n1' },
            { on: 'click', do: 'hide', target: 'dehors' },
            { on: 'click', do: 'hide', target: 'inconnu' },
            { on: 'click', do: 'eval', code: 'x' },
          ] } },
          { ref: 'n1', type: 'text', element: 'p', name: 'Merci', content: 'Merci !', config: { hidden: 'true' } },
        ],
      }, { b1: 'form', b2: 'mail', b3: 'btn' });

      expect(ok).toBe(true);
      const form = findIn('form')!;
      expect(form.children!.map(c => c.id).slice(0, 2)).toEqual(['mail', 'btn']);
      const thanks = form.children![2];
      expect(thanks.config['hidden']).toBe(true);
      expect((thanks as any).ref).toBeUndefined();
      expect(findIn('btn')!.config['actions']).toEqual([
        { on: 'click', do: 'validate', target: 'mail', rule: 'email' },
        { on: 'click', do: 'show', target: thanks.id },
        { on: 'click', do: 'hide', target: 'dehors' },
      ]);
    });

    it("retire les actions qui visaient un ancien enfant supprimé par l'IA", () => {
      service.addWidget(container('form', [input('mail'), button('btn', [{ on: 'click', do: 'hide', target: 'mail' }])]), null, 'page-1');
      service.replaceWithBlueprint('form', {
        ref: 'b1', type: 'container', element: 'div', name: 'Formulaire', children: [
          { ref: 'b3', type: 'action', element: 'button', name: 'Bouton', config: { actions: [{ on: 'click', do: 'hide', target: 'b2' }] } },
        ],
      }, { b1: 'form', b2: 'mail', b3: 'btn' });
      expect(findIn('btn')!.config['actions']).toEqual([]);
    });

    it('une copie vise ses propres blocs, pas ceux de l\'original', () => {
      service.addWidget(container('form', [input('mail'), button('btn', [
        { on: 'click', do: 'validate', target: 'mail', rule: 'required' },
        { on: 'click', do: 'hide', target: 'ailleurs' },
      ])]), null, 'page-1');
      const copy = service.duplicateWidget('form')!;
      const [copiedInput, copiedButton] = copy.children!;
      expect(copiedInput.id).not.toBe('mail');
      expect(copiedButton.config['actions']).toEqual([
        { on: 'click', do: 'validate', target: copiedInput.id, rule: 'required' },
        { on: 'click', do: 'hide', target: 'ailleurs' },
      ]);
    });

    it("ouvre l'aperçu sur une page de contenu seulement", () => {
      service.openPreview('ds-page');
      expect(service.previewPageId()).toBeNull();
      service.openPreview();
      expect(service.previewPage()?.id).toBe('page-1');
      service.closePreview();
      expect(service.previewPage()).toBeNull();
    });
  });
});
