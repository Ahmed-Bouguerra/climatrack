import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParcelDashboard } from './parcel-dashboard';

describe('ParcelDashboard', () => {
  let component: ParcelDashboard;
  let fixture: ComponentFixture<ParcelDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParcelDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParcelDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
