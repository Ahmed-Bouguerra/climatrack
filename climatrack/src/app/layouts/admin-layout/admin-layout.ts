import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss'],
})
export class AdminLayoutComponent {
  constructor(private router: Router) {}

  addAgriculteur() {
    this.router.navigate(['/inscription']);
  }

  deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigate(['/connexion']);
  }
}