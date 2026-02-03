import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, Subject } from 'rxjs';

export interface Parcelle {
  id: number;
  user_id: number;
  nom?: string | null;
  surface?: number | null;
  localisation?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  altitude?: number | null;
  polygon?: string | null;
  nom_agriculteur?: string | null;
  prenom_agriculteur?: string | null;
  created_at?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ParcellesService {
  private api = (environment.apiBaseUrl || '').replace(/\/$/, '') + '/index.php';

  // New: notify when a parcelle is created/updated locally so UI can update live
  public created$ = new Subject<any>();

  constructor(private http: HttpClient) {}

  // liste par user
  getByUser(userId: number): Observable<Parcelle[]> {
    const params = new HttpParams().set('action', 'parcelles').set('user_id', String(userId));
    return this.http.get<Parcelle[]>(this.api, { params });
  }

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

  getMeteoForParcelle(parcelleId: number, date?: string) {
    let params = new HttpParams().set('action', 'parcelle_meteo').set('id', String(parcelleId));
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<any>(this.api, { params });
  }

  // helper to emit created/updated parcelle to subscribers
  notifyCreated(parcelle: any) {
    try {
      this.created$.next(parcelle);
    } catch (e) {
      console.warn('notifyCreated error', e);
    }
  }
}