import { INTERACTIONS_RUNTIME, retargetActions, sanitizeActions } from './interactions';
import { exportPageHtml } from './export-html';
import { Page } from '../models/page.model';
import { Widget, WidgetAction } from '../models/widget.model';

describe('sanitizeActions', () => {
  it('garde les actions de la liste blanche avec leurs seuls champs utiles', () => {
    const actions = sanitizeActions([
      { on: 'click', do: 'validate', target: 'email', rule: 'email', message: '  Oups ', url: 'x' },
      { do: 'hide', target: 'form', message: 'ignoré' },
      { on: 'click', do: 'toast', message: 'Merci !' },
      { on: 'click', do: 'link', url: 'mailto:contact@exemple.fr', newTab: true },
    ]);
    expect(actions).toEqual([
      { on: 'click', do: 'validate', target: 'email', rule: 'email', message: 'Oups' },
      { on: 'click', do: 'hide', target: 'form' },
      { on: 'click', do: 'toast', message: 'Merci !' },
      { on: 'click', do: 'link', url: 'mailto:contact@exemple.fr', newTab: true },
    ]);
  });

  it('rejette les actions inconnues, incomplètes ou dangereuses', () => {
    expect(sanitizeActions([
      { on: 'click', do: 'eval', code: 'alert(1)' },
      { on: 'hover', do: 'show', target: 'a' },
      { on: 'click', do: 'show' },
      { on: 'click', do: 'show', target: '"><script>' },
      { on: 'click', do: 'toast', message: '   ' },
      { on: 'click', do: 'link', url: 'javascript:alert(1)' },
      'texte', null,
    ])).toEqual([]);
    expect(sanitizeActions('pas une liste')).toEqual([]);
    expect(sanitizeActions([{ do: 'validate', target: 'a', rule: 'regex' }])[0].rule).toBe('required');
  });
});

describe('retargetActions', () => {
  it('réécrit les cibles et retire les actions dont la cible a disparu', () => {
    const widget: Widget = {
      id: 'b', type: 'action', element: 'button', name: 'Bouton', styles: {},
      config: { actions: [
        { on: 'click', do: 'show', target: 'old' },
        { on: 'click', do: 'hide', target: 'gone' },
        { on: 'click', do: 'toast', message: 'Ok' },
      ] },
    };
    const result = retargetActions(widget, t => (t === 'old' ? 'new' : null));
    expect(result.config['actions']).toEqual([
      { on: 'click', do: 'show', target: 'new' },
      { on: 'click', do: 'toast', message: 'Ok' },
    ]);
    expect(widget.config['actions'].length).toBe(3);
  });
});

// Formulaire type : « au clic sur Envoyer, vérifier l'e-mail, afficher la confirmation et masquer le formulaire »
function formPage(actions: WidgetAction[]): Page {
  return {
    id: 'p1', name: 'Contact', x: 0, y: 0,
    widgets: [
      {
        id: 'form', type: 'container', element: 'div', name: 'Formulaire', styles: { display: 'flex' }, config: {},
        children: [
          { id: 'email', type: 'input', element: 'input', name: 'E-mail', styles: {}, config: { placeholder: 'vous@exemple.fr' } },
          { id: 'send', type: 'action', element: 'button', name: 'Bouton', styles: {}, config: { actions }, content: 'Envoyer' },
        ],
      },
      { id: 'thanks', type: 'text', element: 'p', name: 'Merci', styles: {}, config: { hidden: true }, content: 'Merci !' },
    ],
  };
}

/** Charge la page exportée dans le document de test et exécute son script d'interactions. */
function loadExport(page: Page) {
  const html = exportPageHtml(page, {});
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = parsed.body.innerHTML;
  new Function(INTERACTIONS_RUNTIME)();
  const block = (id: string) => document.querySelector<HTMLElement>(`[data-vb-id="${id}"]`)!;
  const click = (id: string) => block(id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return { block, click };
}

describe('script des interactions', () => {
  const actions: WidgetAction[] = [
    { on: 'click', do: 'validate', target: 'email', rule: 'email' },
    { on: 'click', do: 'hide', target: 'form' },
    { on: 'click', do: 'show', target: 'thanks' },
    { on: 'click', do: 'toast', message: 'Message envoyé' },
  ];

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("bloque la suite et affiche l'erreur tant que l'e-mail est invalide", () => {
    const { block, click } = loadExport(formPage(actions));
    const field = block('email').querySelector('input')!;

    click('send');
    expect(block('email').classList).toContain('vb-invalid');
    expect(block('email').nextElementSibling?.textContent).toBe('Adresse e-mail invalide.');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(block('form').classList).not.toContain('vb-hidden');
    expect(block('thanks').classList).toContain('vb-hidden');

    field.value = 'pas-un-email';
    click('send');
    expect(document.querySelectorAll('.vb-error').length).toBe(1);
    expect(document.querySelector('.vb-toast')).toBeNull();
  });

  it("masque le formulaire, affiche la confirmation et le message quand l'e-mail est valide", () => {
    const { block, click } = loadExport(formPage(actions));
    block('email').querySelector('input')!.value = 'camille@exemple.fr';

    click('send');
    expect(document.querySelector('.vb-error')).toBeNull();
    expect(block('form').classList).toContain('vb-hidden');
    expect(block('thanks').classList).not.toContain('vb-hidden');
    expect(document.querySelector('.vb-toast')?.textContent).toBe('Message envoyé');
  });

  it("efface l'erreur dès que l'on corrige le champ", () => {
    const { block, click } = loadExport(formPage([{ on: 'click', do: 'validate', target: 'email', rule: 'required', message: 'Dites-nous où répondre' }]));
    click('send');
    expect(block('email').nextElementSibling?.textContent).toBe('Dites-nous où répondre');
    const field = block('email').querySelector('input')!;
    field.value = 'a';
    field.dispatchEvent(new Event('input'));
    expect(document.querySelector('.vb-error')).toBeNull();
    expect(block('email').classList).not.toContain('vb-invalid');
  });

  it('alterne la visibilité avec « toggle »', () => {
    const { block, click } = loadExport(formPage([{ on: 'click', do: 'toggle', target: 'thanks' }]));
    click('send');
    expect(block('thanks').classList).not.toContain('vb-hidden');
    click('send');
    expect(block('thanks').classList).toContain('vb-hidden');
  });
});
