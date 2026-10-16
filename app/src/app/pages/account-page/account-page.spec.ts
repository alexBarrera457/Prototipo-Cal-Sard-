import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AccountPage } from './account-page';
import { AuthService, InMemoryAuthAdapter, AUTH_ADAPTER } from '../../services/auth';

describe('AccountPage', () => {
  let component: AccountPage;
  let fixture: ComponentFixture<AccountPage>;
  let authService: AuthService;

  beforeEach(async () => {
    const mockAdapter = new InMemoryAuthAdapter();
    await TestBed.configureTestingModule({
      imports: [AccountPage, FormsModule],
      providers: [provideRouter([]), AuthService, { provide: AUTH_ADAPTER, useValue: mockAdapter }],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    // Asegurar estado inicial limpio
    await authService.signOut();
    fixture.detectChanges();
  });

  it('creates the component and starts with unauthenticated state', () => {
    expect(component).toBeTruthy();
    expect(component.loginDemoCompleted).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('does not complete login if form is invalid', async () => {
    const mockForm = {
      invalid: true,
      form: { markAllAsTouched: vi.fn() },
    } as unknown as NgForm;

    await component.signIn(mockForm);
    expect(component.loginDemoCompleted).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('completes login state when form has valid credentials', async () => {
    const mockForm = {
      invalid: false,
      resetForm: vi.fn(),
      form: { markAllAsTouched: vi.fn() },
    } as unknown as NgForm;

    component.email = 'cliente@calsarda.com';
    component.password = 'cliente1930';
    await component.signIn(mockForm);

    expect(component.loginDemoCompleted).toBe(true);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.currentUser()?.role).toBe('customer');

    await component.returnToLogin();
    expect(component.loginDemoCompleted).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('authenticates admin user and exposes isAdmin signal', async () => {
    await component.quickSignIn('admin@calsarda.com', 'admin1930');

    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isAdmin()).toBe(true);
    expect(authService.currentUser()?.name).toContain('Administrador');
  });

  it('shows error message on incorrect password', async () => {
    const mockForm = {
      invalid: false,
      resetForm: vi.fn(),
      form: { markAllAsTouched: vi.fn() },
    } as unknown as NgForm;

    component.email = 'admin@calsarda.com';
    component.password = 'clave-incorrecta';
    await component.signIn(mockForm);

    expect(component.errorMessage).toContain('incorrectas');
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('loads customer orders when user is authenticated and switches tabs', async () => {
    await component.quickSignIn('cliente@calsarda.com', 'cliente1930');
    expect(authService.isAuthenticated()).toBe(true);

    await component.loadCustomerOrders('cliente@calsarda.com');
    expect(component.customerOrders().length).toBeGreaterThan(0);

    // Comprobar cambio de pestaña
    expect(component.activeTab()).toBe('pedidos');
    component.setTab('direcciones');
    expect(component.activeTab()).toBe('direcciones');
    component.setTab('perfil');
    expect(component.activeTab()).toBe('perfil');
  });

  it('reorders items from past order into CartService and triggers toast', async () => {
    await component.quickSignIn('cliente@calsarda.com', 'cliente1930');
    await component.loadCustomerOrders('cliente@calsarda.com');

    const pastOrder = component.customerOrders()[0];
    const cartSpy = vi.spyOn(component.cartService, 'addToCart');

    component.reorder(pastOrder);
    expect(cartSpy).toHaveBeenCalled();
    expect(component.toastMessage()).toContain('éxito');
  });

  it('triggers invoice download through InvoicingService', async () => {
    await component.quickSignIn('cliente@calsarda.com', 'cliente1930');
    await component.loadCustomerOrders('cliente@calsarda.com');

    const pastOrder = component.customerOrders()[0];
    const invoiceSpy = vi
      .spyOn(component.invoicingService, 'printInvoice')
      .mockImplementation(() => {});

    component.downloadInvoice(pastOrder);
    expect(invoiceSpy).toHaveBeenCalled();
  });

  it('calculates order timeline step correctly', () => {
    expect(component.getOrderStep('recibido')).toBe(1);
    expect(component.getOrderStep('en_preparacion')).toBe(2);
    expect(component.getOrderStep('listo_recogida')).toBe(3);
    expect(component.getOrderStep('enviado')).toBe(3);
    expect(component.getOrderStep('entregado')).toBe(4);
    expect(component.getOrderStep('cancelado')).toBe(0);
  });

  describe('profile editing & password changing', () => {
    beforeEach(async () => {
      await component.quickSignIn('cliente@calsarda.com', 'cliente1930');
    });

    it('initializes edit profile form with current user values and cancels cleanly', () => {
      component.startEditProfile();
      expect(component.isEditingProfile()).toBe(true);
      expect(component.editName).toBe('Jaume Sardà');
      expect(component.editPhone).toBe('611 223 344');
      expect(component.profileError()).toBeNull();

      component.cancelEditProfile();
      expect(component.isEditingProfile()).toBe(false);
    });

    it('validates name cannot be empty when saving profile', async () => {
      component.startEditProfile();
      component.editName = '   ';
      await component.saveProfile();

      expect(component.profileError()).toContain('no puede estar vacío');
      expect(component.isEditingProfile()).toBe(true);
    });

    it('saves updated profile and shows confirmation toast', async () => {
      component.startEditProfile();
      component.editName = 'Jaume Sardà i Fills';
      component.editPhone = '622 334 455';
      await component.saveProfile();

      expect(component.isEditingProfile()).toBe(false);
      expect(component.profileError()).toBeNull();
      expect(authService.currentUser()?.name).toBe('Jaume Sardà i Fills');
      expect(authService.currentUser()?.phone).toBe('622 334 455');
      expect(component.toastMessage()).toContain('correctamente');
    });

    it('initializes and cancels change password form cleanly', () => {
      component.startChangePassword();
      expect(component.isChangingPassword()).toBe(true);
      expect(component.currentPasswordInput).toBe('');
      expect(component.passwordError()).toBeNull();

      component.cancelChangePassword();
      expect(component.isChangingPassword()).toBe(false);
    });

    it('validates current password required', async () => {
      component.startChangePassword();
      component.currentPasswordInput = '';
      await component.savePassword();

      expect(component.passwordError()).toContain('Introduce tu contraseña actual');
    });

    it('validates new password must be at least 8 characters', async () => {
      component.startChangePassword();
      component.currentPasswordInput = 'cliente1930';
      component.newPasswordInput = '1234';
      component.confirmPasswordInput = '1234';
      await component.savePassword();

      expect(component.passwordError()).toContain('al menos 8 caracteres');
    });

    it('validates new password and confirmation must match', async () => {
      component.startChangePassword();
      component.currentPasswordInput = 'cliente1930';
      component.newPasswordInput = 'passwordSegura123';
      component.confirmPasswordInput = 'otraPasswordDistinta';
      await component.savePassword();

      expect(component.passwordError()).toContain('no coinciden');
    });

    it('saves new password successfully and shows toast', async () => {
      component.startChangePassword();
      component.currentPasswordInput = 'cliente1930';
      component.newPasswordInput = 'nuevaClaveCliente1930';
      component.confirmPasswordInput = 'nuevaClaveCliente1930';
      await component.savePassword();

      expect(component.isChangingPassword()).toBe(false);
      expect(component.passwordError()).toBeNull();
      expect(component.toastMessage()).toContain('éxito');
    });
  });
});
