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
    localStorage.clear();
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

  afterEach(() => {
    localStorage.clear();
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

  describe('address notebook & fiscal data', () => {
    beforeEach(async () => {
      await component.quickSignIn('cliente@calsarda.com', 'cliente1930');
    });

    it('opens and cancels address form', () => {
      component.openNewAddressForm();
      expect(component.isEditingAddress()).toBe(true);
      expect(component.editingAddressId()).toBeNull();
      expect(component.addrCity).toBe('Barcelona');

      component.cancelAddressForm();
      expect(component.isEditingAddress()).toBe(false);
    });

    it('validates street and postal code are mandatory for address', async () => {
      component.openNewAddressForm();
      component.addrStreet = '';
      component.addrPostalCode = '';
      await component.saveAddress();

      expect(component.addressError()).toContain('obligatorios');
      expect(component.isEditingAddress()).toBe(true);
    });

    it('adds a new address to customer profile', async () => {
      component.openNewAddressForm();
      component.addrAlias = 'Oficina Eixample';
      component.addrStreet = 'Carrer de Mallorca, 200';
      component.addrPostalCode = '08036';
      component.addrCity = 'Barcelona';
      component.addrProvince = 'Barcelona';
      component.addrIsDefault = false;

      await component.saveAddress();

      expect(component.isEditingAddress()).toBe(false);
      expect(component.toastMessage()).toContain('éxito');
      const addrs = authService.currentUser()?.addresses ?? [];
      expect(addrs.some((a) => a.alias === 'Oficina Eixample')).toBe(true);
    });

    it('edits an existing address and updates it', async () => {
      const existing = (authService.currentUser()?.addresses ?? [])[0];
      expect(existing).toBeDefined();

      component.openEditAddressForm(existing);
      expect(component.editingAddressId()).toBe(existing.id);
      expect(component.addrStreet).toBe(existing.street);

      component.addrStreet = 'Carrer d’Aragó, 312, Àtic 1a';
      await component.saveAddress();

      expect(component.isEditingAddress()).toBe(false);
      const updated = authService.currentUser()?.addresses?.find((a) => a.id === existing.id);
      expect(updated?.street).toBe('Carrer d’Aragó, 312, Àtic 1a');
    });

    it('sets default address and deletes an address', async () => {
      // Add second address
      await authService.addAddress({
        alias: 'Feina',
        street: 'Diagonal 400',
        postalCode: '08037',
        city: 'Barcelona',
        isDefault: false,
      });

      const addrs = authService.currentUser()?.addresses ?? [];
      const second = addrs.find((a) => a.alias === 'Feina');
      expect(second).toBeDefined();

      await component.setDefaultAddress(second!.id);
      expect(
        authService.currentUser()?.addresses?.find((a) => a.id === second!.id)?.isDefault,
      ).toBe(true);

      await component.deleteAddress(second!.id);
      expect(authService.currentUser()?.addresses?.some((a) => a.id === second!.id)).toBe(false);
    });

    it('manages fiscal data: validation and saving', async () => {
      component.openEditFiscalForm();
      expect(component.isEditingFiscal()).toBe(true);

      component.fiscalTaxId = '';
      await component.saveFiscalData();
      expect(component.fiscalError()).toContain('obligatorios');

      component.fiscalCompany = 'Sardà Distribucions Gourmet SL';
      component.fiscalTaxId = 'B-12345678';
      component.fiscalAddress = 'Carrer Marina 237';
      component.fiscalPostalCode = '08013';
      component.fiscalCity = 'Barcelona';

      await component.saveFiscalData();
      expect(component.isEditingFiscal()).toBe(false);
      expect(authService.currentUser()?.fiscalData?.taxId).toBe('B-12345678');
      expect(authService.currentUser()?.fiscalData?.companyName).toBe(
        'Sardà Distribucions Gourmet SL',
      );
      expect(component.toastMessage()).toContain('correctamente');
    });
  });

  describe('customer obrador preferences & allergens', () => {
    beforeEach(async () => {
      await component.quickSignIn('cliente@calsarda.com', 'cliente1930');
    });

    it('loads initial preferences from authenticated user profile', () => {
      component.setTab('preferencias');
      expect(component.activeTab()).toBe('preferencias');
      expect(component.prefCutThickness()).toBe('muy_fino');
      expect(component.prefPackaging()).toBe('vacio_100g');
      expect(component.hasAllergen('Gluten')).toBe(true);
      expect(component.hasAllergen('Lactosa')).toBe(false);
      expect(component.hasAllergen('Sulfitos')).toBe(false);
      expect(component.prefObradorNotes).toContain('aperitivo');
    });

    it('toggles allergens in and out of the selection list', () => {
      expect(component.hasAllergen('Frutos secos')).toBe(false);
      component.toggleAllergen('Frutos secos');
      expect(component.hasAllergen('Frutos secos')).toBe(true);

      // Toggle off
      component.toggleAllergen('Frutos secos');
      expect(component.hasAllergen('Frutos secos')).toBe(false);
    });

    it('saves updated preferences to AuthService and triggers confirmation toast', async () => {
      component.prefCutThickness.set('grueso');
      component.prefPackaging.set('papel_colmado');
      component.toggleAllergen('Sulfitos');
      component.prefObradorNotes = 'Llom envasat amb paper pernil';

      await component.saveCustomerPreferences();

      expect(component.toastMessage()).toContain('correctamente');
      expect(authService.currentUser()?.preferences?.cutThickness).toBe('grueso');
      expect(authService.currentUser()?.preferences?.packaging).toBe('papel_colmado');
      expect(authService.currentUser()?.preferences?.allergens).toContain('Sulfitos');
      expect(authService.currentUser()?.preferences?.obradorNotes).toBe(
        'Llom envasat amb paper pernil',
      );
    });
  });

  describe('customer favorites & habitual basket (El Meu Cistell Habitual)', () => {
    beforeEach(async () => {
      await component.quickSignIn('cliente@calsarda.com', 'cliente1930');
      await component.loadCustomerOrders('cliente@calsarda.com');
    });

    it('switches to favoritos tab and loads favorite products', async () => {
      component.setTab('favoritos');
      expect(component.activeTab()).toBe('favoritos');

      await component.loadFavoriteProducts();
      expect(component.favoriteProductsList().length).toBeGreaterThan(0);
      expect(component.favoritesService.isFavorite('01')).toBe(true);
    });

    it('toggles favorite on past order line item and shows feedback toast', async () => {
      await component.toggleOrderFavorite('02');
      expect(component.favoritesService.isFavorite('02')).toBe(true);
      expect(component.toastMessage()).toContain('productos habituales');

      // Toggle off
      await component.toggleOrderFavorite('02');
      expect(component.favoritesService.isFavorite('02')).toBe(false);
    });

    it('removes a favorite and updates the visible list', async () => {
      await component.loadFavoriteProducts();
      const initialCount = component.favoriteProductsList().length;

      await component.removeFavorite('01');
      expect(component.favoriteProductsList().some((p) => p.number === '01')).toBe(false);
      expect(component.toastMessage()).toContain('Eliminado');
    });

    it('adds single favorite to cart and displays notification', () => {
      const cartSpy = vi.spyOn(component.cartService, 'addToCart');
      component.addFavoriteToCart({
        number: '01',
        name: 'Jamón Bellota 100%',
        price: 18.5,
        category: 'EMBUTIDOS',
        image: '/images/products/jamon.webp',
        description: 'Jamón curado',
        shortDescription: '100g cortado fino',
      });

      expect(cartSpy).toHaveBeenCalledWith(
        'Jamón Bellota 100%',
        18.5,
        1,
        '01',
        '/images/products/jamon.webp',
      );
      expect(component.toastMessage()).toMatch(/afegit|añadido/);
    });

    it('adds all habitual favorites to cart in batch', async () => {
      const cartSpy = vi.spyOn(component.cartService, 'addToCart');
      await component.addAllFavoritesToCart();

      expect(cartSpy).toHaveBeenCalled();
      expect(component.toastMessage()).toBeTruthy();
    });

    it('switches to facturas tab and computes customer invoices with VAT breakdowns', () => {
      component.setTab('facturas');
      expect(component.activeTab()).toBe('facturas');

      const invoices = component.customerInvoices();
      expect(invoices.length).toBeGreaterThan(0);

      const first = invoices[0];
      expect(first.invoiceNumber).toMatch(/^FS-/);
      expect(first.orderReference).toMatch(/^CS-/);
      expect(first.subtotalBase).toBeGreaterThan(0);
      expect(first.totalVat).toBeGreaterThanOrEqual(0);
      expect(first.total).toBeGreaterThan(0);
      expect(first.taxBreakdown.length).toBeGreaterThan(0);
    });

    it('filters customer invoices by fiscal year and calculates aggregates', () => {
      component.setTab('facturas');
      const years = component.availableFiscalYears();
      expect(years.length).toBeGreaterThan(0);

      const testYear = years[0];
      component.setFiscalYear(testYear);
      expect(component.selectedFiscalYear()).toBe(testYear);

      const filtered = component.filteredInvoices();
      for (const inv of filtered) {
        expect(new Date(inv.issuedAt).getFullYear().toString()).toBe(testYear);
      }

      const aggregates = component.invoiceAggregates();
      expect(aggregates.count).toBe(filtered.length);
      expect(aggregates.totalInvoiced).toBeGreaterThan(0);
      expect(aggregates.totalBase).toBeGreaterThan(0);
    });

    it('opens and closes the invoice preview modal', () => {
      const invoice = component.customerInvoices()[0];
      expect(invoice).toBeDefined();

      component.openInvoicePreview(invoice);
      expect(component.selectedInvoiceForModal()).toBe(invoice);

      component.closeInvoicePreview();
      expect(component.selectedInvoiceForModal()).toBeNull();
    });

    it('downloads/prints invoice using InvoicingService', () => {
      const printSpy = vi.spyOn(component.invoicingService, 'printInvoice');
      const invoice = component.customerInvoices()[0];

      component.downloadInvoice(invoice);
      expect(printSpy).toHaveBeenCalledWith(invoice);
    });

    it('exports annual invoices as CSV and displays feedback toast', () => {
      component.exportInvoicesCsv();
      expect(component.toastMessage()).toBeTruthy();
      expect(component.toastMessage()).toMatch(/gestor/i);
    });
  });

  describe('customer notification channel & obrador pickup guide', () => {
    beforeEach(async () => {
      await component.quickSignIn('cliente@calsarda.com', 'cliente1930');
      await component.loadCustomerOrders('cliente@calsarda.com');
    });

    it('loads preferred notification channel from user profile and allows updating to SMS or Email', async () => {
      component.setTab('preferencias');
      component.loadUserPreferences();

      // Inicialmente en mock es whatsapp
      expect(component.prefChannel()).toBe('whatsapp');

      // Cambiar a SMS
      component.prefChannel.set('sms');
      await component.saveCustomerPreferences();

      expect(authService.currentUser()?.preferences?.preferredChannel).toBe('sms');
      expect(component.toastMessage()).toContain('correctamente');

      // Cambiar a Email
      component.prefChannel.set('email');
      await component.saveCustomerPreferences();

      expect(authService.currentUser()?.preferences?.preferredChannel).toBe('email');
    });

    it('detects pickup orders and provides pickup PIN, store hours, and WhatsApp link', () => {
      const orders = component.customerOrders();
      const pickupOrder = orders.find((o) => o.fulfillment === 'pickup') || {
        reference: 'CS-2026-1043',
        fulfillment: 'pickup' as const,
        status: 'listo_recogida' as const,
        total: 30.2,
        customer: { name: 'Jaume Sardà', email: 'cliente@calsarda.com' },
        items: [],
      };

      expect(component.isPickupOrder(pickupOrder)).toBe(true);
      expect(component.isReadyForPickup(pickupOrder)).toBe(true);

      const pin = component.getPickupPin(pickupOrder);
      expect(pin).toHaveLength(4);
      expect(pin).toMatch(/^\d{4}$/);

      const hours = component.getStoreTodayHours();
      expect(hours.dayName).toBeTruthy();
      expect(hours.hours).toContain('08:30');

      const waUrl = component.getWhatsAppOnMyWayUrl(pickupOrder);
      expect(waUrl).toContain('wa.me/34932325508');
      expect(waUrl).toContain(pickupOrder.reference!);
    });

    it('copies pickup code and shows notification toast', async () => {
      await component.copyPickupCode('1043');
      expect(component.toastMessage()).toContain('copiado');
    });
  });
});
