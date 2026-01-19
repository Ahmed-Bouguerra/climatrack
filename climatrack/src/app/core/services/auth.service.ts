import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private API = 'http://localhost:9999/climatrack-api/index.php';

  constructor(private http: HttpClient) {}

  // LOGIN
  login(email: string, password: string): Observable<any> {
    return this.http.post(this.API, {
      action: 'login',
      email,
      password
    });
  }

  // REGISTER
  register(email: string, password: string, role: string = 'agriculteur', userData?: any): Observable<any> {
    const payload: any = {
      action: 'register',
      email,
      password,
      role
    };
    
    // Add optional user data fields
    if (userData) {
      Object.keys(userData).forEach(key => {
        payload[key] = userData[key];
      });
    }
    
    return this.http.post(this.API, payload);
  }

  logout(): void {
    localStorage.clear();
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }
}
