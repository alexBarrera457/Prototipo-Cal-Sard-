import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-create-account-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './create-account-page.html',
  styleUrl: './create-account-page.css'
})
export class CreateAccountPage {
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

  get passwordsMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  createAccount(form: NgForm): void {
    if (form.invalid || this.passwordsMismatch) return;

    // Frontend preview only: no account is created and no form data is sent or saved.
    this.accountCreated = true;
    form.resetForm();
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
