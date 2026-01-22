import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMapsModule } from '@angular/google-maps';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { GoogleMapsLoaderService } from '../../core/services/google.maps.loader.service';

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

  constructor(
    private dialogRef: MatDialogRef<AddParcelleDialog>,
    private gmapsLoader: GoogleMapsLoaderService,
    private cd: ChangeDetectorRef
  ) {}

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

  save() {
    if (this.path.length < 3) {
      alert('Veuillez définir au moins 3 points pour la parcelle.');
      return;
    }

    const centroid = this.computeCentroid(this.path);
    const newParcelle: ParcelleStored = {
      id: Date.now(),
      name: this.name?.trim() || `Parcelle ${Date.now()}`,
      lat: centroid.lat,
      lng: centroid.lng,
      polygon: JSON.stringify(this.path),
    };

    try {
      const existingJson = localStorage.getItem('parcelles');
      const existing: ParcelleStored[] = existingJson ? JSON.parse(existingJson) : [];
      existing.push(newParcelle);
      localStorage.setItem('parcelles', JSON.stringify(existing));
    } catch (e) {
      console.error('Erreur sauvegarde parcelle', e);
    }

    this.dialogRef.close({ saved: true, parcelle: newParcelle });
  }

  cancel() {
    this.dialogRef.close({ saved: false });
  }
}