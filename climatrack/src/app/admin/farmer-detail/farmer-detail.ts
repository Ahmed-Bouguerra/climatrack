import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
  selector: 'app-farmer-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './farmer-detail.html',
  styleUrl: './farmer-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmerDetail implements OnInit {
  farmer: Farmer | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadFarmerDetail();
  }

  loadFarmerDetail(): void {
    this.route.params.subscribe((params) => {
      const farmerId = params['id'];
      
      if (!farmerId) {
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }

      this.api.get<Farmer>(`/index.php?action=farmers&id=${farmerId}`).subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.farmer = data;
            this.loading = false;
            this.cdr.markForCheck();
          });
        },
        error: (err) => {
          console.error('Erreur chargement agriculteur:', err);
          this.loading = false;
          this.cdr.markForCheck();
          alert('Erreur lors du chargement des informations');
        },
      });
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/agriculteurs']);
  }
}
