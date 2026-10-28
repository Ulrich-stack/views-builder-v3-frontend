import { auditReadability, blend, parseCssColor } from './readability-audit';

describe('parseCssColor', () => {
  it('lit les formats renvoyés par le navigateur', () => {
    expect(parseCssColor('rgb(255, 0, 10)')).toEqual([255, 0, 10, 1]);
    expect(parseCssColor('rgba(0, 0, 0, 0.5)')).toEqual([0, 0, 0, 0.5]);
    expect(parseCssColor('rgb(0 0 0 / 25%)')).toEqual([0, 0, 0, 0.25]);
    expect(parseCssColor('color(srgb 1 0.5 0 / 0.8)')).toEqual([255, 127.5, 0, 0.8]);
    expect(parseCssColor('transparent')![3]).toBe(0);
    expect(parseCssColor('inherit')).toBeNull();
  });

  it('superpose une couleur transparente sur son fond', () => {
    expect(blend([0, 0, 0, 0.5], [255, 255, 255, 1])).toEqual([127.5, 127.5, 127.5, 1]);
  });
});

describe('auditReadability', () => {
  function pageWith(color: string, background: string): HTMLElement {
    const page = document.createElement('div');
    page.style.backgroundColor = background;
    page.innerHTML = `<div class="widget-wrapper" id="w1"><p data-editable style="color: ${color}; font-size: 16px">Texte</p></div>`;
    document.body.appendChild(page);
    return page;
  }

  afterEach(() => (document.body.innerHTML = ''));

  it('signale un texte gris clair sur fond blanc', () => {
    const issues = auditReadability(pageWith('rgb(200, 200, 200)', 'rgb(255, 255, 255)'));
    expect(issues.length).toBe(1);
    expect(issues[0].widgetId).toBe('w1');
    expect(issues[0].minimum).toBe(4.5);
  });

  it('accepte un texte noir sur fond blanc', () => {
    expect(auditReadability(pageWith('rgb(0, 0, 0)', 'rgb(255, 255, 255)'))).toEqual([]);
  });
});
