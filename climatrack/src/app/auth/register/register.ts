import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {

  nom = '';
  prenom = '';
  telephone = '';
  adresse = '';
  email = '';
  password = '';
  societe = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  register(): void {
    if (!this.email || !this.password) {
      alert('Email et mot de passe sont obligatoires');
      return;
    }

    const userData = {
      nom: this.nom,
      prenom: this.prenom,
      telephone: this.telephone,
      adresse: this.adresse,
      societe: this.societe
    };

    this.auth.register(this.email, this.password, 'agriculteur', userData).subscribe({
      next: () => {
        alert('Compte créé avec succès');
        this.router.navigate(['/connexion']);
      },
      error: (err) => {
        alert(err.error.message || 'Erreur création compte');
      }
    });
  }
}
