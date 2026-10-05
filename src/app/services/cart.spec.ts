import { TestBed } from '@angular/core/testing';
import {
  CART_STORAGE_ADAPTER,
  CartProduct,
  CartService,
  CartStorageAdapter,
  InMemoryCartAdapter,
} from './cart';

describe('CartService', () => {
  let service: CartService;
  let testAdapter: CartStorageAdapter;

  beforeEach(() => {
    testAdapter = new InMemoryCartAdapter([{ name: 'Café Robusta', price: 5.25, quantity: 2 }]);

    TestBed.configureTestingModule({
      providers: [CartService, { provide: CART_STORAGE_ADAPTER, useValue: testAdapter }],
    });

    service = TestBed.inject(CartService);
  });

  it('should be created and load initial products from adapter', () => {
    expect(service).toBeTruthy();
    expect(service.products().length).toBe(1);
    expect(service.products()[0].name).toBe('Café Robusta');
    expect(service.count()).toBe(2);
    expect(service.getTotal()).toBe(10.5);
  });

  it('adds a new product to the cart', () => {
    service.addToCart('Almejas Dardo', 7.15);

    expect(service.products().length).toBe(2);
    expect(service.products()[1]).toEqual({
      name: 'Almejas Dardo',
      price: 7.15,
      quantity: 1,
    });
    expect(service.count()).toBe(3);
    expect(service.getTotal()).toBeCloseTo(17.65, 2);
  });

  it('increments quantity when existing product is added again', () => {
    service.addToCart('Café Robusta', 5.25);

    expect(service.products().length).toBe(1);
    expect(service.products()[0].quantity).toBe(3);
    expect(service.count()).toBe(3);
    expect(service.getTotal()).toBe(15.75);
  });

  it('decrements quantity with removeFromCart when quantity > 1', () => {
    service.removeFromCart('Café Robusta');

    expect(service.products().length).toBe(1);
    expect(service.products()[0].quantity).toBe(1);
    expect(service.count()).toBe(1);
  });

  it('removes item completely with removeFromCart when quantity is 1', () => {
    service.removeFromCart('Café Robusta'); // quantity -> 1
    service.removeFromCart('Café Robusta'); // removed

    expect(service.products()).toEqual([]);
    expect(service.count()).toBe(0);
    expect(service.getTotal()).toBe(0);
  });

  it('ignores removeFromCart for non-existing products', () => {
    service.removeFromCart('Producto Inexistente');

    expect(service.products().length).toBe(1);
  });

  it('deletes product completely with deleteProduct regardless of quantity', () => {
    service.deleteProduct('Café Robusta');

    expect(service.products()).toEqual([]);
    expect(service.count()).toBe(0);
  });

  it('clears all products with clearCart', () => {
    service.addToCart('Otro producto', 10);
    expect(service.products().length).toBe(2);

    service.clearCart();
    expect(service.products()).toEqual([]);
    expect(service.count()).toBe(0);
    expect(service.getTotal()).toBe(0);
  });

  it('persists changes to storage adapter on mutations', () => {
    let saved: CartProduct[] = [];
    const spyAdapter: CartStorageAdapter = {
      load: () => [],
      save: (p) => {
        saved = p;
      },
    };

    const isolatedService = new CartService(spyAdapter);
    isolatedService.addToCart('Vino Cava', 14.75);

    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe('Vino Cava');
  });
});
