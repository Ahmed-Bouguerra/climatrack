import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmersList } from './farmers-list';

describe('FarmersList', () => {
  let component: FarmersList;
  let fixture: ComponentFixture<FarmersList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmersList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FarmersList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
