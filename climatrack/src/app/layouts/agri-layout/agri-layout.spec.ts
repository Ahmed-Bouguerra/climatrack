import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgriLayoutComponent } from './agri-layout';

describe('AgriLayout', () => {
  let component: AgriLayoutComponent;
  let fixture: ComponentFixture<AgriLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgriLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgriLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
