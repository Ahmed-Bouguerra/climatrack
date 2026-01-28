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
        if (this.parcel) this.loadWeatherForParcel(this.parcel);
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

  back() {
    this.router.navigate(['/admin/agriculteurs', this.parcel?.user_id || '']);
  }
}