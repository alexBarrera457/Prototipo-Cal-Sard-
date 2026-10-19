import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutPage } from './checkout-page';
import { CART_STORAGE_ADAPTER, CartService, InMemoryCartAdapter } from '../../services/cart';
import { AuthService } from '../../services/auth';

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
        AuthService,
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

  it('calculates shipping costs according to StoreSettings: Barcelona city, Catalonia, peninsula and free shipping', () => {
    component.fulfillment = 'delivery';

    // Barcelona ciudad (08001 - 08042) -> 4.90 €
    component.customer.postalCode = '08013';
    expect(component.shippingCost).toBe(4.9);
    expect(component.shippingZoneLabel).toContain('Barcelona ciudad');
    expect(component.finalTotal).toBeCloseTo(13.6 + 4.9, 2);

    // Rest of Catalonia (08 outside Bcn, 17, 25, 43) -> 7.99 €
    component.customer.postalCode = '08201'; // Sabadell
    expect(component.shippingCost).toBe(7.99);
    expect(component.shippingZoneLabel).toContain('Cataluña');

    // Girona (17)
    component.customer.postalCode = '17001';
    expect(component.shippingCost).toBe(7.99);

    // Lleida (25)
    component.customer.postalCode = '25001';
    expect(component.shippingCost).toBe(7.99);

    // Tarragona (43)
    component.customer.postalCode = '43001';
    expect(component.shippingCost).toBe(7.99);

    // Madrid (28) - Rest of Peninsula -> 8.99 €
    component.customer.postalCode = '28001';
    expect(component.shippingCost).toBe(8.99);
    expect(component.shippingZoneLabel).toContain('Resto península');
    expect(component.finalTotal).toBeCloseTo(13.6 + 8.99, 2);

    // Sevilla (41) - Rest of Peninsula
    component.customer.postalCode = '41001';
    expect(component.shippingCost).toBe(8.99);

    // Free shipping threshold (>= 80.00 €)
    cartService.addToCart('Lote Navideño Cal Sardà', 70.0); // 13.6 + 70.0 = 83.60 €
    expect(component.shippingCost).toBe(0);
    expect(component.shippingZoneLabel).toContain('Envío gratuito');
    expect(component.finalTotal).toBeCloseTo(83.6, 2);
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
    expect(financials?.textContent).toContain('4.90 €');
    expect(financials?.textContent).toContain((13.6 + 4.9).toFixed(2));
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

  it('processes order with card payment and saves transaction ID and status confirmed', async () => {
    component.customer = {
      name: 'Maria Valls',
      email: 'maria.valls@calsarda.com',
      phone: '612345678',
      address: '',
      postalCode: '',
      city: '',
    };
    component.paymentMethod = 'card';
    component.card = {
      number: '4242 4242 4242 4242',
      exp: '12/28',
      cvc: '123',
    };

    component.preparePreview();
    expect(component.previewReady()).toBe(true);

    await component.confirmOrder();

    const order = component.confirmedOrder();
    expect(order).toBeTruthy();
    expect(order?.paymentMethodType).toBe('card');
    expect(order?.paymentStatus).toBe('confirmed');
    expect(order?.paymentTransactionId).toContain('TX-CARD-');
    expect(order?.status).toBe('en_preparacion');
  });

  it('processes order with Bizum payment and saves transaction ID', async () => {
    component.customer = {
      name: 'Jordi Puig',
      email: 'jordi.puig@calsarda.com',
      phone: '633456789',
      address: '',
      postalCode: '',
      city: '',
    };
    component.paymentMethod = 'bizum';
    component.bizum = { phone: '633456789' };

    component.preparePreview();
    expect(component.previewReady()).toBe(true);

    await component.confirmOrder();

    const order = component.confirmedOrder();
    expect(order).toBeTruthy();
    expect(order?.paymentMethodType).toBe('bizum');
    expect(order?.paymentStatus).toBe('confirmed');
    expect(order?.paymentTransactionId).toContain('TX-BIZUM-');
  });

  it('handles card decline error during confirmation and preserves preview state', async () => {
    component.customer = {
      name: 'Pau Claris',
      email: 'pau.claris@calsarda.com',
      phone: '611223344',
      address: '',
      postalCode: '',
      city: '',
    };
    component.paymentMethod = 'card';
    component.card = {
      number: '4000 0000 0000 0002',
      exp: '12/28',
      cvc: '123',
    };

    component.preparePreview();
    expect(component.previewReady()).toBe(true);

    await component.confirmOrder();

    expect(component.paymentError()).toContain('fondos insuficientes');
    expect(component.confirmedOrder()).toBeNull();
  });

  it('catches submitOrder errors, displays informative message with transaction ref, and triggers payment rollback', async () => {
    component.customer = {
      name: 'Joan Error',
      email: 'joan@test.cat',
      phone: '611223344',
      address: 'Carrer Provença 10',
      postalCode: '08029',
      city: 'Barcelona',
    };
    component.paymentMethod = 'card';
    component.card = {
      number: '4242 4242 4242 4242',
      exp: '12/28',
      cvc: '123',
    };

    component.preparePreview();
    expect(component.previewReady()).toBe(true);

    const rollbackSpy = vi.spyOn(component.paymentsService, 'rollbackPayment');
    vi.spyOn(component.ordersService, 'submitOrder').mockRejectedValueOnce(
      new Error('Supabase database connectivity failure'),
    );

    await component.confirmOrder();

    expect(component.paymentError()).toBeTruthy();
    expect(component.paymentError()).toContain('Ref. Transacción:');
    expect(rollbackSpy).toHaveBeenCalled();
    expect(component.confirmedOrder()).toBeNull();
    expect(component.submitting()).toBe(false);
  });

  it('prefills customer details, default address and fiscal data from authenticated user on ngOnInit', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set({
      id: 'usr-customer-01',
      name: 'Jaume Sardà',
      email: 'cliente@calsarda.com',
      phone: '611 223 344',
      role: 'customer',
      addresses: [
        {
          id: 'addr-1',
          alias: 'Casa',
          street: 'Carrer d’Aragó, 312, 3r 2a',
          postalCode: '08009',
          city: 'Barcelona',
          isDefault: true,
        },
      ],
      fiscalData: {
        companyName: 'Jaume Sardà i Fills SL',
        taxId: 'B-67891234',
        address: 'Carrer d’Aragó, 312',
      },
    });

    component.ngOnInit();

    expect(component.customer.name).toBe('Jaume Sardà');
    expect(component.customer.email).toBe('cliente@calsarda.com');
    expect(component.customer.phone).toBe('611 223 344');
    expect(component.customer.address).toBe('Carrer d’Aragó, 312, 3r 2a');
    expect(component.customer.postalCode).toBe('08009');
    expect(component.customer.city).toBe('Barcelona');
    expect(component.customer.taxId).toBe('B-67891234');
    expect(component.customer.companyName).toBe('Jaume Sardà i Fills SL');
  });

  it('prefills obrador notes from customer preferences and detects allergen warnings', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set({
      id: 'usr-customer-01',
      name: 'Jaume Sardà',
      email: 'cliente@calsarda.com',
      phone: '611 223 344',
      role: 'customer',
      preferences: {
        cutThickness: 'muy_fino',
        packaging: 'vacio_100g',
        allergens: ['Gluten'],
        obradorNotes: 'Embolicar amb cura',
      },
    });

    component.ngOnInit();

    expect(component.orderNotes).toContain('Corte muy fino');
    expect(component.orderNotes).toContain('Al vacío (100g)');
    expect(component.orderNotes).toContain('Alérgenos: Gluten');
    expect(component.orderNotes).toContain('Embolicar amb cura');
  });

  it('validates and applies coupon code with immediate discount breakdown', () => {
    // Subtotal inicial es 13.60€, BENVINGUTS10 requiere 20€
    component.couponCodeInput = 'BENVINGUTS10';
    component.applyCoupon();

    expect(component.couponError()).toContain('compra mínima');
    expect(component.appliedCoupon()).toBeNull();
    expect(component.couponDiscount()).toBe(0);

    // Incrementar cantidad en el carrito a 4 unidades (27.20€)
    cartService.addToCart('Secallona artesana', 6.8, 2);
    expect(cartService.getTotal()).toBe(27.2);

    component.applyCoupon();
    expect(component.couponError()).toBeNull();
    expect(component.appliedCoupon()?.code).toBe('BENVINGUTS10');
    expect(component.couponDiscount()).toBe(2.72); // 10% de 27.20
    expect(component.finalTotal).toBe(27.2 - 2.72); // pickup = 0 shipping

    // Quitar cupón
    component.removeCoupon();
    expect(component.appliedCoupon()).toBeNull();
    expect(component.couponDiscount()).toBe(0);
    expect(component.finalTotal).toBe(27.2);
  });

  it('records applied coupon and discount into confirmed order', async () => {
    cartService.addToCart('Secallona artesana', 6.8, 2); // 27.20€
    component.couponCodeInput = 'BENVINGUTS10';
    component.applyCoupon();

    component.customer = {
      name: 'Maria Garcia',
      email: 'maria@example.com',
      phone: '612345678',
      address: 'Carrer de la Marina 237',
      postalCode: '08013',
      city: 'Barcelona',
    };
    component.fulfillment = 'pickup';
    component.paymentMethod = 'store';

    await component.confirmOrder();

    const order = component.confirmedOrder();
    expect(order).toBeTruthy();
    expect(order?.couponCode).toBe('BENVINGUTS10');
    expect(order?.discount).toBe(2.72);
    expect(order?.total).toBe(24.48);
  });

  it('allows applying and redeeming digital gift card at checkout (#64)', async () => {
    // Carrito con 13.60€ (2 unidades a 6.80€)
    expect(component.finalTotal).toBe(13.6);

    // Código inválido
    component.giftCardCodeInput = 'INVALID-CARD';
    component.applyGiftCard();
    expect(component.giftCardError()).toBeTruthy();
    expect(component.appliedGiftCard()).toBeNull();
    expect(component.giftCardDiscount()).toBe(0);

    // Tarjeta válida de 50€ (REGAL-CS-50)
    component.giftCardCodeInput = 'REGAL-CS-50';
    component.applyGiftCard();
    expect(component.giftCardError()).toBeNull();
    expect(component.appliedGiftCard()).toBeTruthy();
    expect(component.appliedGiftCard()?.code).toBe('REGAL-CS-50');
    // Como el total era 13.60€ y la tarjeta tiene 50€, el descuento cubre el 100% de la compra (13.60€)
    expect(component.giftCardDiscount()).toBe(13.6);
    expect(component.finalTotal).toBe(0);

    // Quitar la tarjeta
    component.removeGiftCard();
    expect(component.appliedGiftCard()).toBeNull();
    expect(component.giftCardDiscount()).toBe(0);
    expect(component.finalTotal).toBe(13.6);

    // Reaplicar y confirmar pedido
    component.giftCardCodeInput = 'REGAL-CS-50';
    component.applyGiftCard();

    component.customer = {
      name: 'Joan Sardà',
      email: 'joan@calsarda.cat',
      phone: '932325508',
      address: 'Carrer de la Marina 237',
      postalCode: '08013',
      city: 'Barcelona',
    };
    component.fulfillment = 'pickup';
    component.paymentMethod = 'store';

    await component.confirmOrder();

    const order = component.confirmedOrder();
    expect(order).toBeTruthy();
    expect(order?.giftCardCode).toBe('REGAL-CS-50');
    expect(order?.giftCardDiscount).toBe(13.6);
    expect(order?.total).toBe(0);
  });

  it('validates date and time slot selection and records scheduled slot in order (#65)', async () => {
    // 1. Initial state has default slot date and time slot
    expect(component.selectedSlotDate).toBeTruthy();
    expect(component.selectedTimeSlot).toBeTruthy();
    expect(component.availableTimeSlots().length).toBe(4);

    // 2. Select different time slot
    component.selectTimeSlot('17:00 - 19:00');
    expect(component.selectedTimeSlot).toBe('17:00 - 19:00');

    // 3. Validation: empty date
    component.selectedSlotDate = '';
    component.validate();
    expect(component.errors().slotDate).toBeTruthy();

    // 4. Validation: Sunday closure (2026-10-18 is a Sunday)
    component.selectedSlotDate = '2026-10-18';
    component.validate();
    expect(component.errors().slotDate).toContain('domingo');

    // 5. Validation: empty time slot
    component.selectedSlotDate = '2026-10-20'; // Tuesday
    component.selectedTimeSlot = '';
    component.validate();
    expect(component.errors().slotTime).toBeTruthy();

    // 6. Complete customer details and confirm order
    component.selectedSlotDate = '2026-10-20';
    component.selectedTimeSlot = '12:00 - 14:00';

    component.customer = {
      name: 'Carme Ruscalleda',
      email: 'carme@example.cat',
      phone: '678901234',
      address: 'Carrer de la Marina 237',
      postalCode: '08013',
      city: 'Barcelona',
    };
    component.fulfillment = 'pickup';
    component.paymentMethod = 'store';

    component.preparePreview();
    expect(component.previewReady()).toBe(true);
    expect(component.errors().slotDate).toBeUndefined();
    expect(component.errors().slotTime).toBeUndefined();

    await component.confirmOrder();

    const order = component.confirmedOrder();
    expect(order).toBeTruthy();
    expect(order?.scheduledDate).toBe('2026-10-20');
    expect(order?.scheduledTimeSlot).toBe('12:00 - 14:00');
  });

  it('adapts minimum lead time depending on fulfillment method (#65)', () => {
    // Pickup mode allows today or earliest business day
    component.fulfillment = 'pickup';
    component.onFulfillmentChange();
    const pickupMin = component.minSlotDate;
    expect(pickupMin).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Delivery mode requires minimum 24h lead time
    component.fulfillment = 'delivery';
    component.onFulfillmentChange();
    const deliveryMin = component.minSlotDate;
    expect(deliveryMin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
