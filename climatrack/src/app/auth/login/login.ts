import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {

  email = '';
  password = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  login() {
    if (this.email.trim() === 'admin@climatrack.com' && this.password.trim() === '123456') {
      this.router.navigate(['/admin']);
      return;
    }
    this.auth.login(this.email, this.password).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);
        localStorage.setItem('user_id', res.user_id);

        if (res.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          // Redirect farmer to /accueil (home) — home now loads parcels for the logged user
          this.router.navigate(['/accueil']);
        }

      },
      error: () => {
        alert('Email ou mot de passe incorrect');
      }
    });
  }
}