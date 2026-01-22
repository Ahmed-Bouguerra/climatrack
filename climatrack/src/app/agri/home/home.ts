import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMapsModule } from '@angular/google-maps';

type LatLng = google.maps.LatLngLiteral;
type ParcelleStored = { id: number; name: string; lat: number; lng: number; polygon?: string };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  center: LatLng = { lat: 36.8, lng: 10.18 };
  zoom = 6;

  parcels: ParcelleStored[] = [];

  ngOnInit(): void {
    this.loadParcelles();
  }

  loadParcelles() {
    try {
      const raw = localStorage.getItem('parcelles');
      this.parcels = raw ? JSON.parse(raw) : [];
      if (this.parcels.length) {
        this.center = { lat: this.parcels[0].lat, lng: this.parcels[0].lng };
        this.zoom = 10;
      }
    } catch (e) {
      console.error('Erreur lecture parcelles', e);
      this.parcels = [];
    }
  }

  // Toujours renvoyer un tableau (vide si pas de polygon / parsing échoue)
  getPath(p: ParcelleStored): LatLng[] {
    if (!p.polygon) return [];
    try {
      const parsed = JSON.parse(p.polygon) as LatLng[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}