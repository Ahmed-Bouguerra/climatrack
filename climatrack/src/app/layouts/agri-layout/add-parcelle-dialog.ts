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
type ParcelleStored = { id: number; name: string; lat: number; lng: number; polygon?: string };

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
  center: LatLng = { lat: 36.8, lng: 10.18 }; // centre par défaut (Tunisie)
  zoom = 8;
  path: LatLng[] = [];
  name = '';

  loaded = false; // true quand l'API google.maps est prête
  isBrowser = false;
  isGettingLocation = false;

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

      // Reporter la mise à true pour éviter ExpressionChangedAfterItHasBeenCheckedError
      Promise.resolve().then(() => {
        this.loaded = true;
        this.cd.detectChanges();
      });
    } catch (err) {
      console.error('Impossible de charger Google Maps API', err);
      alert('Erreur: impossible de charger Google Maps. Vérifiez votre clé API et la configuration GCP.');
    }
  }

  addPoint(event: google.maps.MapMouseEvent) {
    const latLng = event.latLng;
    if (!latLng) return;
    this.path = [...this.path, latLng.toJSON()];
  }

  removePoint(i: number) {
    this.path = this.path.filter((_, idx) => idx !== i);
  }

  private computeCentroid(path: LatLng[]): LatLng {
    if (!path.length) return this.center;
    const sum = path.reduce(
      (acc, p) => {
        acc.lat += p.lat;
        acc.lng += p.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    return { lat: sum.lat / path.length, lng: sum.lng / path.length };
  }

  // Fonction pour obtenir la localisation automatique
  async getCurrentLocation(): Promise<{ lat: number; lng: number; alt?: number } | null> {
    if (!this.isBrowser || !('geolocation' in navigator)) {
      console.warn('Geolocation non disponible');
      return null;
    }

    this.isGettingLocation = true;
    
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let alt: number | null = pos.coords.altitude ?? null;

          // Fallback à Open-Elevation si altitude manquante
          if (alt == null) {
            try {
              const resp = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
              const json = await resp.json();
              if (json?.results?.[0]?.elevation != null) {
                alt = Number(json.results[0].elevation);
              }
            } catch (e) {
              console.warn('OpenElevation failed', e);
            }
          }

          this.isGettingLocation = false;
          resolve({ lat, lng, alt: alt ?? undefined });
        },
        (err) => {
          console.warn('Erreur géolocalisation', err);
          this.isGettingLocation = false;
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // Bouton pour centrer la carte sur la position actuelle
  async centerOnMyLocation() {
    if (!this.isBrowser) return;

    const location = await this.getCurrentLocation();
    if (location) {
      this.center = { lat: location.lat, lng: location.lng };
      this.zoom = 15;
    } else {
      alert('Impossible d\'obtenir votre position. Vérifiez les permissions GPS.');
    }
  }

  // Ajouter un point à la position actuelle
  async addCurrentLocationPoint() {
    if (!this.isBrowser) return;

    const location = await this.getCurrentLocation();
    if (location) {
      this.path = [...this.path, { lat: location.lat, lng: location.lng }];
    } else {
      alert('Impossible d\'obtenir votre position. Vérifiez les permissions GPS.');
    }
  }

  save() {
    if (this.path.length < 3) {
      alert('Veuillez définir au moins 3 points pour la parcelle.');
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

    // Si on est dans le navigateur et on a user_id, sauvegarder sur le backend
    if (this.isBrowser) {
      const uidStr = localStorage.getItem('user_id');
      const user_id = uidStr ? Number(uidStr) : null;

      if (!user_id) {
        // Fallback local si utilisateur inconnu
        this.saveToLocal(newParcelleLocal);
        this.dialogRef.close({ saved: true, parcelle: newParcelleLocal, persisted: false });
        return;
      }

      const payload: any = {
        user_id: user_id,
        nom: newParcelleLocal.name,
        lat: newParcelleLocal.lat,
        lng: newParcelleLocal.lng,
        polygon: newParcelleLocal.polygon,
      };

      this.parcellesSvc.create(payload).subscribe({
        next: (created: any) => {
          console.log('Parcelle créée:', created);
          
          // Vérifier si la parcelle a besoin de coordonnées automatiques
          const hasLat = created.latitude != null || (created.lat != null && created.lng != null);
          
          // Si pas de coordonnées, essayer de les obtenir automatiquement
          if (!hasLat && 'geolocation' in navigator && this.isBrowser) {
            this.autoFillCoordinates(created);
          } else {
            // Fermer le dialogue avec succès
            this.dialogRef.close({ 
              saved: true, 
              parcelle: created, 
              persisted: true 
            });
          }
        },
        error: (err) => {
          console.error('Erreur sauvegarde parcelle sur le serveur', err);
          // Fallback: sauvegarder localement
          this.saveToLocal(newParcelleLocal);
          alert('La sauvegarde sur le serveur a échoué. La parcelle a été sauvegardée localement.');
          this.dialogRef.close({ 
            saved: true, 
            parcelle: newParcelleLocal, 
            persisted: false 
          });
        }
      });
    } else {
      // SSR ou pas de navigateur: sauvegarder localement
      this.saveToLocal(newParcelleLocal);
      this.dialogRef.close({ 
        saved: true, 
        parcelle: newParcelleLocal, 
        persisted: false 
      });
    }
  }

  // Fonction pour remplir automatiquement les coordonnées après création
  private autoFillCoordinates(createdParcelle: any) {
    if (!this.isBrowser || !('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let alt: number | null = pos.coords.altitude ?? null;

        // Fallback à Open-Elevation si altitude manquante
        if (alt == null) {
          try {
            const resp = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
            const json = await resp.json();
            if (json?.results?.[0]?.elevation != null) {
              alt = Number(json.results[0].elevation);
            }
          } catch (e) {
            console.warn('OpenElevation failed', e);
          }
        }

        // Mettre à jour la parcelle côté backend
        const updatePayload: any = {
          id: createdParcelle.id,
          latitude: String(lat),
          longitude: String(lng)
        };
        if (alt != null) updatePayload.altitude = String(alt);

        this.parcellesSvc.update(updatePayload).subscribe({
          next: (updated: any) => {
            console.log('Coordonnées automatiques enregistrées', updated);
            
            // Fermer le dialogue avec la parcelle mise à jour
            this.dialogRef.close({ 
              saved: true, 
              parcelle: updated, 
              persisted: true,
              autoCoords: true 
            });
          },
          error: (err) => {
            console.error('Erreur mise à jour coordonnées', err);
            // Fermer quand même avec la parcelle originale
            this.dialogRef.close({ 
              saved: true, 
              parcelle: createdParcelle, 
              persisted: true 
            });
          }
        });
      },
      (err) => {
        console.warn('Erreur géolocalisation', err);
        // Fermer avec la parcelle originale (sans coordonnées auto)
        this.dialogRef.close({ 
          saved: true, 
          parcelle: createdParcelle, 
          persisted: true 
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  private saveToLocal(parcelle: ParcelleStored) {
    try {
      const existingJson = localStorage.getItem('parcelles');
      const existing: ParcelleStored[] = existingJson ? JSON.parse(existingJson) : [];
      existing.push(parcelle);
      localStorage.setItem('parcelles', JSON.stringify(existing));
    } catch (e) {
      console.error('Erreur sauvegarde parcelle localement', e);
    }
  }

  cancel() {
    this.dialogRef.close({ saved: false });
  }
}