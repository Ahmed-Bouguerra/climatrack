import { Injectable } from '@angular/core';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loadingPromise: Promise<void> | null = null;

  load(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;

    if ((window as any).google && (window as any).google.maps) {
      this.loadingPromise = Promise.resolve();
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        // La propriété pour la clé est `key` (pas `apiKey`)
        setOptions({
          key: environment.googleMapsApiKey,
          version: 'weekly',
          libraries: ['places']
        } as any); // `as any` pour éviter de potentielles différences de typings

        await importLibrary('maps');
      } catch (err) {
        this.loadingPromise = null;
        throw err;
      }
    })();

    return this.loadingPromise;
  }
}