import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';



@Component({
  selector: 'app-farmer-parcels',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatButtonModule],
  template: `
    <h3>Mes parcelles</h3>

    <div *ngIf="!userId">Utilisateur non connecté (user_id manquant)</div>

    <div *ngIf="userId">
      <button mat-stroked-button color="primary" (click)="load()" [disabled]="loading">Rafraîchir</button>

      <table style="width:100%; margin-top:12px; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">ID</th>
            <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Nom</th>
            <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Surface</th>
            <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Localisation</th>
            <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of parcels">
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;">{{p.id}}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;">{{p.nom || ('Parcelle ' + p.id)}}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;">{{p.surface ?? '-'}}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;">{{p.localisation || '-'}}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;">
              <button mat-stroked-button color="warn" (click)="deleteParcelle(p.id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="parcels.length === 0 && !loading" style="margin-top:12px;">
        Aucune parcelle.
      </div>
    </div>
  `,
})
export class FarmerParcels implements OnInit {
  parcels: Parcelle[] = [];
  loading = false;
  userId: number | null = localStorage.getItem('user_id') ? Number(localStorage.getItem('user_id')) : null;

  constructor(private svc: ParcellesService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    if (!this.userId) return;
    this.loading = true;
    this.svc.getByUser(this.userId).subscribe({
      next: (list: Parcelle[]) => { this.parcels = list; this.loading = false; },
      error: (err: any) => { console.error(err); this.loading = false; }
    });
  }

  deleteParcelle(id: number) {
    if (!confirm('Supprimer cette parcelle ?')) return;
    this.svc.delete(id).subscribe({
      next: () => this.load(),
      error: (err: any) => { console.error(err); alert('Erreur suppression'); }
    });
  }
}