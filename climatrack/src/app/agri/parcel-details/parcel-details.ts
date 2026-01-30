import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';
import { WeatherService, CurrentWeather } from '../../core/services/weather.service';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-parcel-details',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, MatButtonModule],
  templateUrl: './parcel-details.html',
  styleUrls: ['./parcel-details.scss'],
})
export class ParcelDetails implements OnInit {
  parcel: Parcelle | null = null;
  weather: CurrentWeather | null = null;
  loadingParcel = false;
  loadingWeather = false;
  error: string | null = null;
  isBrowser = false;

  // NEW: meteo horaire
  meteoHourly: Array<any> = [];
  nbHeuresTempSous7: number | null = null;
  loadingMeteo = false;

  // NEW: temporary coords for picker
  pickLat: number | null = null;
  pickLng: number | null = null;
  pickAlt: number | null = null;
  savingCoords = false;

  constructor(
    private route: ActivatedRoute,
    private parcellesSvc: ParcellesService,
    private weatherSvc: WeatherService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.error = 'ID parcelle manquant';
      return;
    }
    const id = Number(idParam);
    if (!id) {
      this.error = 'ID invalide';
      return;
    }
    this.loadParcel(id);
  }

  private loadParcel(id: number) {
    this.loadingParcel = true;
    this.parcellesSvc.getById(id).subscribe({
      next: (p: Parcelle) => {
        this.parcel = p || null;
        this.loadingParcel = false;
        if (this.parcel) {
          // map fields for UI (compat)
          (this.parcel as any).lat = this.parcel.latitude ?? (this.parcel as any).lat;
          (this.parcel as any).lng = this.parcel.longitude ?? (this.parcel as any).lng;
          this.loadWeatherForParcel(this.parcel);
          this.loadMeteo(this.parcel.id);
          // initialize picker values
          this.pickLat = (this.parcel as any).lat ?? null;
          this.pickLng = (this.parcel as any).lng ?? null;
          this.pickAlt = this.parcel.altitude ?? null;
        }
      },
      error: (err: any) => {
        console.error('Erreur chargement parcelle', err);
        this.error = 'Impossible de charger la parcelle';
        this.loadingParcel = false;
      }
    });
  }

  private loadWeatherForParcel(p: Parcelle) {
    this.loadingWeather = true;
    const lat = (p as any).lat ?? null;
    const lng = (p as any).lng ?? null;
    if (lat != null && lng != null) {
      this.weatherSvc.getByCoords(Number(lat), Number(lng)).subscribe({
        next: (w) => { this.weather = w; this.loadingWeather = false; },
        error: (err) => { console.error(err); this.error = 'Erreur météo'; this.loadingWeather = false; }
      });
      return;
    }

    if (p.localisation) {
      this.weatherSvc.getByQuery(p.localisation).subscribe({
        next: (w) => { this.weather = w; this.loadingWeather = false; },
        error: (err) => { console.error(err); this.error = 'Erreur météo (géolocalisation)'; this.loadingWeather = false; }
      });
      return;
    }

    this.error = 'Pas de coordonnées ni de localisation pour cette parcelle';
    this.loadingWeather = false;
  }

  // NEW: load meteo horaire from backend (index.php?action=parcelle_meteo)
  private loadMeteo(id: number) {
    this.loadingMeteo = true;
    this.meteoHourly = [];
    this.nbHeuresTempSous7 = null;
    this.parcellesSvc.getMeteoForParcelle(id).subscribe({
      next: (res: any) => {
        if (res) {
          this.meteoHourly = res.data || [];
          this.nbHeuresTempSous7 = res.nb_heures_temp_sous_7 ?? null;
        } else {
          this.meteoHourly = [];
        }
        this.loadingMeteo = false;
      },
      error: (err) => {
        console.error('Erreur meteo horaire', err);
        this.loadingMeteo = false;
      }
    });
  }

  /*back() {
    this.router.navigate(['/agri/accueil', this.parcel?.user_id || '']);
  }*/

  // NEW: pick location using browser geolocation (simpler than Google Maps JS integration)
  pickCurrentLocation() {
    if (!this.isBrowser || !('geolocation' in navigator)) {
      alert('Geolocation non supportée par ce navigateur');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.pickLat = pos.coords.latitude;
        this.pickLng = pos.coords.longitude;
        // altitude may be null depending on device
        this.pickAlt = pos.coords.altitude ?? this.pickAlt;
      },
      (err) => {
        console.error('Geolocation error', err);
        alert('Impossible d’obtenir la position: ' + (err.message || err.code));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // NEW: save picked coordinates to backend (calls parcelles update)
  savePickedCoordinates() {
    if (!this.parcel) return;
    if (this.pickLat == null || this.pickLng == null) {
      alert('Latitude et longitude requises');
      return;
    }
    this.savingCoords = true;
    const payload: any = {
      id: this.parcel.id,
      // backend expects latitude / longitude / altitude
      latitude: String(this.pickLat),
      longitude: String(this.pickLng)
    };
    if (this.pickAlt != null) payload.altitude = String(this.pickAlt);

    this.parcellesSvc.update(payload).subscribe({
      next: (updated: any) => {
        // backend returns updated row for parcelles endpoints in some cases; to be safe reload
        this.savingCoords = false;
        this.loadParcel(this.parcel!.id);
        alert('Coordonnées enregistrées');
      },
      error: (err) => {
        console.error('Erreur sauvegarde coords', err);
        this.savingCoords = false;
        alert('Erreur lors de la sauvegarde des coordonnées');
      }
    });
  }
}