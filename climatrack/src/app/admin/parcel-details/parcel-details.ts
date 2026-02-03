import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ParcellesService, Parcelle } from '../../core/services/parcel.service';
import { WeatherService, CurrentWeather } from '../../core/services/weather.service';
import { GoogleMapsLoaderService } from '../../core/services/google.maps.loader.service';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter } from '@angular/material/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'admin-parcel-details',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, FormsModule],
  templateUrl: './parcel-details.html',
  styleUrls: ['./parcel-details.scss'],
})
export class AdminParcelDetails implements OnInit {
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
  selectedDate: Date | null = null;



  constructor(
    private route: ActivatedRoute,
    private parcellesSvc: ParcellesService,
    private weatherSvc: WeatherService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private dateAdapter: DateAdapter<Date>
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.dateAdapter.setLocale('fr-FR');
  }

  ngOnInit(): void {
    console.log('ParcelDetails ngOnInit called');
    const idParam = this.route.snapshot.paramMap.get('id');
    console.log('idParam:', idParam);
    if (!idParam) {
      this.error = 'ID parcelle manquant';
      return;
    }
    const id = Number(idParam);
    console.log('id:', id);
    if (!id) {
      this.error = 'ID invalide';
      return;
    }
    this.loadParcel(id);
  }

  private loadParcel(id: number) {
    console.log('loadParcel called with id:', id);
    this.loadingParcel = true;
    this.parcellesSvc.getById(id).subscribe({
      next: (p: Parcelle) => {
        console.log('loadParcel next:', p);
        this.parcel = p || null;
        this.loadingParcel = false;
        if (this.parcel) {
          // map fields for UI (compat)
          (this.parcel as any).lat = this.parcel.latitude ?? (this.parcel as any).lat;
          (this.parcel as any).lng = this.parcel.longitude ?? (this.parcel as any).lng;
          this.loadWeatherForParcel(this.parcel);
          this.loadMeteo(this.parcel.id);
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
  private loadMeteo(id: number, date?: string) {
    console.log('loadMeteo called with id:', id, 'date:', date);
    this.loadingMeteo = true;
    this.meteoHourly = [];
    this.nbHeuresTempSous7 = null;
    this.ngZone.runOutsideAngular(() => {
      this.parcellesSvc.getMeteoForParcelle(id, date).subscribe({
        next: (res: any) => {
          console.log('loadMeteo next:', res);
          this.ngZone.run(() => {
            if (res) {
              this.meteoHourly = res.data || [];
              this.nbHeuresTempSous7 = res.nb_heures_temp_sous_7 ?? null;
            } else {
              this.meteoHourly = [];
            }
            this.loadingMeteo = false;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('Erreur meteo horaire', err);
          this.ngZone.run(() => {
            this.loadingMeteo = false;
            this.cdr.detectChanges();
          });
        }
      });
    });
  }

  onDateChange() {
    if (this.parcel && this.selectedDate) {
      console.log('Selected date object:', this.selectedDate);
      const year = this.selectedDate.getFullYear();
      const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(this.selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      console.log('Formatted date string:', dateStr);
      this.loadMeteo(this.parcel.id, dateStr);
    } else if (this.parcel) {
      this.loadMeteo(this.parcel.id);
    }
  }
}