import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Properties } from './properties';
import { appConfig } from '../../../../app.config';

describe('Properties', () => {
  let component: Properties;
  let fixture: ComponentFixture<Properties>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Properties],
      providers: appConfig.providers
    })
    .compileComponents();

    fixture = TestBed.createComponent(Properties);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
