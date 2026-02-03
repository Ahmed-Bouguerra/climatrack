import { Routes } from '@angular/router';

import { PublicLayoutComponent } from './layouts/public-layout/public-layout';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout';
import { AgriLayoutComponent } from './layouts/agri-layout/agri-layout';

import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';
import { AuthGuard } from './core/guards/auth.guard';

// FarmersList is standalone — import it dynamically to avoid TS2305/TS2339 issues
import { FarmerDetail } from './admin/farmer-detail/farmer-detail';
import { FarmerParcels } from './admin/farmer-parcels/farmer-parcels';
import { AdminProfile } from './admin/admin-profile/admin-profile';
import { AdminParcelDetails } from './admin/parcel-details/parcel-details';

import { Home } from './agri/home/home';
import { Profile } from './agri/profile/profile';
import { ParcelDashboard } from './agri/parcel-dashboard/parcel-dashboard';
import { ParcelDetails } from './agri/parcel-details/parcel-details';

export const routes: Routes = [
 
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'connexion' },
      { path: 'connexion', component: LoginComponent },
      { path: 'inscription', component: RegisterComponent },
    ],
  },

  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'agriculteurs' },

      // dynamic load for standalone component
      { path: 'agriculteurs', loadComponent: () => import('./admin/farmers-list/farmers-list').then((m: any) => m.FarmersList) },

      { path: 'agriculteurs/:id', component: FarmerDetail },
      { path: 'agriculteurs/:id/parcelles', loadComponent: () => import('./admin/farmer-parcels/farmer-parcels').then((m: any) => m.FarmerParcels) },
      { path: 'parcelle/:id', loadComponent: () => import('./admin/parcel-details/parcel-details').then((m: any) => m.AdminParcelDetails) },
      { path: 'admin-profile', component: AdminProfile },
    ],
  },

  {
    path: '',
    component: AgriLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'accueil', component: Home },
      { path: 'profil', component: Profile },
      { path: 'parcelles/:id', component: ParcelDashboard },
      { path: 'parcelle/:id', component: ParcelDetails },
    ],
  },

  { path: '**', redirectTo: 'connexion' },
];