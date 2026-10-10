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

  it('toggles previewReady state when preparing and editing preview', () => {
    expect(component.previewReady).toBe(false);

    component.preparePreview();
    expect(component.previewReady).toBe(true);

    component.editDetails();
    expect(component.previewReady).toBe(false);
  });
});
