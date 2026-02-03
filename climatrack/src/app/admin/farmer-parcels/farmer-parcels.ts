import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, ElementRef, OnDestroy, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';
import { Subscription } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { GoogleMapsLoaderService } from '../../core/services/google.maps.loader.service';

@Component({
  selector: 'app-farmer-parcels',
  standalone: true,
  imports: [CommonModule, MatTableModule, RouterModule],
  templateUrl: './farmer-parcels.html',
  styleUrls: ['./farmer-parcels.scss']
})
export class FarmerParcels implements OnInit {
  parcels: Parcelle[] = [];
  mapError: string | null = null;
  isBrowser = false;
  apiLoaded = false;
  center: { lat: number; lng: number } = { lat: 0, lng: 0 };
  zoom = 8;
  loading = false;
  error: string | null = null;

  // pick-from-map state
  selectedParcelId: number | null = null;
  pickLat: number | null = null;
  pickLng: number | null = null;
  pickAlt: number | null = null;
  savingCoords = false;

  private map: any = null;
  private markers: any[] = [];
  private polygons: any[] = [];
  private tempMarker: any = null;
  private elevationService: any = null;
  private subs = new Subscription();

  @ViewChild('mapElement', { static: false }) mapElement!: ElementRef<HTMLDivElement>;

  displayedColumns: string[] = ['nom', 'surface', 'latitude', 'longitude', 'altitude', 'actions'];

  constructor(
    private parcellesSvc: ParcellesService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object,
    private gmapsLoader: GoogleMapsLoaderService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    console.log('FarmerParcels ngOnInit called');
    if (this.isBrowser) {
      // Try snapshot first
      const snapshotId = this.route.snapshot.params['id'];
      console.log('Route snapshot params:', this.route.snapshot.params);
      console.log('Farmer ID from snapshot:', snapshotId);
      if (snapshotId) {
        const farmerId = Number(snapshotId);
        if (farmerId) {
          this.loadParcelles(farmerId);
        } else {
          console.error('Invalid farmer ID from snapshot');
          this.error = 'ID agriculteur invalide dans l\'URL';
          this.loading = false;
        }
      } else {
        // Fallback to subscribe
        this.route.params.subscribe(params => {
          console.log('Route params from subscribe:', params);
          const farmerId = Number(params['id']);
          console.log('Farmer ID from subscribe:', farmerId);
          if (farmerId) {
            this.loadParcelles(farmerId);
          } else {
            console.error('No farmer ID in route params');
            this.error = 'ID agriculteur manquant dans l\'URL';
            this.loading = false;
          }
        });
      }
    }

    // Subscribe to new parcel creations
    this.subs.add(this.parcellesSvc.created$.subscribe((newParcelle: any) => {
      if (newParcelle && newParcelle.id) {
        // Reload parcels to include the new one
        const snapshotId = this.route.snapshot.params['id'];
        if (snapshotId) {
          const farmerId = Number(snapshotId);
          if (farmerId) {
            this.loadParcelles(farmerId);
          }
        }
      }
    }));
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.gmapsLoader.load().then(() => {
      this.apiLoaded = true;
      // initialize map after view
      setTimeout(() => this.initializeMap(), 0);
    }).catch((err: any) => {
      // Keep the app usable even if Maps failed (BillingNotEnabled etc.)
      this.mapError = err?.message ? String(err.message) : String(err);
      this.apiLoaded = false;
      console.warn('Google Maps load failed:', err);
      // still allow picking from table (startPickCoords uses stored coords + fallback altitude)
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private initializeMap() {
    if (!this.mapElement) return;
    try {
      const initial = { lat: this.center.lat || 0, lng: this.center.lng || 0 };
      this.map = new (window as any).google.maps.Map(this.mapElement.nativeElement, {
        center: initial,
        zoom: this.zoom,
        mapTypeControl: false,
        fullscreenControl: false
      });

      // Elevation service for altitude lookup
      this.elevationService = new (window as any).google.maps.ElevationService();

      // click on map => pick coords (when a parcel is selected)
      this.map.addListener('click', (evt: any) => {
        const latLng = (evt && evt.latLng) ? evt.latLng : null;
        if (!latLng) return;
        this.onMapClick(latLng);
      });

      this.renderParcelsOnMap();
    } catch (e) {
      console.warn('initializeMap error', e);
      // leave map undefined if google.maps not present
      this.map = null;
    }
  }

  loadParcelles(userId: number) {
    this.loading = true;
    console.log('Loading parcels for userId:', userId);
    this.ngZone.runOutsideAngular(() => {
      this.parcellesSvc.getByUser(userId).subscribe({
        next: (list: Parcelle[]) => {
          console.log('Parcels loaded:', list);
          this.ngZone.run(() => {
            this.parcels = [...(list || [])];
            if (this.parcels.length > 0) {
              const p0: any = this.parcels[0];
              const lat = p0.latitude ?? p0.lat;
              const lng = p0.longitude ?? p0.lng;
              if (lat != null && lng != null) {
                this.center = { lat: Number(lat), lng: Number(lng) };
                if (this.map) {
                  this.map.setCenter(this.center);
                }
              }
            }
            this.loading = false;
            this.cdr.detectChanges();
            if (this.apiLoaded && this.map) this.renderParcelsOnMap();
          });
        },
        error: (err: any) => {
          console.error('Erreur chargement parcelles:', err);
          this.ngZone.run(() => {
            this.error = 'Erreur lors du chargement des parcelles: ' + (err.message || err);
            this.loading = false;
            this.cdr.detectChanges();
          });
        }
      });
    });
  }

  voirDetails(id: number) {
    this.router.navigate(['/admin/parcelle', id]);
  }

  deleteParcelle(id: number) {
    if (!confirm('Supprimer cette parcelle ?')) return;
    this.parcellesSvc.delete(id).subscribe({
      next: () => {
        this.parcels = this.parcels.filter(p => p.id !== id);
        if (this.apiLoaded && this.map) this.renderParcelsOnMap();
      },
      error: (err: any) => {
        console.error('Erreur suppression parcelle', err);
        alert('Erreur lors de la suppression');
      }
    });
  }

  // ----- PICK COORDS features -----
  startPickCoords(parcelleId: number) {
    // populate pick fields from parcel data (works even without map)
    this.selectedParcelId = parcelleId;
    const p = this.parcels.find(x => x.id === parcelleId) as any;
    this.pickLat = p ? (p.latitude ?? p.lat ?? null) : null;
    this.pickLng = p ? (p.longitude ?? p.lng ?? null) : null;
    this.pickAlt = p ? (p.altitude ?? null) : null;

    // If altitude missing, attempt to fetch fallback altitude
    if ((this.pickAlt == null) && (this.pickLat != null && this.pickLng != null)) {
      this.fetchAltitudeFallback(this.pickLat, this.pickLng).then((a) => {
        if (a != null) this.pickAlt = a;
      }).catch(() => { /* ignore */ });
    }

    // place marker if map available
    if (this.pickLat != null && this.pickLng != null && this.map) {
      this.placeTempMarker({ lat: Number(this.pickLat), lng: Number(this.pickLng) });
      this.map.panTo({ lat: Number(this.pickLat), lng: Number(this.pickLng) });
      this.map.setZoom(Math.max(this.map.getZoom(), 14));
    }
  }

  cancelPick() {
    this.clearTempMarker();
    this.selectedParcelId = null;
    this.pickLat = this.pickLng = this.pickAlt = null;
  }

  // Called when user clicks a marker or polygon on the map
  private selectParcelFromMap(p: Parcelle) {
    if (!p) return;
    this.selectedParcelId = p.id;

    let lat = p.latitude ?? (p as any).lat ?? null;
    let lng = p.longitude ?? (p as any).lng ?? null;
    let alt = p.altitude ?? null;

    // if no point coords but polygon exists, compute average of vertices (centroid approx)
    if ((lat == null || lng == null) && p.polygon) {
      try {
        const coords = JSON.parse(p.polygon);
        if (Array.isArray(coords) && coords.length) {
          const pts: Array<{ lat: number; lng: number }> = coords.map((c: any) => {
            if (Array.isArray(c) && c.length >= 2) return { lat: Number(c[0]), lng: Number(c[1]) };
            if (c.lat != null && c.lng != null) return { lat: Number(c.lat), lng: Number(c.lng) };
            return null as any;
          }).filter(Boolean);
          if (pts.length) {
            const sum = pts.reduce((acc, v) => ({ lat: acc.lat + v.lat, lng: acc.lng + v.lng }), { lat: 0, lng: 0 });
            lat = sum.lat / pts.length;
            lng = sum.lng / pts.length;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    this.pickLat = lat != null ? Number(lat) : null;
    this.pickLng = lng != null ? Number(lng) : null;
    this.pickAlt = alt != null ? Number(alt) : null;

    // if altitude missing, try fallback
    if ((this.pickAlt == null) && (this.pickLat != null && this.pickLng != null)) {
      this.fetchAltitudeFallback(this.pickLat, this.pickLng).then((a) => {
        if (a != null) this.pickAlt = a;
      }).catch(() => { /* ignore */ });
    }

    if (this.pickLat != null && this.pickLng != null && this.map) {
      this.placeTempMarker({ lat: Number(this.pickLat), lng: Number(this.pickLng) });
      this.map.panTo({ lat: Number(this.pickLat), lng: Number(this.pickLng) });
      this.map.setZoom(Math.max(this.map.getZoom(), 14));
    }
  }

  private onMapClick(latLng: any) {
    if (this.selectedParcelId == null) return;
    const lat = latLng.lat();
    const lng = latLng.lng();
    this.pickLat = Number(lat);
    this.pickLng = Number(lng);

    this.placeTempMarker({ lat: this.pickLat, lng: this.pickLng });

    // altitude via Google Elevation if present, otherwise fallback
    this.fetchAltitudeFallback(this.pickLat, this.pickLng).then((a) => {
      this.pickAlt = a;
    }).catch(() => { this.pickAlt = null; });
  }

  private placeTempMarker(pos: { lat: number; lng: number }) {
    if (!this.map) return;
    if (!this.tempMarker) {
      this.tempMarker = new (window as any).google.maps.Marker({
        position: pos,
        map: this.map,
        draggable: true,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ff9800',
          fillOpacity: 0.95,
          strokeWeight: 1,
          strokeColor: '#b25a00'
        },
        title: 'Position choisie (déplaçable)'
      });

      this.tempMarker.addListener('dragend', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        this.pickLat = Number(lat);
        this.pickLng = Number(lng);
        this.fetchAltitudeFallback(this.pickLat, this.pickLng).then((a) => {
          this.pickAlt = a;
        }).catch(() => { this.pickAlt = null; });
      });
    } else {
      this.tempMarker.setPosition(pos);
      this.tempMarker.setMap(this.map);
    }
  }

  private clearTempMarker() {
    if (this.tempMarker) {
      this.tempMarker.setMap(null);
      this.tempMarker = null;
    }
  }

  // Try Google Elevation first, else fallback to open-elevation API
  private async fetchAltitudeFallback(lat: number, lng: number): Promise<number | null> {
    // Try Google Elevation service if available
    try {
      if (this.elevationService && (window as any).google && (window as any).google.maps) {
        return await new Promise<number | null>((resolve) => {
          this.elevationService.getElevationForLocations({ locations: [{ lat, lng }] }, (results: any, status: any) => {
            if (status === (window as any).google.maps.ElevationStatus.OK && results && results.length) {
              resolve(Number(results[0].elevation.toFixed(2)));
            } else {
              resolve(null);
            }
          });
        });
      }
    } catch (e) {
      // continue to fallback
      console.warn('Google Elevation failed', e);
    }

    // Fallback: public open-elevation API
    try {
      const resp = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
      if (!resp.ok) return null;
      const json = await resp.json();
      if (json && json.results && json.results[0] && json.results[0].elevation != null) {
        return Number(json.results[0].elevation);
      }
    } catch (e) {
      console.warn('open-elevation failed', e);
    }
    return null;
  }

  savePickedCoordinatesForParcel() {
    if (!this.selectedParcelId) return;
    if (this.pickLat == null || this.pickLng == null) {
      alert('Latitude et longitude requises');
      return;
    }
    this.savingCoords = true;
    const payload: any = {
      id: this.selectedParcelId,
      latitude: String(this.pickLat),
      longitude: String(this.pickLng)
    };
    if (this.pickAlt != null) payload.altitude = String(this.pickAlt);

    this.parcellesSvc.update(payload).subscribe({
      next: (updated: any) => {
        this.savingCoords = false;
        const uidStr = localStorage.getItem('user_id');
        if (uidStr) this.loadParcelles(Number(uidStr));
        else this.loadParcellesForFallback();
        this.clearTempMarker();
        this.selectedParcelId = null;
        this.pickLat = this.pickLng = this.pickAlt = null;
        alert('Coordonnées enregistrées');
      },
      error: (err: any) => {
        console.error('Erreur sauvegarde coords', err);
        this.savingCoords = false;
        alert('Erreur lors de la sauvegarde des coordonnées');
      }
    });
  }

  // fallback loader (if no user_id)
  private loadParcellesForFallback() {
    const uidStr = localStorage.getItem('user_id');
    if (uidStr) this.loadParcelles(Number(uidStr));
  }

  // Map rendering helpers
  private clearMapObjects() {
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
    this.polygons.forEach(poly => poly.setMap(null));
    this.polygons = [];
  }

  private renderParcelsOnMap() {
    if (!this.map || !this.parcels) return;
    this.clearMapObjects();

    const bounds = new (window as any).google.maps.LatLngBounds();
    let hasAny = false;

    for (const p of this.parcels) {
      const lat = p.latitude ?? (p as any).lat;
      const lng = p.longitude ?? (p as any).lng;

      if (lat != null && lng != null) {
        const pos = { lat: Number(lat), lng: Number(lng) };
        hasAny = true;

        const marker = new (window as any).google.maps.Marker({
          position: pos,
          map: this.map,
          title: p.nom || `Parcelle ${p.id}`
        });

        marker.addListener('click', () => {
          const info = new (window as any).google.maps.InfoWindow({
            content: `<div style="min-width:150px;"><strong>${p.nom || 'Parcelle ' + p.id}</strong><div>ID: ${p.id}</div><div>Alt: ${p.altitude ?? '-'}</div></div>`
          });
          info.open(this.map, marker);
          // select parcel and fill pick fields
          this.selectParcelFromMap(p);
        });

        this.markers.push(marker);
        bounds.extend(pos);
      } else if (p.polygon) {
        try {
          const coords = JSON.parse(p.polygon);
          if (Array.isArray(coords) && coords.length) {
            const path = coords.map((c: any) => {
              if (Array.isArray(c) && c.length >= 2) return { lat: Number(c[0]), lng: Number(c[1]) };
              if (c.lat != null && c.lng != null) return { lat: Number(c.lat), lng: Number(c.lng) };
              return null;
            }).filter((x: any) => x);
            if (path.length) {
              const polygon = new (window as any).google.maps.Polygon({
                paths: path,
                strokeColor: '#1976d2',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#1976d2',
                fillOpacity: 0.15,
                map: this.map
              });

              polygon.addListener('click', (e: any) => {
                this.selectParcelFromMap(p);
              });

              this.polygons.push(polygon);
              path.forEach((pt: any) => bounds.extend(pt));
              hasAny = true;
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    if (hasAny) {
      this.map.fitBounds(bounds, 40);
    } else if (this.center && this.center.lat !== 0 && this.center.lng !== 0) {
      this.map.setCenter(this.center);
      this.map.setZoom(this.zoom);
    }
  }

  getPathFromParcel(p: Parcelle): Array<{ lat: number; lng: number }> {
    return [];
  }

  onMapReady(_map: any) {}
  // In your component
reloadPage() {
  window.location.reload();
}
}