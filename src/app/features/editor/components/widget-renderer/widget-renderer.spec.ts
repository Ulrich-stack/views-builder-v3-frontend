import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WidgetRenderer } from './widget-renderer';
import { Widget } from '../../../../../core/models/widget.model';

describe('WidgetRenderer', () => {
  let component: WidgetRenderer;
  let fixture: ComponentFixture<WidgetRenderer>;

  const widget: Widget = {
    id: 'w1', type: 'text', name: 'Titre', element: 'h1', styles: {}, config: {}, content: 'Bonjour'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetRenderer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WidgetRenderer);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('widget', widget);
    fixture.componentRef.setInput('pageId', 'page-1');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le contenu du bloc', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe('Bonjour');
  });
});
