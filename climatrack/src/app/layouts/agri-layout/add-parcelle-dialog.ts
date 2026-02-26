import { Component, OnInit, AfterViewInit, ChangeDetectorRef, Injector } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { ParcellesService } from '../../core/services/parcel.service';
// Leaflet is loaded from CDN in index.html and referenced via global `L`

interface LatLng { lat: number; lng: number; }
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
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './add-parcelle-dialog.html',
})
export class AddParcelleDialog implements OnInit, AfterViewInit {

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

  // Leaflet runtime objects
  private map: any = null;
  private leafletMarkers: any[] = [];
  private leafletPolygon: any = null;

  constructor(
    private injector: Injector,
    private cd: ChangeDetectorRef,
    private parcellesSvc: ParcellesService
  ) {
    try {
      // try to read PLATFORM_ID via injector if available; fallback to window check
      const platformId = this.injector.get((<any>Object).PLATFORM_ID as any, undefined);
      this.isBrowser = typeof window !== 'undefined' && platformId !== 'server';
    } catch {
      this.isBrowser = typeof window !== 'undefined';
    }
  }

  async ngOnInit(): Promise<void> {
    // For Leaflet we don't need the Google loader — simply mark loaded on browser
    if (this.isBrowser) {
      this.loaded = true;
      this.cd.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    const L = (window as any).L;
    if (!L) {
      console.error('Leaflet (L) not found on window');
      return;
    }
    this.initLeafletMap(L);
  }

  private initLeafletMap(L: any) {
    try {
      this.map = L.map('map').setView([this.center.lat, this.center.lng], this.zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      this.map.on('click', (e: any) => {
        const latlng = { lat: e.latlng.lat, lng: e.latlng.lng } as LatLng;
        this.addPointFromLeaflet(latlng);
      });

      // restore any initial path markers (none initially)
    } catch (err) {
      console.error('Leaflet init failed', err);
    }
  }

  private addPointFromLeaflet(latlng: LatLng) {
    this.path = [...this.path, latlng];

    // add marker
    if (this.map) {
      const L = (window as any).L;
      const marker = L.marker([latlng.lat, latlng.lng]).addTo(this.map).bindTooltip(String(this.path.length), {permanent: true, direction: 'top'});
      this.leafletMarkers.push(marker);

      // update polygon
      if (this.leafletPolygon) {
        this.map.removeLayer(this.leafletPolygon);
        this.leafletPolygon = null;
      }
      if (this.path.length > 1) {
        const Lpoly = L.polygon(this.path.map(p => [p.lat, p.lng]), { color: '#ff0000', fillOpacity: 0.2 }).addTo(this.map);
        this.leafletPolygon = Lpoly;
      }
    }

    this.updateCentroidAndAltitude();
  }

  removePoint(i: number) {
    this.path = this.path.filter((_, idx) => idx !== i);
    // remove marker layer
    const marker = this.leafletMarkers[i];
    if (marker && this.map) {
      this.map.removeLayer(marker);
    }
    this.leafletMarkers = this.leafletMarkers.filter((_, idx) => idx !== i);

    // rebuild polygon
    if (this.leafletPolygon && this.map) {
      this.map.removeLayer(this.leafletPolygon);
      this.leafletPolygon = null;
    }
    if (this.path.length > 1 && this.map) {
      const L = (window as any).L;
      this.leafletPolygon = L.polygon(this.path.map(p => [p.lat, p.lng]), { color: '#ff0000', fillOpacity: 0.2 }).addTo(this.map);
    }

    this.updateCentroidAndAltitude();
  }

  private computeCentroid(path: LatLng[]): LatLng {
    const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
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
    if (!path || path.length < 3) return null;
    try {
      // approximate area by projecting to Web Mercator and using shoelace
      const R = 6378137; // earth radius in meters
      const pts = path.map(p => {
        const latRad = p.lat * Math.PI / 180;
        const lonRad = p.lng * Math.PI / 180;
        const x = R * lonRad;
        const y = R * Math.log(Math.tan(Math.PI/4 + latRad/2));
        return { x, y };
      });
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      }
      return Math.abs(area) / 2;
    } catch (e) {
      console.warn('Failed to compute surface area (leaflet)', e);
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

      const dialogRef = this.injector.get<any>(MatDialogRef as any, null);
      if (dialogRef) {
        (dialogRef as any).close({ saved: true, parcelle: newParcelleLocal, persisted: false });
      }
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
          const dialogRef2 = this.injector.get<any>(MatDialogRef as any, null);
          if (dialogRef2) (dialogRef2 as any).close({ saved: true, parcelle: created, persisted: true });
        }
      },

      error: (err) => {
        console.error('Erreur serveur', err);

        this.saveToLocal(newParcelleLocal);
        this.parcellesSvc.notifyCreated(newParcelleLocal);

        alert('Sauvegarde serveur échouée, sauvegarde locale.');

        const dialogRef3 = this.injector.get<any>(MatDialogRef as any, null);
        if (dialogRef3) (dialogRef3 as any).close({ saved: true, parcelle: newParcelleLocal, persisted: false });
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

            const dialogRef4 = this.injector.get<any>(MatDialogRef as any, null);
            if (dialogRef4) (dialogRef4 as any).close({ saved: true, parcelle: updated, persisted: true, autoCoords: true });
          },
          error: () => {
            const dialogRef5 = this.injector.get<any>(MatDialogRef as any, null);
            if (dialogRef5) (dialogRef5 as any).close({ saved: true, parcelle: createdParcelle, persisted: true });
          }
        });
      },
      () => {
        const dialogRef6 = this.injector.get<any>(MatDialogRef as any, null);
        if (dialogRef6) (dialogRef6 as any).close({ saved: true, parcelle: createdParcelle, persisted: true });
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
    const dialogRef7 = this.injector.get<any>(MatDialogRef as any, null);
    if (dialogRef7) (dialogRef7 as any).close({ saved: false });
  }
}