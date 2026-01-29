import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {
  parcels: Parcelle[] = [];            // initialized to avoid undefined
  mapError: string | null = null;
  isBrowser = false;
  apiLoaded = false;                   // if you load Maps API dynamically, set to true when loaded
  center: { lat: number; lng: number } = { lat: 0, lng: 0 };
  zoom = 8;
  loading = false;
  error: string | null = null;

  constructor(
    private parcellesSvc: ParcellesService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Try load parcels for current user (like other components)
    if (this.isBrowser) {
      const uidStr = localStorage.getItem('user_id');
      if (uidStr) {
        const uid = Number(uidStr);
        if (uid) {
          this.loadParcelles(uid);
        }
      }
    }

    // if you manage Google Maps API loading set apiLoaded = true once ready
    // For now we keep apiLoaded=false so the template shows placeholder
  }

  loadParcelles(userId: number) {
    this.loading = true;
    this.parcellesSvc.getByUser(userId).subscribe({
      next: (list: Parcelle[]) => {
        this.parcels = list || [];
        // optionally set map center to first parcel coords
        if (this.parcels.length > 0) {
          const p0: any = this.parcels[0];
          const lat = p0.latitude ?? p0.lat;
          const lng = p0.longitude ?? p0.lng;
          if (lat != null && lng != null) {
            this.center = { lat: Number(lat), lng: Number(lng) };
          }
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement parcelles:', err);
        this.error = 'Erreur lors du chargement des parcelles';
        this.loading = false;
      }
    });
  }

  voirDetails(id: number) {
    // adapt route if your app uses a different path
    this.router.navigate(['/parcelle', id]);
  }

  deleteParcelle(id: number) {
    if (!confirm('Supprimer cette parcelle ?')) return;
    this.parcellesSvc.delete(id).subscribe({
      next: () => {
        // update UI list
        this.parcels = this.parcels.filter(p => p.id !== id);
      },
      error: (err: any) => {
        console.error('Erreur suppression parcelle', err);
        alert('Erreur lors de la suppression');
      }
    });
  }

  // Map helpers (stubs). If you integrate Google Maps marker/polygon logic, adapt these.
  getPathFromParcel(p: Parcelle): Array<{ lat: number; lng: number }> {
    // if parcel contains polygon coordinates (string), you may parse it here.
    // For now return empty array so *ngIf="getPathFromParcel(p).length > 1" works.
    return [];
  }

  onMapReady(_map: any) {
    // called by <google-map> when map is ready (no-op by default)
  }
}