import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Toolbox } from './toolbox';

describe('Toolbox', () => {
  let component: Toolbox;
  let fixture: ComponentFixture<Toolbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Toolbox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Toolbox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
