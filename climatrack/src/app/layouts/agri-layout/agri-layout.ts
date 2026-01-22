import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddParcelleDialog } from './add-parcelle-dialog'; // garde l'import pour l'utiliser avec dialog.open

@Component({
  selector: 'app-agri-layout',
  standalone: true,
  // Retiré AddParcelleDialog des imports pour éviter le warning NG8113
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatDialogModule],
  templateUrl: './agri-layout.html',
  styleUrls: ['./agri-layout.scss'],
})
export class AgriLayoutComponent {
  constructor(private router: Router, private dialog: MatDialog) {}

  deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigate(['/connexion']);
  }

  // Ouvre le dialog pour ajouter une parcelle
  ajouterParcelle() {
    const ref = this.dialog.open(AddParcelleDialog, {
      width: '900px',
      maxWidth: '95vw',
      autoFocus: false,
    });

    ref.afterClosed().subscribe((result) => {
      if (result && result.saved) {
        console.log('Parcelle sauvegardée', result.parcelle);
      }
    });
  }
}