import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface CurrentWeather {
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; humidity: number };
  wind?: { speed: number; deg?: number };
  name?: string;
  sys?: { country?: string };
  // add others if needed
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private base = 'https://api.openweathermap.org/data/2.5/weather';
  private apiKey = environment.openWeatherMapApiKey || '';

  constructor(private http: HttpClient) {}

  // by lat/lon
  getByCoords(lat: number, lon: number): Observable<CurrentWeather> {
    const params = new HttpParams()
      .set('lat', String(lat))
      .set('lon', String(lon))
      .set('units', 'metric')
      .set('appid', this.apiKey);
    return this.http.get<CurrentWeather>(this.base, { params });
  }

  // by city/localisation string
  getByQuery(q: string): Observable<CurrentWeather> {
    const params = new HttpParams()
      .set('q', q)
      .set('units', 'metric')
      .set('appid', this.apiKey);
    return this.http.get<CurrentWeather>(this.base, { params });
  }
}