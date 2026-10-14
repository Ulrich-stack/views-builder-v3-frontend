import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Canvas } from './canvas';
import { appConfig } from '../../../../app.config';

describe('Canvas', () => {
  let component: Canvas;
  let fixture: ComponentFixture<Canvas>;

  const wheel = (init: WheelEventInit) => new WheelEvent('wheel', { cancelable: true, ...init });

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Canvas],
      providers: appConfig.providers,
    })
    .compileComponents();

    fixture = TestBed.createComponent(Canvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
    component.zoom.set(1);
    component.offsetX.set(0);
    component.offsetY.set(0);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('la molette fait défiler la vue sans zoomer', () => {
    component.onWheel(wheel({ deltaX: 10, deltaY: 40 }));
    expect(component.offsetX()).toBe(-10);
    expect(component.offsetY()).toBe(-40);
    expect(component.zoom()).toBe(1);
  });

  it('Maj + molette fait défiler horizontalement', () => {
    component.onWheel(wheel({ deltaY: 30, shiftKey: true }));
    expect(component.offsetX()).toBe(-30);
    expect(component.offsetY()).toBe(0);
  });

  it('Ctrl + molette zoome en gardant le point sous la souris fixe', () => {
    const before = { x: (100 - component.offsetX()) / component.zoom(), y: (80 - component.offsetY()) / component.zoom() };
    component.onWheel(wheel({ deltaY: -50, ctrlKey: true, clientX: 100, clientY: 80 }));
    expect(component.zoom()).toBeGreaterThan(1);
    const rect = (fixture.nativeElement as HTMLElement).getBoundingClientRect();
    const local = { x: 100 - rect.left, y: 80 - rect.top };
    const after = { x: (local.x - component.offsetX()) / component.zoom(), y: (local.y - component.offsetY()) / component.zoom() };
    expect(after.x).toBeCloseTo(before.x - rect.left, 5);
    expect(after.y).toBeCloseTo(before.y - rect.top, 5);
  });

  it('limite le zoom', () => {
    component.zoomAt(100, 0, 0);
    expect(component.zoom()).toBe(4);
    component.zoomAt(0.0001, 0, 0);
    expect(component.zoom()).toBe(0.05);
  });

  it('Espace active le mode « main », relâcher le désactive', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    expect(component.spaceHeld()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }));
    expect(component.spaceHeld()).toBe(false);
  });

  it('Espace + clic sur une page déplace la vue au lieu de sélectionner', () => {
    component.spaceHeld.set(true);
    const paper = (fixture.nativeElement as HTMLElement).querySelector('.page-paper')!;
    paper.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    expect(component.isPanning()).toBe(true);
    window.dispatchEvent(new MouseEvent('mouseup'));
    expect(component.isPanning()).toBe(false);
  });
});
