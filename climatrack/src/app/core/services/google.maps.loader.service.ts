import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loadingPromise: Promise<void> | null = null;

  load(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;

    // If no API key is configured, fail fast with a friendly error so components can display a message
    const apiKey = (environment.googleMapsApiKey || '').trim();
    if (!apiKey) {
      return Promise.reject(new Error('Google Maps API key not configured. Set environment.googleMapsApiKey.'));
    }

    // Already loaded
    if ((window as any).google && (window as any).google.maps) {
      this.loadingPromise = Promise.resolve();
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        // Try dynamic import of the official loader package
        const mod = await import('@googlemaps/js-api-loader').catch(() => null) as any | null;

        if (mod) {
          // Newer versions expose importLibrary & setOptions
          if (typeof mod.importLibrary === 'function' && typeof mod.setOptions === 'function') {
            mod.setOptions({
              key: apiKey,
              version: 'weekly',
              libraries: ['places'],
            } as any);
            await mod.importLibrary('maps');
            return;
          }

          // Older versions expose Loader class which usually has load()
          if (typeof mod.Loader === 'function') {
            const LoaderClass = mod.Loader;
            const loaderInstance = new LoaderClass({
              apiKey: apiKey,
              version: 'weekly',
              libraries: ['places'],
            } as any);

            if (typeof loaderInstance.load === 'function') {
              await loaderInstance.load();
              return;
            }
            // otherwise fallthrough to script fallback
          }
        }

        // Fallback: inject script tag with async+defer
        await new Promise<void>((resolve, reject) => {
          // If already present and ready -> resolve
          if ((window as any).google && (window as any).google.maps) {
            resolve();
            return;
          }

          const id = 'google-maps-script';
          if (document.getElementById(id)) {
            // script already appended by other code: poll until google.maps is available
            const interval = setInterval(() => {
              if ((window as any).google && (window as any).google.maps) {
                clearInterval(interval);
                resolve();
              }
            }, 150);

            // timeout
            setTimeout(() => {
              clearInterval(interval);
              reject(new Error('Timeout waiting for Google Maps to load'));
            }, 20000);

            return;
          }

          const script = document.createElement('script');
          script.id = id;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
            apiKey
          )}&libraries=places&v=weekly`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            // give the browser a tick to attach globals
            setTimeout(() => {
              if ((window as any).google && (window as any).google.maps) {
                resolve();
              } else {
                reject(new Error('Google Maps loaded but global google.maps not found'));
              }
            }, 0);
          };
          script.onerror = () => reject(new Error('Failed to load Google Maps script'));
          document.head.appendChild(script);
        });
      } catch (err) {
        // allow retry on next call
        this.loadingPromise = null;
        throw err;
      }
    })();

    return this.loadingPromise;
  }
}