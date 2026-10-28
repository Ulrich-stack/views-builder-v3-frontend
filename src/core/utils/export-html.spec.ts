import { exportFileName, exportPageHtml } from './export-html';
import { Page } from '../models/page.model';

const page: Page = {
  id: 'p1', name: 'Accueil — Été', x: 0, y: 0,
  widgets: [
    {
      id: 's1', type: 'container', element: 'section', name: 'Section', config: {},
      styles: { padding: '96px 6%', 'background-color': 'var(--surface)' },
      children: [
        { id: 't1', type: 'text', element: 'h1', name: 'Titre', config: {}, content: 'Thés & <douceurs>', styles: { 'font-size': 'var(--font-size-xl)' } },
        { id: 'b1', type: 'action', element: 'button', name: 'Bouton', config: {}, content: 'Réserver', styles: {} },
        { id: 'i1', type: 'input', element: 'input', name: 'E-mail', config: { placeholder: 'vous@exemple.fr' }, styles: { border: '1px solid var(--text)' } },
        { id: 'm1', type: 'media', element: 'img', name: 'Photo', config: { src: 'https://exemple.fr/a.jpg', alt: 'Une "tasse"' }, styles: {} },
      ],
    },
  ],
};

const variables = { '--primary': '#2563eb', '--font-family': "'Inter', sans-serif", '--font-family-heading': "'Fraunces', serif" };

describe('exportPageHtml', () => {
  const html = exportPageHtml(page, variables);

  it('produit un document autonome avec les variables du thème et les polices utilisées', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('--primary: #2563eb;');
    expect(html).toContain('family=Inter');
    expect(html).toContain('family=Fraunces');
    expect(html).toContain('<title>Accueil — Été</title>');
  });

  it('reprend la structure et les styles des blocs en échappant le contenu', () => {
    expect(html).toContain('<section style="padding: 96px 6%; background-color: var(--surface)">');
    expect(html).toContain('<h1>Thés &amp; &lt;douceurs&gt;</h1>');
    expect(html).toContain('<button type="button" class="vb-button">Réserver</button>');
    expect(html).toContain('class="vb vb-framed"');
    expect(html).toContain('alt="Une &quot;tasse&quot;"');
  });

  it('donne un nom de fichier lisible', () => {
    expect(exportFileName(page)).toBe('accueil-ete.html');
  });

  it("n'ajoute ni repère ni script quand la page n'a pas d'interactions", () => {
    expect(html).not.toContain('data-vb-id');
    expect(html).not.toContain('<script');
  });
});

describe('exportPageHtml avec des interactions', () => {
  const interactive: Page = {
    id: 'p2', name: 'Contact', x: 0, y: 0,
    widgets: [
      { id: 'b1', type: 'action', element: 'button', name: 'Bouton', styles: {}, content: 'Envoyer',
        config: { actions: [
          { on: 'click', do: 'show', target: 'm1' },
          { on: 'click', do: 'toast', message: '</script><script>alert(1)</script>' },
          { on: 'click', do: 'eval', code: 'alert(2)' },
        ] } },
      { id: 'm1', type: 'text', element: 'p', name: 'Merci', styles: {}, config: { hidden: true }, content: 'Merci !' },
      { id: 't1', type: 'text', element: 'p', name: 'Texte', styles: {}, config: {}, content: 'Neutre' },
    ],
  };
  const html = exportPageHtml(interactive, variables);

  it('repère les blocs qui agissent ou sont visés, et masque ceux qui le sont au départ', () => {
    expect(html).toContain('<div class="vb" data-vb-id="b1">');
    expect(html).toContain('<div class="vb vb-hidden" data-vb-id="m1">');
    expect(html).not.toContain('data-vb-id="t1"');
    expect(html).toContain('.vb-hidden { display: none !important; }');
  });

  it('embarque les actions nettoyées et le script qui les exécute, sans pouvoir fermer la balise', () => {
    const json = html.match(/<script type="application\/json" id="vb-actions">(.*?)<\/script>/)![1];
    const map = JSON.parse(json);
    expect(map.b1.length).toBe(2);
    expect(map.b1[1].message).toBe('</script><script>alert(1)</script>');
    expect(html).not.toContain('alert(2)');
    expect(html.match(/<\/script>/g)!.length).toBe(2);
    expect(html).toContain("document.getElementById('vb-actions')");
  });
});
