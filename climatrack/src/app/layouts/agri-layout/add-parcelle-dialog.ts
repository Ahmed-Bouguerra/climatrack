import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GoogleMapsModule } from '@angular/google-maps';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { GoogleMapsLoaderService } from '../../core/services/google.maps.loader.service';
import { ParcellesService } from '../../core/services/parcel.service';

type LatLng = google.maps.LatLngLiteral;
type ParcelleStored = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  polygon?: string;
};

@Component({
  selector: 'add-parcelle-dialog',
  standalone: true,
  imports: [
    CommonModule,
    GoogleMapsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './add-parcelle-dialog.html',
})
export class AddParcelleDialog implements OnInit {

  center: LatLng = { lat: 36.8, lng: 10.18 };
  zoom = 8;
  path: LatLng[] = [];
  name = '';

  loaded = false;
  isBrowser = false;
  isGettingLocation = false;

  // Display fields for Lat, Lng, Alt, Surface
  latitude: number | null = null;
  longitude: number | null = null;
  altitude: number | null = null;
  surface: number | null = null;
  fetchingAltitude = false;

  constructor(
    private dialogRef: MatDialogRef<AddParcelleDialog>,
    private gmapsLoader: GoogleMapsLoaderService,
    private cd: ChangeDetectorRef,
    private parcellesSvc: ParcellesService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.gmapsLoader.load();
      Promise.resolve().then(() => {
        this.loaded = true;
        this.cd.detectChanges();
      });
    } catch (err) {
      console.error('Impossible de charger Google Maps API', err);
      alert('Erreur Google Maps API');
    }
  }

  addPoint(event: google.maps.MapMouseEvent) {
    if (!event.latLng) return;
    this.path = [...this.path, event.latLng.toJSON()];
    this.updateCentroidAndAltitude();
  }

  removePoint(i: number) {
    this.path = this.path.filter((_, idx) => idx !== i);
    this.updateCentroidAndAltitude();
  }

  private computeCentroid(path: LatLng[]): LatLng {
    const sum = path.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
      { lat: 0, lng: 0 }
    );
    return { lat: sum.lat / path.length, lng: sum.lng / path.length };
  }

  private updateCentroidAndAltitude() {
    if (this.path.length < 3) {
      this.latitude = this.longitude = this.altitude = this.surface = null;
      return;
    }
    const centroid = this.computeCentroid(this.path);
    this.latitude = centroid.lat;
    this.longitude = centroid.lng;
    this.surface = this.computeSurface(this.path);
    this.fetchAltitude(centroid.lat, centroid.lng);
  }

  private computeSurface(path: LatLng[]): number | null {
    if (!this.loaded || !path || path.length < 3) return null;
    try {
      // Use Google Maps Geometry library to compute area
      const area = (window as any).google.maps.geometry.spherical.computeArea(path);
      return area; // in square meters
    } catch (e) {
      console.warn('Failed to compute surface area', e);
      return null;
    }
  }

  private async fetchAltitude(lat: number, lng: number) {
    this.fetchingAltitude = true;
    this.altitude = null;
    // Use open-elevation API for altitude
    try {
      const resp = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.results && json.results[0] && json.results[0].elevation != null) {
          this.altitude = Number(json.results[0].elevation);
        }
      }
    } catch (e) {
      console.warn('open-elevation failed', e);
    }
    this.fetchingAltitude = false;
    this.cd.detectChanges();
  }

  // ===================== SAVE =====================
  save() {
    if (this.path.length < 3) {
      alert('Au moins 3 points requis');
      return;
    }

    const centroid = this.computeCentroid(this.path);
    const newParcelleLocal: ParcelleStored = {
      id: Date.now(),
      name: this.name?.trim() || `Parcelle ${Date.now()}`,
      lat: centroid.lat,
      lng: centroid.lng,
      polygon: JSON.stringify(this.path),
    };

    const uidStr = this.isBrowser ? localStorage.getItem('user_id') : null;
    const user_id = uidStr ? Number(uidStr) : null;

    // ===================== LOCAL ONLY =====================
    if (!user_id) {
      this.saveToLocal(newParcelleLocal);
      this.parcellesSvc.notifyCreated(newParcelleLocal);

      this.dialogRef.close({
        saved: true,
        parcelle: newParcelleLocal,
        persisted: false
      });
      return;
    }

    // ===================== SERVER =====================
    const payload: any = {
      user_id,
      nom: newParcelleLocal.name,
      latitude: newParcelleLocal.lat,
      longitude: newParcelleLocal.lng,
      polygon: newParcelleLocal.polygon,
    };
    if (this.altitude != null) {
      payload.altitude = this.altitude;
    }
    if (this.surface != null) {
      payload.surface = this.surface;
    }

    this.parcellesSvc.create(payload).subscribe({
      next: (created: any) => {
        console.log('Parcelle créée:', created);

        // notify immédiatement
        this.parcellesSvc.notifyCreated(created);

        const hasLat =
          created.latitude != null ||
          (created.lat != null && created.lng != null);

        if (!hasLat && this.isBrowser && 'geolocation' in navigator) {
          this.autoFillCoordinates(created);
        } else {
          this.dialogRef.close({
            saved: true,
            parcelle: created,
            persisted: true
          });
        }
      },

      error: (err) => {
        console.error('Erreur serveur', err);

        this.saveToLocal(newParcelleLocal);
        this.parcellesSvc.notifyCreated(newParcelleLocal);

        alert('Sauvegarde serveur échouée, sauvegarde locale.');

        this.dialogRef.close({
          saved: true,
          parcelle: newParcelleLocal,
          persisted: false
        });
      }
    });
  }

  // ===================== AUTO GEO =====================
  private autoFillCoordinates(createdParcelle: any) {
    if (!this.isBrowser || !('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let alt: number | null = pos.coords.altitude ?? null;

        if (alt == null) {
          try {
            const resp = await fetch(
              `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
            );
            const json = await resp.json();
            alt = json?.results?.[0]?.elevation ?? null;
          } catch {}
        }

        const updatePayload: any = {
          id: createdParcelle.id,
          latitude: String(lat),
          longitude: String(lng),
        };
        if (alt != null) updatePayload.altitude = String(alt);

        this.parcellesSvc.update(updatePayload).subscribe({
          next: (updated: any) => {
            console.log('Auto coords saved', updated);

            this.parcellesSvc.notifyCreated(updated);

            this.dialogRef.close({
              saved: true,
              parcelle: updated,
              persisted: true,
              autoCoords: true
            });
          },
          error: () => {
            this.dialogRef.close({
              saved: true,
              parcelle: createdParcelle,
              persisted: true
            });
          }
        });
      },
      () => {
        this.dialogRef.close({
          saved: true,
          parcelle: createdParcelle,
          persisted: true
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ===================== LOCAL STORAGE =====================
  private saveToLocal(parcelle: ParcelleStored) {
    try {
      const json = localStorage.getItem('parcelles');
      const list: ParcelleStored[] = json ? JSON.parse(json) : [];
      list.push(parcelle);
      localStorage.setItem('parcelles', JSON.stringify(list));
    } catch (e) {
      console.error('Local save error', e);
    }
  }

  cancel() {
    this.dialogRef.close({ saved: false });
  }
}