import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Parcelle {
  id: number;
  user_id: number;

  // champs métier
  nom?: string | null;
  surface?: number | null;
  localisation?: string | null;

  // coordonnées / alt
  latitude?: number | null;   // backend canonical name
  longitude?: number | null;  // backend canonical name
  lat?: number | null;        // possible legacy field used by UI
  lng?: number | null;        // possible legacy field used by UI
  altitude?: number | null;
  polygon?: string | null;

  // champs fournis par certains endpoints (admin view)
  nom_agriculteur?: string | null;
  prenom_agriculteur?: string | null;

  created_at?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ParcellesService {
  private api = (environment.apiBaseUrl || '').replace(/\/$/, '') + '/index.php';

  constructor(private http: HttpClient) {}

  // liste par user
  getByUser(userId: number): Observable<Parcelle[]> {
    const params = new HttpParams().set('action', 'parcelles').set('user_id', String(userId));
    return this.http.get<Parcelle[]>(this.api, { params });
  }

  // get single by id (utilisé par parcel-details etc.)
  getById(id: number): Observable<Parcelle> {
    const params = new HttpParams().set('action', 'parcelles').set('id', String(id));
    return this.http.get<Parcelle>(this.api, { params });
  }

  delete(id: number) {
    const params = new HttpParams().set('action', 'parcelles').set('id', String(id));
    return this.http.delete(this.api, { params });
  }

  create(payload: any) {
    const params = new HttpParams().set('action', 'parcelles');
    return this.http.post(this.api + '?' + params.toString(), payload);
  }

  update(payload: any) {
    const params = new HttpParams().set('action', 'parcelles');
    return this.http.put(this.api + '?' + params.toString(), payload);
  }
}