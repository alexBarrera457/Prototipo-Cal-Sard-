import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CreateAccountPage } from './create-account-page';

describe('CreateAccountPage', () => {
  let component: CreateAccountPage;
  let fixture: ComponentFixture<CreateAccountPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateAccountPage, FormsModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateAccountPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('detects password mismatch', () => {
    component.password = 'Clave123!';
    component.confirmPassword = 'OtraClaveDiferente!';
    expect(component.passwordsMismatch).toBe(true);

    component.confirmPassword = 'Clave123!';
    expect(component.passwordsMismatch).toBe(false);
  });

  it('does not create account if passwords mismatch', () => {
    const mockForm = {
      invalid: false,
      resetForm: vi.fn(),
    } as unknown as NgForm;

    component.password = 'Clave123!';
    component.confirmPassword = 'Error!';
    component.createAccount(mockForm);

    expect(component.accountCreated).toBe(false);
  });

  it('completes account creation demo state when valid', () => {
    const mockForm = {
      invalid: false,
      resetForm: vi.fn(),
    } as unknown as NgForm;

    component.name = 'Juan Pérez';
    component.email = 'juan@ejemplo.com';
    component.password = 'Clave123!';
    component.confirmPassword = 'Clave123!';
    component.acceptedPrivacy = true;

    component.createAccount(mockForm);
    expect(component.accountCreated).toBe(true);
  });
});
