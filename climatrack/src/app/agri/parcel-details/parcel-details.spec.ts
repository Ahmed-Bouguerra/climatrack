import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParcelDetails } from './parcel-details';

describe('ParcelDetails', () => {
  let component: ParcelDetails;
  let fixture: ComponentFixture<ParcelDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParcelDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParcelDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
