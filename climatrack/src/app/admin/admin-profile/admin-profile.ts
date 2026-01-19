import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
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
  selector: 'app-AdminProfile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './admin-profile.html',
  styleUrl: './admin-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProfile implements OnInit {
  user: UserProfile | null = null;
  loading = true;
  isEditingPassword = false;
  isSaving = false;
  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.profileForm = this.fb.group({
      nom: [{value: '', disabled: true}],
      prenom: [{value: '', disabled: true}],
      email: [{value: '', disabled: true}],
      telephone: [{value: '', disabled: true}],
      adresse: [{value: '', disabled: true}],
      role: [{value: '', disabled: true}],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('newPassword')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  loadProfile(): void {
    // Vérifier si on est dans le navigateur
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // Récupérer le profil avec ID=1 (admin)
    this.api.get<UserProfile>(`/index.php?action=profile&user_id=1`).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.user = data;
          this.profileForm.patchValue({
            nom: data.nom,
            prenom: data.prenom,
            email: data.email,
            telephone: data.telephone,
            adresse: data.adresse,
            role: data.role,
          });
          this.loading = false;
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        console.error('Erreur chargement profil admin:', err);
        this.loading = false;
        this.cdr.markForCheck();
        alert('Erreur lors du chargement du profil admin');
      },
    });
  }

  togglePasswordEdit(): void {
    this.isEditingPassword = !this.isEditingPassword;
    if (!this.isEditingPassword) {
      this.passwordForm.reset();
    }
    this.cdr.markForCheck();
  }

  changePassword(): void {
    if (this.passwordForm.invalid || !this.user) {
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    const formValue = this.passwordForm.value;
    const updatedData = {
      action: 'changePassword',
      id: 1, // Toujours ID=1 pour admin
      currentPassword: formValue.currentPassword,
      newPassword: formValue.newPassword,
    };

    this.api.put('/index.php', updatedData).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.isSaving = false;
          this.isEditingPassword = false;
          this.passwordForm.reset();
          
          alert('Mot de passe modifié avec succès');
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        console.error('Erreur modification mot de passe:', err);
        this.isSaving = false;
        this.cdr.markForCheck();
        alert('Erreur lors de la modification du mot de passe');
      },
    });
  }
}