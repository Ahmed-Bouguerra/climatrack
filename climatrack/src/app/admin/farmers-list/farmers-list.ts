import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface Farmer {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
}

@Component({
  selector: 'app-farmers-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './farmers-list.html',
  styleUrls: ['./farmers-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmersList implements OnInit {
  farmers: Farmer[] = [];
  displayedColumns: string[] = ['nom', 'prenom', 'email', 'telephone', 'adresse', 'actions'];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFarmers();
  }

  loadFarmers(): void {
    this.api.get<Farmer[]>('/index.php?action=farmers').subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.farmers = data || [];
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        console.error('Erreur chargement agriculteurs:', err);
        alert('Erreur lors du chargement des agriculteurs');
      }
    });
  }

  deleteFarmer(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet agriculteur ?')) {
      this.api.delete(`/index.php?action=farmers&id=${id}`).subscribe({
        next: () => {
          alert('Agriculteur supprimé');
          this.loadFarmers();
        },
        error: (err) => {
          console.error('Erreur suppression:', err);
          alert('Erreur lors de la suppression');
        }
      });
    }
  }

  viewFarmer(id: number): void {
    // navigate to admin agriculteurs/:id (detail page)
    this.router.navigate(['/admin/agriculteurs', id]);
  }

  goToParcelles(id: number): void {
    // navigate to admin agriculteurs/:id/parcelles
    this.router.navigate(['/admin/agriculteurs', id, 'parcelles']);
  }


  
}