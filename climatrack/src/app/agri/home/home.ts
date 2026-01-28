import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GoogleMapsModule } from '@angular/google-maps';
import { GoogleMapsLoaderService } from '../../core/services/google.maps.loader.service';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';
import { Router } from '@angular/router';

type LatLng = google.maps.LatLngLiteral;

type ExtendedParcelle = Parcelle & {
  lat?: number | string | null;
  lng?: number | string | null;
  polygon?: string | null;
  nom?: string | null;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './home.html',
  // keep existing styleUrls if any, or add './home.scss'
})
export class Home implements OnInit {
  center: LatLng = { lat: 36.8, lng: 10.18 };
  zoom = 6;

  parcels: ExtendedParcelle[] = [];
  isBrowser = false;
  apiLoaded = false;
  mapError: string | null = null;

  private userId: number | null = null;

  constructor(
    private parcellesSvc: ParcellesService,
    private gmapsLoader: GoogleMapsLoaderService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    const uid = localStorage.getItem('user_id');
    if (!uid) {
      this.router.navigate(['/connexion']);
      return;
    }
    this.userId = Number(uid);
    this.loadParcelles();

    this.gmapsLoader.load()
      .then(() => {
        setTimeout(() => {
          if ((window as any).google && (window as any).google.maps) {
            this.apiLoaded = true;
            this.mapError = null;
          } else {
            this.mapError = 'Google Maps API not available (vérifier clé/billing).';
            this.apiLoaded = false;
          }
        }, 800);
      })
      .catch((err) => {
        console.error('Impossible de charger Google Maps API', err);
        this.mapError = 'Impossible de charger Google Maps API: ' + (err?.message || err);
        this.apiLoaded = false;
      });
  }

  loadParcelles() {
    if (!this.userId) return;
    this.parcellesSvc.getByUser(this.userId).subscribe({
      next: (list: Parcelle[]) => {
        this.parcels = list as ExtendedParcelle[];
        if (this.parcels.length) {
          const p = this.parcels[0];
          const lat = p.lat != null ? Number(p.lat) : null;
          const lng = p.lng != null ? Number(p.lng) : null;
          if (lat != null && lng != null) {
            this.center = { lat, lng };
            this.zoom = 12;
          }
        }
      },
      error: (err) => { console.error(err); }
    });
  }

  deleteParcelle(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer cette parcelle ?')) return;
    this.parcellesSvc.delete(id).subscribe({
      next: () => this.loadParcelles(),
      error: (err) => console.error('Erreur suppression parcelle', err)
    });
  }

  // New: navigate to parcel details (météo)
  openParcel(id: number) {
    this.router.navigate(['/parcelle', id]);
  }
}