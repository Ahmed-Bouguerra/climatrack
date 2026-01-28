import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GoogleMapsModule } from '@angular/google-maps';
import { GoogleMapsLoaderService } from '../../core/services/google.maps.loader.service';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';
import { Router } from '@angular/router';

type LatLng = google.maps.LatLngLiteral;

// Extend backend Parcelle shape with optional fields the UI uses
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
})
export class Home implements OnInit {
  center: LatLng = { lat: 36.8, lng: 10.18 };
  zoom = 6;

  parcels: ExtendedParcelle[] = [];
  isBrowser = false;
  apiLoaded = false;
  mapError: string | null = null;

  // map runtime
  private mapInstance: google.maps.Map | null = null;
  private markers: any[] = [];

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
    // Only attempt browser-only actions on client
    if (!this.isBrowser) return;

    // read logged user id from localStorage (must be set at login)
    const uid = localStorage.getItem('user_id');
    if (!uid) {
      // if not logged, redirect to login
      this.router.navigate(['/connexion']);
      return;
    }
    this.userId = Number(uid);

    // load parcels from backend for this user
    this.loadParcelles();

    // start loading Google Maps API (loader handles single injection)
    this.gmapsLoader.load()
      .then(() => {
        // small delay to let the script attach globals reliably
        setTimeout(() => {
          if ((window as any).google && (window as any).google.maps) {
            this.apiLoaded = true;
            this.mapError = null;
          } else {
            this.mapError = 'Google Maps API not available (possible billing/key issue). Vérifiez votre clé/API & Billing.';
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
        // Cast received list to ExtendedParcelle[]
        this.parcels = list as ExtendedParcelle[];
        // if we have at least one parcel, center map on first (if it has lat/lng)
        if (this.parcels.length) {
          const p = this.parcels[0];
          const lat = p.lat != null ? Number(p.lat) : null;
          const lng = p.lng != null ? Number(p.lng) : null;
          if (lat !== null && !Number.isNaN(lat) && lng !== null && !Number.isNaN(lng)) {
            this.center = { lat, lng };
            this.zoom = 10;
          }
        }
        // if map already ready, refresh markers
        if (this.mapInstance) this.renderMarkers();
      },
      error: (err: any) => {
        console.error('Erreur chargement parcelles', err);
        this.parcels = [];
      }
    });
  }

  deleteParcelle(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer cette parcelle ?')) return;
    this.parcellesSvc.delete(id).subscribe({
      next: () => {
        // reload list
        this.loadParcelles();
      },
      error: (err) => {
        console.error('Erreur suppression parcelle', err);
        alert('Erreur lors de la suppression.');
      }
    });
  }

  // Map-related: called by <google-map (mapReady)="onMapReady($event)">
  onMapReady(mapOrEvent: any) {
    if (!this.isBrowser) return;
    if (mapOrEvent && typeof mapOrEvent.getCenter === 'function') {
      this.mapInstance = mapOrEvent as google.maps.Map;
    } else if (mapOrEvent?.target && typeof mapOrEvent.target.getCenter === 'function') {
      this.mapInstance = mapOrEvent.target as google.maps.Map;
    } else {
      this.mapInstance = (mapOrEvent as any) as google.maps.Map;
    }
    // render markers when map ready
    this.renderMarkers();
  }

  private renderMarkers() {
    // clear existing markers
    this.markers.forEach(m => {
      try {
        if (typeof m.setMap === 'function') m.setMap(null);
        else if ('map' in m) (m as any).map = null;
      } catch {}
    });
    this.markers = [];

    if (!this.mapInstance || !this.parcels.length) return;

    for (const p of this.parcels) {
      try {
        const lat = p.lat != null ? Number(p.lat) : null;
        const lng = p.lng != null ? Number(p.lng) : null;
        if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) continue;

        const position = { lat, lng };
        const AdvancedMarkerCtor = (google as any)?.maps?.marker?.AdvancedMarkerElement;
        if (AdvancedMarkerCtor) {
          const content = document.createElement('div');
          content.className = 'advanced-marker';
          content.textContent = p.nom || '';
          const adv = new AdvancedMarkerCtor({
            map: this.mapInstance,
            position,
            content,
          });
          this.markers.push(adv);
        } else {
          const mk = new google.maps.Marker({
            map: this.mapInstance,
            position,
            title: p.nom || '',
          });
          this.markers.push(mk);
        }
      } catch (err) {
        console.error('Erreur création marker', err);
      }
    }
  }

  // helper: parse polygon stored as JSON string to LatLng[]
  getPathFromParcel(p: ExtendedParcelle): LatLng[] {
    if (!p?.polygon) return [];
    try {
      const parsed = JSON.parse(p.polygon) as LatLng[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}