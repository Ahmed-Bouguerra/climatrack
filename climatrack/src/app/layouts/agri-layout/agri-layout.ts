import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-agri-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule],
  templateUrl: './agri-layout.html',
  styleUrls: ['./agri-layout.scss'],
})
export class AgriLayoutComponent {
  constructor(private router: Router) {}

  deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigate(['/connexion']);
  }
}
