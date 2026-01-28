import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-parcel-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatButtonModule],
  templateUrl: './parcel-dashboard.html',
  styleUrls: ['./parcel-dashboard.scss'],
})
export class ParcelDashboard implements OnInit {
  parcels: Parcelle[] = [];
  loading = false;
  userId: number | null = null;
  isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private svc: ParcellesService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Prefer route param; fallback to localStorage (login writes it)
    const paramId = this.route.snapshot.paramMap.get('id');
    if (paramId) {
      this.userId = Number(paramId);
    } else if (this.isBrowser && localStorage.getItem('user_id')) {
      this.userId = Number(localStorage.getItem('user_id'));
    }

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
    if (!confirm('Voulez-vous vraiment supprimer cette parcelle ?')) return;
    this.svc.delete(id).subscribe({
      next: () => this.load(),
      error: (err) => console.error('Erreur suppression parcelle', err)
    });
  }
}