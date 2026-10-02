import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-account-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './account-page.html',
  styleUrl: './account-page.css'
})
export class AccountPage {
  email = '';
  password = '';
  showPassword = false;
  loginDemoCompleted = false;
  recoveryNotice = false;

  signIn(form: NgForm): void {
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }

    // Frontend preview only: do not authenticate or send/store credentials.
    this.loginDemoCompleted = true;
    this.recoveryNotice = false;
    form.resetForm();
    this.email = '';
    this.password = '';
  }

  returnToLogin(): void {
    this.loginDemoCompleted = false;
    this.recoveryNotice = false;
  }
}
