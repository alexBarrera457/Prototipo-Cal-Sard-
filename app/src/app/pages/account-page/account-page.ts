import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { I18nService } from '../../services/i18n';

@Component({
  selector: 'app-account-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './account-page.html',
  styleUrl: './account-page.css',
})
export class AccountPage {
  public readonly auth = inject(AuthService);
  public readonly i18n = inject(I18nService);

  email = '';
  password = '';
  showPassword = false;
  loginDemoCompleted = false;
  recoveryNotice = false;
  recoverySuccess = false;
  errorMessage = '';

  async signIn(form: NgForm): Promise<void> {
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.recoveryNotice = false;
    this.recoverySuccess = false;

    const result = await this.auth.signIn({
      email: this.email,
      password: this.password,
    });

    if (result.success) {
      this.loginDemoCompleted = true;
      form.resetForm();
      this.email = '';
      this.password = '';
    } else {
      this.errorMessage = result.error || 'Error al iniciar sesión.';
    }
  }

  async quickSignIn(email: string, password: string, form?: NgForm): Promise<void> {
    this.email = email;
    this.password = password;
    this.errorMessage = '';
    this.recoveryNotice = false;

    const result = await this.auth.signIn({ email, password });
    if (result.success) {
      this.loginDemoCompleted = true;
      if (form) {
        form.resetForm();
      }
      this.email = '';
      this.password = '';
    } else {
      this.errorMessage = result.error || 'Error al iniciar sesión.';
    }
  }

  async requestPasswordReset(): Promise<void> {
    const targetEmail = this.email.trim();
    if (!targetEmail) {
      this.recoveryNotice = true;
      this.recoverySuccess = false;
      this.errorMessage =
        this.i18n.currentLang() === 'ca'
          ? 'Introdueix primer el teu correu electrònic per sol·licitar el restabliment.'
          : 'Introduce primero tu correo electrónico para solicitar el restablecimiento.';
      return;
    }

    this.errorMessage = '';
    const result = await this.auth.resetPassword(targetEmail);
    this.recoveryNotice = true;
    this.recoverySuccess = result.success;

    if (!result.success) {
      this.errorMessage = result.error || 'No se ha podido enviar el correo de recuperación.';
    }
  }

  async returnToLogin(): Promise<void> {
    this.loginDemoCompleted = false;
    this.recoveryNotice = false;
    this.recoverySuccess = false;
    this.errorMessage = '';
    await this.auth.signOut();
  }
}
