import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
