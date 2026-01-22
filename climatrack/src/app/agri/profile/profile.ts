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
    this.profileForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: [''],
      telephone: [''],
      adresse: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfile();
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
            this.profileForm.patchValue({
              nom: data.nom,
              prenom: data.prenom,
              email: data.email,
              telephone: data.telephone,
              adresse: data.adresse
            });
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
      this.profileForm.patchValue({
        nom: this.user.nom,
        prenom: this.user.prenom,
        email: this.user.email,
        telephone: this.user.telephone,
        adresse: this.user.adresse
      });
    }

    this.cdr.markForCheck();
  }

  saveProfile(): void {
    if (this.profileForm.invalid || !this.user) {
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    const payload = {
      action: 'profile',
      id: this.user.id,
      ...this.profileForm.value
    };

    this.api.put('/index.php', payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSaving = false;
          this.isEditing = false;
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
