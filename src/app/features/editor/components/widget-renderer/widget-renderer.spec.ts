import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WidgetRenderer } from './widget-renderer';

describe('WidgetRenderer', () => {
  let component: WidgetRenderer;
  let fixture: ComponentFixture<WidgetRenderer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetRenderer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WidgetRenderer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
