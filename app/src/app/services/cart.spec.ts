import { TestBed } from '@angular/core/testing';
import {
  CART_STORAGE_ADAPTER,
  CartProduct,
  CartService,
  CartStorageAdapter,
  InMemoryCartAdapter,
  LocalStorageCartAdapter,
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
    expect(service.products()[1]).toMatchObject({
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

  it('assigns unique cartItemId to added items and allows deleting by cartItemId', () => {
    service.addToCart('Vino Tinto', 12.0);
    const vino = service.products().find((p) => p.name === 'Vino Tinto')!;
    expect(vino.cartItemId).toBeTruthy();

    service.deleteCartItem(vino.cartItemId!);
    expect(service.products().find((p) => p.name === 'Vino Tinto')).toBeUndefined();
  });

  it('handles multiple custom lots with same name as independent line items', () => {
    const lotA = {
      packagingId: 'box-1',
      packagingName: 'Caja Regalo',
      packagingPrice: 5.0,
      items: [],
    };
    const lotB = {
      packagingId: 'box-2',
      packagingName: 'Cesta Madera',
      packagingPrice: 7.0,
      items: [],
    };

    service.addToCart('Lote a Medida', 30.0, 1, 'CUSTOM', undefined, lotA);
    service.addToCart('Lote a Medida', 45.0, 1, 'CUSTOM', undefined, lotB);

    const items = service.products().filter((p) => p.name === 'Lote a Medida');
    expect(items.length).toBe(2);
    expect(items[0].cartItemId).not.toBe(items[1].cartItemId);

    service.deleteCartItem(items[0].cartItemId!);
    const remaining = service.products().filter((p) => p.name === 'Lote a Medida');
    expect(remaining.length).toBe(1);
    expect(remaining[0].price).toBe(45.0);
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

  it('stores and preserves productNumber and image when adding items', () => {
    service.addToCart('Almejas', 7.15, 1, 'ALM-01', '/images/almejas.jpg');

    const item = service.products().find((p) => p.name === 'Almejas');
    expect(item).toBeDefined();
    expect(item?.productNumber).toBe('ALM-01');
    expect(item?.image).toBe('/images/almejas.jpg');

    // Adding more quantity without re-specifying number/image preserves them
    service.addToCart('Almejas', 7.15, 2);
    const updated = service.products().find((p) => p.name === 'Almejas');
    expect(updated?.quantity).toBe(3);
    expect(updated?.productNumber).toBe('ALM-01');
    expect(updated?.image).toBe('/images/almejas.jpg');
  });
});

describe('LocalStorageCartAdapter', () => {
  let adapter: LocalStorageCartAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageCartAdapter('browser' as unknown as object);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deserializes legacy items without productNumber and image for backwards compatibility', () => {
    const legacyData = [{ name: 'Queso Manchego', price: 12.5, quantity: 2 }];
    localStorage.setItem('cal-sarda-cart', JSON.stringify(legacyData));

    const loaded = adapter.load();
    expect(loaded).toEqual(legacyData);
  });

  it('deserializes enriched items with productNumber and image', () => {
    const enrichedData = [
      {
        name: 'Jamón Ibérico',
        price: 25.0,
        quantity: 1,
        productNumber: 'JAM-01',
        image: '/images/jamon.jpg',
      },
    ];
    localStorage.setItem('cal-sarda-cart', JSON.stringify(enrichedData));

    const loaded = adapter.load();
    expect(loaded).toEqual(enrichedData);
  });

  it('filters out corrupted or invalid cart items', () => {
    const mixedData = [
      { name: 'Válido', price: 10, quantity: 1, productNumber: 'V-01', image: '/img.jpg' },
      { name: 'Sin precio', quantity: 1 },
      { name: 'Precio negativo', price: -5, quantity: 1 },
      { name: 'Cantidad cero', price: 10, quantity: 0 },
      { name: 'ProductNumber no string', price: 10, quantity: 1, productNumber: 123 },
      { name: 'Image no string', price: 10, quantity: 1, image: false },
      null,
      'cadena inválida',
    ];
    localStorage.setItem('cal-sarda-cart', JSON.stringify(mixedData));

    const loaded = adapter.load();
    expect(loaded.length).toBe(1);
    expect(loaded[0].name).toBe('Válido');
  });
});
