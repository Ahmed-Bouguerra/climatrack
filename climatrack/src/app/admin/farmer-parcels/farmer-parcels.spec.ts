import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmerParcels } from './farmer-parcels';

describe('FarmerParcels', () => {
  let component: FarmerParcels;
  let fixture: ComponentFixture<FarmerParcels>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmerParcels]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FarmerParcels);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
