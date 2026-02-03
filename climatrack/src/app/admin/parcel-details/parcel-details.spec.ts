import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminParcelDetails } from './parcel-details';

describe('AdminParcelDetails', () => {
  let component: AdminParcelDetails;
  let fixture: ComponentFixture<AdminParcelDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminParcelDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminParcelDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
