import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionsEditor } from './actions-editor';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { Widget } from '../../../../../core/models/widget.model';

describe('ActionsEditor', () => {
  let fixture: ComponentFixture<ActionsEditor>;
  let component: ActionsEditor;
  let editor: EditorService;

  const current = () => editor.getPath('btn').at(-1)!;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [ActionsEditor] }).compileComponents();
    editor = TestBed.inject(EditorService);
    const form: Widget = {
      id: 'form', type: 'container', element: 'div', name: 'Formulaire', styles: {}, config: {}, children: [
        { id: 'mail', type: 'input', element: 'input', name: 'E-mail', styles: {}, config: {} },
        { id: 'btn', type: 'action', element: 'button', name: 'Bouton', styles: {}, config: {}, content: 'Envoyer' },
      ],
    };
    editor.addWidget(form, null, 'page-1');

    fixture = TestBed.createComponent(ActionsEditor);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('widget', current());
    await fixture.whenStable();
  });

  const refresh = async () => {
    fixture.componentRef.setInput('widget', current());
    await fixture.whenStable();
  };

  it('ajoute une action, puis la transforme en vérification du premier champ', async () => {
    component.add();
    await refresh();
    expect(current().config['actions']).toEqual([{ on: 'click', do: 'toast', message: 'Merci, c’est envoyé !' }]);

    component.setKind(0, 'validate');
    await refresh();
    expect(current().config['actions'][0]).toEqual({ on: 'click', do: 'validate', target: 'mail', rule: 'required' });
    const select = (fixture.nativeElement as HTMLElement).querySelectorAll('select')[1] as HTMLSelectElement;
    expect(select.options[select.selectedIndex].text).toContain('E-mail');
  });

  it('signale une cible supprimée', async () => {
    editor.setWidgetConfig('btn', 'actions', [{ on: 'click', do: 'hide', target: 'disparu' }]);
    await refresh();
    expect((fixture.nativeElement as HTMLElement).querySelector('.warning')?.textContent).toContain("n'existe plus");
  });

  it('réordonne et retire les actions, et règle la visibilité au départ', async () => {
    editor.setWidgetConfig('btn', 'actions', [
      { on: 'click', do: 'toast', message: 'A' },
      { on: 'click', do: 'toast', message: 'B' },
    ]);
    await refresh();
    component.move(0, 1);
    await refresh();
    expect(current().config['actions'].map((a: any) => a.message)).toEqual(['B', 'A']);
    component.remove(0);
    await refresh();
    expect(current().config['actions'].length).toBe(1);

    component.setHidden(true);
    await refresh();
    expect(current().config['hidden']).toBe(true);
  });
});
