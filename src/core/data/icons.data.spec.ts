import { ICON_NAMES, iconData, iconSvg, FALLBACK_ICON, ICONS } from './icons.data';
import { exportPageHtml } from '../utils/export-html';
import { Page } from '../models/page.model';
import { personalityOf, THEME_PRESETS } from './themes.data';

describe('Icônes', () => {
  it('propose une liste de pictogrammes Lucide, avec une icône de secours pour un nom inconnu', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(40);
    expect(ICON_NAMES).toContain('map-pin');
    expect(iconData('inconnue')).toBe(ICONS[FALLBACK_ICON]);
  });

  it('dessine un SVG autonome qui prend la couleur du texte', () => {
    const svg = iconSvg('leaf');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('<path');
  });
});

describe('Export des nouveaux blocs', () => {
  const page: Page = {
    id: 'p', name: 'Salon de thé', x: 0, y: 0,
    widgets: [{
      id: 's', type: 'container', element: 'section', name: 'Bandeau photo', config: {},
      styles: { 'background-image': "linear-gradient(to top, black, transparent), url('https://exemple.fr/salon.jpg')" },
      children: [
        { id: 'h', type: 'text', element: 'h3', name: 'Intertitre', config: {}, content: 'Nos thés', styles: {} },
        { id: 'q', type: 'text', element: 'blockquote', name: 'Citation', config: {}, content: '« Parfait »', styles: {} },
        { id: 'i', type: 'media', element: 'icon', name: 'Icône', config: { icon: 'coffee' }, styles: { width: '28px' } },
      ],
    }],
  };
  const html = exportPageHtml(page, {});

  it('garde la photo de fond, les intertitres, les citations et les icônes', () => {
    expect(html).toContain('url(&#39;https://exemple.fr/salon.jpg&#39;)');
    expect(html).toContain('<h3>Nos thés</h3>');
    expect(html).toContain('<blockquote>« Parfait »</blockquote>');
    expect(html).toMatch(/<div class="vb vb-icon" style="width: 28px"><svg [^>]+>.*<\/svg><\/div>/);
  });
});

describe('Personnalité des thèmes', () => {
  it('chaque thème prêt à l\'emploi a sa personnalité, et les quatre sont représentées', () => {
    const all = new Set(THEME_PRESETS.map(t => personalityOf(t.designSystem)));
    expect([...all].sort()).toEqual(['audacieux', 'chaleureux', 'editorial', 'expressif']);
  });

  it('déduit la personnalité d\'un thème personnalisé de sa police de titres et de ses arrondis', () => {
    const base = THEME_PRESETS.find(t => t.name === 'Élégant')!.designSystem;
    const serifSquare = { ...base, colors: { ...base.colors, primary: '#123456' } };
    expect(personalityOf(serifSquare)).toBe('editorial');
    const tech = { ...serifSquare, typography: { ...serifSquare.typography, headingFamily: "'Space Grotesk', sans-serif" } };
    expect(personalityOf(tech)).toBe('audacieux');
    const friendlyRound = { ...serifSquare, typography: { ...serifSquare.typography, headingFamily: "'Poppins', sans-serif" },
      spacing: { ...serifSquare.spacing, radius: 20 } };
    expect(personalityOf(friendlyRound)).toBe('expressif');
  });
});
