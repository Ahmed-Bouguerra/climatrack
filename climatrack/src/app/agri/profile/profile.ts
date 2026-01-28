import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  PLATFORM_ID,
  inject
} from '@angular/core';

import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ApiService } from '../../core/services/api.service';

interface UserProfile {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  role: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Profile implements OnInit {

  // ✅ Angular modern DI (بدون @Inject)
  private platformId = inject(PLATFORM_ID);

  user: UserProfile | null = null;
  loading = true;
  isEditing = false;
  isSaving = false;

  profileForm: FormGroup;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private fb: FormBuilder
  ) {
    // Création des controls en définissant l'état "disabled" dès la création.
    // Ici on initialise en lecture seule (disabled) car isEditing = false par défaut.
    this.profileForm = this.fb.group({
      nom: [{ value: '', disabled: true }, Validators.required],
      prenom: [{ value: '', disabled: true }, Validators.required],
      // Si vous souhaitez empêcher la modification de l'email, le laisser disabled initialement.
      // getRawValue() permettra de récupérer sa valeur lors de l'envoi.
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      telephone: [{ value: '', disabled: true }],
      adresse: [{ value: '', disabled: true }]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  private setEditingState(editing: boolean): void {
    // Active/désactive les controls en fonction de editing
    const controls = ['nom', 'prenom', 'email', 'telephone', 'adresse'];
    controls.forEach((name) => {
      const ctrl = this.profileForm.get(name);
      if (!ctrl) return;
      if (editing) {
        ctrl.enable({ emitEvent: false });
      } else {
        ctrl.disable({ emitEvent: false });
      }
    });
    // Forcer update vue (OnPush)
    this.cdr.markForCheck();
  }

  loadProfile(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    const user_id = localStorage.getItem('user_id');

    if (!user_id) {
      this.loading = false;
      this.cdr.markForCheck();
      alert('Utilisateur non connecté');
      return;
    }

    this.api
      .get<UserProfile>(`/index.php?action=profile&user_id=${user_id}`)
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.user = data;
            // patchValue ne change pas l'état disabled
            this.profileForm.patchValue({
              nom: data.nom,
              prenom: data.prenom,
              email: data.email,
              telephone: data.telephone,
              adresse: data.adresse
            });
            // s'assurer que l'état des controls reflète isEditing
            this.setEditingState(this.isEditing);
            this.loading = false;
            this.cdr.markForCheck();
          });
        },
        error: (err) => {
          console.error('Erreur chargement profil:', err);
          this.loading = false;
          this.cdr.markForCheck();
          alert('Erreur lors du chargement du profil');
        }
      });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;

    if (!this.isEditing && this.user) {
      // Annuler les modifications en rétablissant les valeurs initiales
      this.profileForm.patchValue({
        nom: this.user.nom,
        prenom: this.user.prenom,
        email: this.user.email,
        telephone: this.user.telephone,
        adresse: this.user.adresse
      });
    }

    // Appliquer l'état enabled/disabled aux controls
    this.setEditingState(this.isEditing);
  }

  saveProfile(): void {
    // marquer les champs pour affichage d'erreurs si besoin
    this.profileForm.markAllAsTouched();

    // si le formulaire est invalide (les controls activés sont invalid), on stoppe
    if (this.profileForm.invalid || !this.user) {
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    // getRawValue() récupère aussi les valeurs des controls désactivés (pratique si on garde email disabled)
    const values = this.profileForm.getRawValue();

    const payload = {
      action: 'profile',
      id: this.user.id,
      ...values
    };

    this.api.put('/index.php', payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSaving = false;
          this.isEditing = false;
          // Après sauvegarde, recharger pour synchroniser les données et désactiver à nouveau les champs
          this.loadProfile();
          alert('Profil mis à jour avec succès');
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        console.error('Erreur mise à jour:', err);
        this.isSaving = false;
        this.cdr.markForCheck();
        alert('Erreur lors de la mise à jour du profil');
      }
    });
  }
}