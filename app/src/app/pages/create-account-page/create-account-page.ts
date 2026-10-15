import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { I18nService } from '../../services/i18n';

@Component({
  selector: 'app-create-account-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './create-account-page.html',
  styleUrl: './create-account-page.css',
})
export class CreateAccountPage {
  public readonly auth = inject(AuthService);
  public readonly i18n = inject(I18nService);

  name = '';
  email = '';
  phone = '';
  address = '';
  postalCode = '';
  city = '';
  province = '';
  country = 'España';
  password = '';
  confirmPassword = '';
  acceptedPrivacy = false;
  showPassword = false;
  accountCreated = false;
  requiresConfirmation = false;
  errorMessage = '';

  get passwordsMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  async createAccount(form: NgForm): Promise<void> {
    if (form.invalid || this.passwordsMismatch) {
      if (form.form) {
        form.form.markAllAsTouched();
      }
      return;
    }

    this.errorMessage = '';
    const result = await this.auth.signUp({
      name: this.name,
      email: this.email,
      phone: this.phone,
      address: this.address,
      postalCode: this.postalCode,
      city: this.city,
      province: this.province,
      country: this.country,
      password: this.password,
    });

    if (result.success) {
      this.requiresConfirmation = Boolean(result.requiresEmailConfirmation);
      this.clearFields();
      this.accountCreated = true;
    } else {
      this.errorMessage = result.error || 'Error al crear la cuenta.';
    }
  }

  private clearFields(): void {
    this.name = '';
    this.email = '';
    this.phone = '';
    this.address = '';
    this.postalCode = '';
    this.city = '';
    this.province = '';
    this.country = 'España';
    this.password = '';
    this.confirmPassword = '';
    this.acceptedPrivacy = false;
  }
}
