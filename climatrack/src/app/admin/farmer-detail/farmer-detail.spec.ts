import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmerDetail } from './farmer-detail';

describe('FarmerDetail', () => {
  let component: FarmerDetail;
  let fixture: ComponentFixture<FarmerDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmerDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FarmerDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
