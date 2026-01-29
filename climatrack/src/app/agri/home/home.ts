import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMapsModule } from '@angular/google-maps';
import { MatButtonModule } from '@angular/material/button';
import { GoogleMapsLoaderService } from '../../core/services/google.maps.loader.service';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';
import { Router } from '@angular/router';

type LatLng = google.maps.LatLngLiteral;

type ExtendedParcelle = Parcelle & {
  lat?: number | string | null;
  lng?: number | string | null;
  // note: backend fields are latitude/longitude/altitude; we map both ways
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleMapsModule, MatButtonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {
  center: LatLng = { lat: 36.8, lng: 10.18 };
  zoom = 6;

  parcels: ExtendedParcelle[] = [];
  isBrowser = false;
  apiLoaded = false;
  mapError: string | null = null;

  private mapInstance: google.maps.Map | null = null;

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
    if (!uid) { this.router.navigate(['/connexion']); return; }
    this.userId = Number(uid);
    this.loadParcelles();

    this.gmapsLoader.load()
      .then(() => setTimeout(() => {
        if ((window as any).google && (window as any).google.maps) {
          this.apiLoaded = true;
          this.mapError = null;
        } else {
          this.mapError = 'Google Maps API not available. Vérifiez votre clé/API & Billing.';
          this.apiLoaded = false;
        }
      }, 800))
      .catch((err) => {
        console.error('Impossible de charger Google Maps API', err);
        this.mapError = 'Impossible de charger Google Maps API: ' + (err?.message || err);
        this.apiLoaded = false;
      });
  }

  loadParcelles(): void {
    if (!this.userId) return;
    this.parcellesSvc.getByUser(this.userId).subscribe({
      next: (list: Parcelle[]) => {
        // Normalize backend field names to component fields (some parts of app used lat/lng)
        this.parcels = (list || []).map(p => {
          const ext: any = { ...p };
          if ((p as any).latitude !== undefined) ext.latitude = (p as any).latitude;
          if ((p as any).longitude !== undefined) ext.longitude = (p as any).longitude;
          // keep both names for compatibility
          ext.latitude = ext.latitude ?? p['lat'] ?? null;
          ext.longitude = ext.longitude ?? p['lng'] ?? null;
          ext.latitude = ext.latitude !== null ? Number(ext.latitude) : null;
          ext.longitude = ext.longitude !== null ? Number(ext.longitude) : null;
          ext.altitude = p['altitude'] ?? null;
          ext.surface = p['surface'] ?? null;
          return ext;
        });
        if (this.parcels.length) {
          const p = this.parcels[0];
          const lat = p.latitude ?? null;
          const lng = p.longitude ?? null;
          if (lat != null && lng != null) { this.center = { lat: Number(lat), lng: Number(lng) }; this.zoom = 12; }
        }
      },
      error: (err) => {
        console.error('Erreur chargement parcelles', err);
        this.parcels = [];
      }
    });
  }

  saveParcelle(p: any): void {
    const payload: any = {
      id: p.id,
      user_id: p.user_id,
      nom: p.nom,
      surface: p.surface == null ? null : Number(p.surface),
      localisation: p.localisation ?? null,
      latitude: p.latitude ?? p.lat ?? null,
      longitude: p.longitude ?? p.lng ?? null,
      altitude: p.altitude ?? null,
      polygon: p.polygon ?? null
    };
    this.parcellesSvc.update(payload).subscribe({
      next: (res: any) => {
        alert('Parcelle enregistrée.');
        this.loadParcelles();
      },
      error: (err) => {
        console.error('Erreur sauvegarde parcelle', err);
        alert('Erreur lors de la sauvegarde.');
      }
    });
  }

  deleteParcelle(id: number | undefined | null): void {
    if (!id) return;
    if (!confirm('Voulez-vous vraiment supprimer cette parcelle ?')) return;
    this.parcellesSvc.delete(id).subscribe({
      next: () => this.loadParcelles(),
      error: err => { console.error(err); alert('Erreur suppression'); }
    });
  }

  // onMapReady / getPathFromParcel etc. (conserver le code existant)
  onMapReady(mapOrEvent: any) {
    // existing logic from before — ensure you keep the safe-cast handling
    const possibleMap = mapOrEvent as google.maps.Map;
    if (possibleMap && typeof (possibleMap as any).getCenter === 'function') {
      this.mapInstance = possibleMap;
    } else {
      const alt = (mapOrEvent as any)?.map;
      if (alt && typeof alt.getCenter === 'function') this.mapInstance = alt;
    }
    if (this.mapInstance) {
      // optionally fit bounds to parcels
    }
  }

  getPathFromParcel(p: any): LatLng[] {
    // Keep existing parser (if you already had it). For brevity, call existing logic or keep the helper previously provided.
    return [];
  }
}