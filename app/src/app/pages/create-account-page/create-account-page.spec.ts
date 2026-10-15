import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CreateAccountPage } from './create-account-page';
import { AuthService, InMemoryAuthAdapter, AUTH_ADAPTER } from '../../services/auth';

describe('CreateAccountPage', () => {
  let component: CreateAccountPage;
  let fixture: ComponentFixture<CreateAccountPage>;
  let authService: AuthService;

  beforeEach(async () => {
    const mockAdapter = new InMemoryAuthAdapter();
    await TestBed.configureTestingModule({
      imports: [CreateAccountPage, FormsModule],
      providers: [provideRouter([]), AuthService, { provide: AUTH_ADAPTER, useValue: mockAdapter }],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateAccountPage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    await authService.signOut();
    fixture.detectChanges();
  });

  it('detects password mismatch', () => {
    component.password = 'Clave123!';
    component.confirmPassword = 'OtraClaveDiferente!';
    expect(component.passwordsMismatch).toBe(true);

    component.confirmPassword = 'Clave123!';
    expect(component.passwordsMismatch).toBe(false);
  });

  it('does not create account if passwords mismatch', async () => {
    const mockForm = {
      invalid: false,
      resetForm: vi.fn(),
      form: { markAllAsTouched: vi.fn() },
    } as unknown as NgForm;

    component.password = 'Clave123!';
    component.confirmPassword = 'Error!';
    await component.createAccount(mockForm);

    expect(component.accountCreated).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('completes account creation and starts session when valid', async () => {
    const mockForm = {
      invalid: false,
      resetForm: vi.fn(),
      form: { markAllAsTouched: vi.fn() },
    } as unknown as NgForm;

    component.name = 'Juan Pérez';
    component.email = 'juan.perez@calsarda.cat';
    component.password = 'Password123!';
    component.confirmPassword = 'Password123!';
    component.acceptedPrivacy = true;

    await component.createAccount(mockForm);
    expect(component.accountCreated).toBe(true);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.currentUser()?.email).toBe('juan.perez@calsarda.cat');
  });

  it('shows error message if email already exists', async () => {
    const mockForm = {
      invalid: false,
      resetForm: vi.fn(),
      form: { markAllAsTouched: vi.fn() },
    } as unknown as NgForm;

    // cliente@calsarda.com ya existe en InMemoryAuthAdapter
    component.name = 'Duplicado';
    component.email = 'cliente@calsarda.com';
    component.password = 'Password123!';
    component.confirmPassword = 'Password123!';
    component.acceptedPrivacy = true;

    await component.createAccount(mockForm);
    expect(component.accountCreated).toBe(false);
    expect(component.errorMessage).toContain('Ya existe una cuenta');
  });
});
