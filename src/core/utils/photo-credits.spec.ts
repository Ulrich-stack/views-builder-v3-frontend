import { TestBed } from '@angular/core/testing';
import { creditOf, photoCredits, safeCreditUrl } from './photo-credits';
import { exportPageHtml } from './export-html';
import { Widget } from '../models/widget.model';
import { Page } from '../models/page.model';
import { EditorService } from '../services/EditorService/editor-service';
import { Properties } from '../../app/features/editor/components/properties/properties';
import { appConfig } from '../../app/app.config';

const photo = (id: string, credit?: string, creditUrl?: string): Widget => ({
  id, type: 'media', element: 'img', name: 'Photo', styles: {},
  config: { src: `https://images.unsplash.com/${id}`, ...(credit ? { credit } : {}), ...(creditUrl ? { creditUrl } : {}) },
});

describe('Crédits photo', () => {
  const widgets: Widget[] = [{
    id: 's', type: 'container', element: 'section', name: 'Bandeau photo', styles: {},
    config: { credit: 'Léa Martin sur Unsplash', creditUrl: 'https://unsplash.com/@lea?utm_source=views_builder' },
    children: [
      photo('a', 'Tom Durand sur Unsplash', 'https://unsplash.com/@tom'),
      photo('b', 'Léa Martin sur Unsplash', 'https://unsplash.com/@lea?utm_source=views_builder'),
      photo('c'),
      photo('d', 'Inconnu', 'javascript:alert(1)'),
    ],
  }];

  it('rassemble les crédits de la page sans doublon et ignore les liens non https', () => {
    expect(photoCredits(widgets).map(c => c.credit)).toEqual(['Léa Martin sur Unsplash', 'Tom Durand sur Unsplash', 'Inconnu']);
    expect(creditOf(widgets[0].children![3])?.url).toBeNull();
    expect(creditOf(widgets[0].children![2])).toBeNull();
    expect(safeCreditUrl('http://x.test')).toBeNull();
  });

  it('ajoute une ligne de crédits en bas de la page exportée', () => {
    const page: Page = { id: 'p', name: 'Salon', x: 0, y: 0, widgets };
    const html = exportPageHtml(page, {});
    expect(html).toContain('<p class="vb-credits">Photos : <a href="https://unsplash.com/@lea?utm_source=views_builder" target="_blank" rel="noopener">Léa Martin sur Unsplash</a>, ');
    expect(html).toContain('Inconnu</p>');
    expect(html).not.toContain('javascript:');
  });

  it('pas de ligne de crédits sans photo créditée', () => {
    const html = exportPageHtml({ id: 'p', name: 'Vide', x: 0, y: 0, widgets: [photo('x')] }, {});
    expect(html).not.toContain('<p class="vb-credits"');
  });

  it('remplacer la photo retire son crédit, en une seule étape annulable', () => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Properties], providers: appConfig.providers });
    const editor = TestBed.inject(EditorService);
    const added = editor.addFromToolbox({ type: 'media', label: 'Image', icon: 'image', element: 'img' })!;
    editor.updateWidget(added.id, { config: { src: 'https://images.unsplash.com/a', credit: 'Tom sur Unsplash', creditUrl: 'https://unsplash.com/@tom' } });
    editor.selectWidget(added.id);
    const properties = TestBed.createComponent(Properties).componentInstance;
    expect(properties.credit()?.credit).toBe('Tom sur Unsplash');

    properties.setConfig('src', 'https://exemple.fr/ma-photo.jpg');
    const config = editor.selectedWidget()!.config;
    expect(config['src']).toBe('https://exemple.fr/ma-photo.jpg');
    expect(config['credit']).toBeUndefined();
    expect(config['creditUrl']).toBeUndefined();

    editor.undo();
    expect(editor.selectedWidget()!.config['credit']).toBe('Tom sur Unsplash');
  });
});
