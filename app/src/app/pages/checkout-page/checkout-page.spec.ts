import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutPage } from './checkout-page';
import { CART_STORAGE_ADAPTER, CartService, InMemoryCartAdapter } from '../../services/cart';

describe('CheckoutPage', () => {
  let component: CheckoutPage;
  let fixture: ComponentFixture<CheckoutPage>;
  let cartService: CartService;

  beforeEach(async () => {
    const adapter = new InMemoryCartAdapter([
      {
        name: 'Secallona artesana',
        price: 6.8,
        quantity: 2,
        productNumber: '02',
        image: '/images/products/secallona.webp',
      },
    ]);

    await TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([]),
        { provide: CART_STORAGE_ADAPTER, useValue: adapter },
        CartService,
      ],
    }).compileComponents();

    cartService = TestBed.inject(CartService);
    fixture = TestBed.createComponent(CheckoutPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and render products from cart without loading product catalog', () => {
    expect(component).toBeTruthy();
    expect(cartService.products().length).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    const summaryProduct = compiled.querySelector('.summary-product');
    expect(summaryProduct).toBeTruthy();

    const img = summaryProduct?.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/images/products/secallona.webp');
    expect(summaryProduct?.textContent).toContain('Secallona artesana');
  });

  it('prevents advancing to preview when form is invalid and shows accessible error messages', async () => {
    expect(component.previewReady()).toBe(false);

    component.preparePreview();
    fixture.detectChanges();

    expect(component.previewReady()).toBe(false);
    expect(component.errors().name).toBeTruthy();
    expect(component.errors().email).toBeTruthy();
    expect(component.errors().phone).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    const nameInput = compiled.querySelector('input[name="name"]');
    const nameError = compiled.querySelector('#name-error');

    expect(nameInput?.getAttribute('aria-invalid')).toBe('true');
    expect(nameInput?.getAttribute('aria-describedby')).toBe('name-error');
    expect(nameError?.getAttribute('role')).toBe('alert');
  });

  it('validates email format and Spanish phone number formats', () => {
    component.customer.name = 'Àlex Barrera';
    component.customer.email = 'correo-invalido';
    component.customer.phone = '123456';

    component.preparePreview();
    expect(component.previewReady()).toBe(false);
    expect(component.errors().email).toContain('correo electrónico válido');
    expect(component.errors().phone).toContain('teléfono español válido');

    // Valid data
    component.customer.email = 'alex@ejemplo.com';
    component.customer.phone = '612345678';
    component.preparePreview();
    expect(component.previewReady()).toBe(true);
    expect(Object.keys(component.errors()).length).toBe(0);
  });

  it('validates delivery fields when delivery is selected', () => {
    component.customer.name = 'Àlex Barrera';
    component.customer.email = 'alex@ejemplo.com';
    component.customer.phone = '932325508';
    component.fulfillment = 'delivery';

    component.preparePreview();
    expect(component.previewReady()).toBe(false);
    expect(component.errors().address).toBeTruthy();
    expect(component.errors().postalCode).toBeTruthy();
    expect(component.errors().city).toBeTruthy();

    // Invalid postal code
    component.customer.address = 'Carrer de Mallorca, 100';
    component.customer.postalCode = '99999';
    component.customer.city = 'Barcelona';

    component.preparePreview();
    expect(component.previewReady()).toBe(false);
    expect(component.errors().postalCode).toContain('código postal válido');

    // Valid delivery postal code
    component.customer.postalCode = '08013';
    component.preparePreview();
    expect(component.previewReady()).toBe(true);
    expect(Object.keys(component.errors()).length).toBe(0);
  });

  it('calculates 0,00 € shipping cost for pickup', () => {
    component.fulfillment = 'pickup';
    expect(component.shippingCost).toBe(0);
    expect(component.shippingZoneLabel).toContain('Recogida');
    expect(component.finalTotal).toBe(13.6);
  });

  it('calculates 7,99 € shipping for Catalonia and 8,99 € for other peninsular provinces', () => {
    component.fulfillment = 'delivery';

    // Barcelona (08)
    component.customer.postalCode = '08013';
    expect(component.shippingCost).toBe(7.99);
    expect(component.shippingZoneLabel).toContain('Cataluña');
    expect(component.finalTotal).toBeCloseTo(13.6 + 7.99, 2);

    // Girona (17)
    component.customer.postalCode = '17001';
    expect(component.shippingCost).toBe(7.99);

    // Lleida (25)
    component.customer.postalCode = '25001';
    expect(component.shippingCost).toBe(7.99);

    // Tarragona (43)
    component.customer.postalCode = '43001';
    expect(component.shippingCost).toBe(7.99);

    // Madrid (28) - Rest of Peninsula
    component.customer.postalCode = '28001';
    expect(component.shippingCost).toBe(8.99);
    expect(component.shippingZoneLabel).toContain('Resto península');
    expect(component.finalTotal).toBeCloseTo(13.6 + 8.99, 2);

    // Sevilla (41) - Rest of Peninsula
    component.customer.postalCode = '41001';
    expect(component.shippingCost).toBe(8.99);
  });

  it('allows editing details from preview', () => {
    component.customer = {
      name: 'Maria Garcia',
      email: 'maria@test.cat',
      phone: '600123456',
      address: '',
      postalCode: '',
      city: '',
    };
    component.preparePreview();
    expect(component.previewReady()).toBe(true);

    component.editDetails();
    expect(component.previewReady()).toBe(false);
  });

  it('confirms the order, clears the cart, generates a reference code, and displays the confirmation screen', async () => {
    component.customer = {
      name: 'Jordi Vila',
      email: 'jordi.vila@test.cat',
      phone: '654987321',
      address: '',
      postalCode: '',
      city: '',
    };
    component.fulfillment = 'pickup';

    component.preparePreview();
    expect(component.previewReady()).toBe(true);
    expect(cartService.products().length).toBe(1);

    await component.confirmOrder();
    fixture.detectChanges();

    // Verify cart was reset to prevent duplicate orders
    expect(cartService.products().length).toBe(0);

    // Verify confirmed order signal
    const order = component.confirmedOrder();
    expect(order).toBeTruthy();
    expect(order?.reference).toMatch(/^CS-\d{4}-\d+$/);
    expect(order?.customer.name).toBe('Jordi Vila');
    expect(order?.customer.email).toBe('jordi.vila@test.cat');
    expect(order?.total).toBe(13.6);
    expect(order?.fulfillment).toBe('pickup');

    // Verify DOM rendering of confirmation view
    const compiled = fixture.nativeElement as HTMLElement;
    const confirmationContainer = compiled.querySelector('.confirmation-container');
    expect(confirmationContainer).toBeTruthy();

    const title = compiled.querySelector('#confirmation-title');
    expect(title?.textContent).toContain('Encargo confirmado');

    const refCode = compiled.querySelector('#order-reference-code');
    expect(refCode?.textContent?.trim()).toBe(order?.reference);

    const confirmationLead = compiled.querySelector('.confirmation-lead');
    expect(confirmationLead?.textContent).toContain('Jordi Vila');

    // Pickup details
    const pickupContent = compiled.querySelector('.confirmation-grid');
    expect(pickupContent?.textContent).toContain('Recogida en tienda');
    expect(pickupContent?.textContent).toContain('Marina, 237');

    // Payment reminder
    expect(pickupContent?.textContent).toContain('Método de pago');
    expect(pickupContent?.textContent).toContain('tienda física');
    expect(pickupContent?.textContent).toContain('Bizum');

    // Items table in confirmation
    const itemsTable = compiled.querySelector('.confirmation-items-table');
    expect(itemsTable?.textContent).toContain('Secallona artesana');
    expect(itemsTable?.textContent).toContain('13.60 €');

    // Total in confirmation
    const financials = compiled.querySelector('.confirmation-financials');
    expect(financials?.textContent).toContain('13.60 €');

    // Action buttons
    const printBtn = compiled.querySelector('.print-btn');
    expect(printBtn).toBeTruthy();
    expect(printBtn?.textContent).toContain('IMPRIMIR / DESCARGAR');

    const storeBtn = compiled.querySelector('.store-btn');
    expect(storeBtn).toBeTruthy();
  });

  it('renders delivery details and calculates correct totals in confirmation screen for delivery orders', async () => {
    component.customer = {
      name: 'Nuria Pons',
      email: 'nuria@test.cat',
      phone: '611223344',
      address: 'Passeig de Gràcia, 45',
      postalCode: '08007',
      city: 'Barcelona',
    };
    component.fulfillment = 'delivery';

    component.preparePreview();
    expect(component.previewReady()).toBe(true);

    await component.confirmOrder();
    fixture.detectChanges();

    expect(cartService.products().length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    const confirmationGrid = compiled.querySelector('.confirmation-grid');
    expect(confirmationGrid?.textContent).toContain('Envío a domicilio');
    expect(confirmationGrid?.textContent).toContain('Passeig de Gràcia, 45');
    expect(confirmationGrid?.textContent).toContain('08007 Barcelona');
    expect(confirmationGrid?.textContent).toContain('24-48 horas laborables');

    const financials = compiled.querySelector('.confirmation-financials');
    expect(financials?.textContent).toContain('7.99 €');
    expect(financials?.textContent).toContain((13.6 + 7.99).toFixed(2));
  });

  it('handles printing and clipboard copying safely', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    component.printOrder();
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();

    // Clipboard copy
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    await component.copyReference('CS-2026-1042');
    expect(component.copied()).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('CS-2026-1042');
  });

  it('resets state when starting a new order', () => {
    component.customer.name = 'Test User';
    component.previewReady.set(true);
    component.resetOrderState();

    expect(component.confirmedOrder()).toBeNull();
    expect(component.previewReady()).toBe(false);
    expect(component.customer.name).toBe('');
  });
});
