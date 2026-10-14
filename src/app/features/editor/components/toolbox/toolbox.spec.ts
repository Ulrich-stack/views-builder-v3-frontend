import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Toolbox } from './toolbox';
import { appConfig } from '../../../../app.config';

describe('Toolbox', () => {
  let component: Toolbox;
  let fixture: ComponentFixture<Toolbox>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Toolbox],
      providers: appConfig.providers,
    })
    .compileComponents();

    fixture = TestBed.createComponent(Toolbox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filtre sans tenir compte des accents ni des majuscules', () => {
    component.search.set('GALERIE');
    const labels = component.categories().flatMap(c => c.items.map(i => i.label));
    expect(labels).toContain('Galerie photos');

    component.search.set('video');
    expect(component.categories().flatMap(c => c.items.map(i => i.label))).toEqual(['Vidéo']);
  });

  it('cherche aussi dans les mots-clés', () => {
    component.search.set('footer');
    expect(component.categories().flatMap(c => c.items.map(i => i.label))).toContain('Pied de page');
  });

  it('ajoute un élément au clic', () => {
    const item = component.categories()[1].items[0];
    component.add(item);
    expect(component.editor.selectedWidget()?.element).toBe(item.element);
  });

  it('affiche les calques', async () => {
    component.tab.set('layers');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-layers')).toBeTruthy();
  });
});
