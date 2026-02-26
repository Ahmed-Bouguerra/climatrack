import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { FarmersList } from './farmers-list';

describe('FarmersListComponent', () => {
  let component: FarmersList;
  let fixture: ComponentFixture<FarmersList>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [FarmersList],
      providers: [{ provide: Router, useValue: routerSpy }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FarmersList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('viewFarmer should navigate to detail', () => {
    component.viewFarmer(42);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/agriculteurs', 42]);
  });

  it('goToParcelles should navigate to parcels', () => {
    component.goToParcelles(7);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/agriculteurs', 7, 'parcelles']);
  });
});