import { Routes } from '@angular/router';

import { PublicLayoutComponent } from './layouts/public-layout/public-layout';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout';
import { AgriLayoutComponent } from './layouts/agri-layout/agri-layout';

import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';

// FarmersList is standalone — import it dynamically to avoid TS2305/TS2339 issues
import { FarmerDetail } from './admin/farmer-detail/farmer-detail';
import { FarmerParcels } from './admin/farmer-parcels/farmer-parcels';
import { AdminProfile } from './admin/admin-profile/admin-profile';

import { Home } from './agri/home/home';
import { Profile } from './agri/profile/profile';
import { ParcelDashboard } from './agri/parcel-dashboard/parcel-dashboard';

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
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'agriculteurs' },

      // dynamic load for standalone component
      { path: 'agriculteurs', loadComponent: () => import('./admin/farmers-list/farmers-list').then((m: any) => m.FarmersList) },

      { path: 'agriculteurs/:id', component: FarmerDetail },
      { path: 'agriculteurs/:id/parcelles', component: FarmerParcels },
      { path: 'admin-profile', component: AdminProfile },
    ],
  },

  {
    path: '',
    component: AgriLayoutComponent,
    children: [
      { path: 'accueil', component: Home },
      { path: 'profil', component: Profile },
      { path: 'parcelles/:id', component: ParcelDashboard },
    ],
  },

  { path: '**', redirectTo: 'connexion' },
];