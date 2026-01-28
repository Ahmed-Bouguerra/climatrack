import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-farmer-parcels',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatButtonModule],
  templateUrl: './farmer-parcels.html',
})
export class FarmerParcels implements OnInit {
  parcels: Parcelle[] = [];
  loading = false;
  userId: number | null = null;

  // props referenced by template
  farmerName: string | null = null;
  errorMessage: string | null = null;

  constructor(private svc: ParcellesService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    // Try read farmer id (and optional name) from route params
    this.route.paramMap.subscribe((pm) => {
      const idFromRoute = pm.get('id');
      const nameFromRoute = pm.get('name'); // optional param if you pass it
      if (idFromRoute) {
        this.userId = Number(idFromRoute);
      } else {
        // fallback vers localStorage si nécessaire
        this.userId = localStorage.getItem('user_id') ? Number(localStorage.getItem('user_id')) : null;
      }
      if (nameFromRoute) this.farmerName = nameFromRoute;
      this.loadParcelles();
    });
  }

  loadParcelles() {
    if (!this.userId) {
      this.errorMessage = 'Utilisateur non spécifié.';
      return;
    }
    this.errorMessage = null;
    this.loading = true;
    this.svc.getByUser(this.userId).subscribe({
      next: (list: Parcelle[]) => {
        this.parcels = list || [];
        this.loading = false;
        // if route didn't provide farmerName, try infer from first parcel row
        if (!this.farmerName && this.parcels.length) {
          const p0 = this.parcels[0];
          const nom = p0.nom_agriculteur || '';
          const prenom = p0.prenom_agriculteur || '';
          const fullname = (nom + ' ' + prenom).trim();
          if (fullname) this.farmerName = fullname;
        }
      },
      error: (err: any) => {
        console.error('Erreur chargement parcelles:', err);
        this.errorMessage = 'Erreur lors du chargement des parcelles.';
        this.loading = false;
      }
    });
  }

  deleteParcelle(id: number) {
    if (!confirm('Supprimer cette parcelle ?')) return;
    this.svc.delete(id).subscribe({
      next: () => this.loadParcelles(),
      error: (err: any) => { console.error(err); alert('Erreur suppression'); }
    });
  }

  // utilisé par template pour ouvrir détail / météo
  openParcel(id: number) {
    this.router.navigate(['/parcelle', id]);
  }
}