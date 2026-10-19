import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  Inject,
  Injectable,
  InjectionToken,
  Injector,
  Optional,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import type { CartItem } from '@cal-sarda/domain';

export type CartProduct = CartItem;
export type { CartItem };

/**
 * Seam (Costura): Interfaz que desacopla la persistencia de la cesta de la lógica de negocio.
 */
export interface CartStorageAdapter {
  load(): CartProduct[];
  save(products: CartProduct[]): void;
  init?(onReady: (products: CartProduct[]) => void): void;
}

export const CART_STORAGE_ADAPTER = new InjectionToken<CartStorageAdapter>('CART_STORAGE_ADAPTER');

/**
 * Adaptador de almacenamiento en memoria para tests y SSR.
 */
@Injectable()
export class InMemoryCartAdapter implements CartStorageAdapter {
  private items: CartProduct[];

  constructor(@Optional() @Inject('INITIAL_CART_ITEMS') initialItems?: CartProduct[]) {
    this.items = initialItems ? [...initialItems] : [];
  }

  init(onReady: (products: CartProduct[]) => void): void {
    onReady(this.load());
  }

  load(): CartProduct[] {
    return [...this.items];
  }

  save(products: CartProduct[]): void {
    this.items = [...products];
  }
}

/**
 * Adaptador de almacenamiento persistente en el navegador usando localStorage.
 */
@Injectable({
  providedIn: 'root',
})
export class LocalStorageCartAdapter implements CartStorageAdapter {
  private readonly storageKey = 'cal-sarda-cart';
  private ready = false;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Optional() private readonly injector?: Injector,
  ) {}

  init(onReady: (products: CartProduct[]) => void): void {
    if (isPlatformBrowser(this.platformId)) {
      const run = () => {
        this.ready = true;
        const products = this.load();
        onReady(products);
      };

      if (this.injector) {
        afterNextRender(run, { injector: this.injector });
      } else {
        run();
      }
    } else {
      this.ready = true;
    }
  }

  load(): CartProduct[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      const savedCart = localStorage.getItem(this.storageKey);
      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          return parsed.filter(this.isCartProduct);
        }
      }
    } catch {
      // Entornos con almacenamiento deshabilitado
    }
    return [];
  }

  save(products: CartProduct[]): void {
    if (!this.ready || !isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(products));
    } catch {
      // Cuota excedida o almacenamiento deshabilitado
    }
  }

  private isCartProduct(value: unknown): value is CartProduct {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const item = value as Partial<CartProduct>;
    return (
      typeof item.name === 'string' &&
      item.name.length > 0 &&
      typeof item.price === 'number' &&
      Number.isFinite(item.price) &&
      item.price >= 0 &&
      typeof item.quantity === 'number' &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      (item.cartItemId === undefined || typeof item.cartItemId === 'string') &&
      (item.productNumber === undefined || typeof item.productNumber === 'string') &&
      (item.image === undefined || typeof item.image === 'string') &&
      (item.customLot === undefined || typeof item.customLot === 'object')
    );
  }
}

/**
 * Módulo Profundo: Lógica de negocio del carrito.
 */
@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly adapter: CartStorageAdapter;
  readonly products = signal<CartProduct[]>([]);

  readonly count = computed(() => {
    return this.products().reduce((total, product) => total + product.quantity, 0);
  });

  constructor(
    @Inject(CART_STORAGE_ADAPTER) @Optional() customAdapter?: CartStorageAdapter,
    @Optional() defaultAdapter?: LocalStorageCartAdapter,
  ) {
    this.adapter = customAdapter ?? defaultAdapter ?? new InMemoryCartAdapter();

    const normalizeWithIds = (items: CartProduct[]): CartProduct[] => {
      return items.map((it, idx) => ({
        ...it,
        cartItemId:
          it.cartItemId || `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      }));
    };

    if (this.adapter.init) {
      this.adapter.init((loaded) => {
        if (loaded.length > 0) {
          this.products.set(normalizeWithIds(loaded));
        }
      });
    } else {
      const loaded = this.adapter.load();
      if (loaded.length > 0) {
        this.products.set(normalizeWithIds(loaded));
      }
    }
  }

  private generateCartItemId(name: string, productNumber?: string): string {
    const cleanPrefix = (productNumber || name).slice(0, 8).replace(/[^a-zA-Z0-9_-]/g, '');
    const rand = Math.random().toString(36).substring(2, 7);
    return `cart-${cleanPrefix}-${Date.now()}-${rand}`;
  }

  addToCart(
    name: string,
    price: number,
    quantity = 1,
    productNumber?: string,
    image?: string,
    customLot?: CartItem['customLot'],
  ): void {
    const currentProducts = this.products();
    const existingProduct = !customLot
      ? currentProducts.find((product) => product.name === name && !product.customLot)
      : null;

    if (existingProduct) {
      this.setProducts(
        currentProducts.map((product) =>
          product === existingProduct
            ? {
                ...product,
                quantity: product.quantity + quantity,
                productNumber: productNumber ?? product.productNumber,
                image: image ?? product.image,
              }
            : product,
        ),
      );
      return;
    }

    const cartItemId = this.generateCartItemId(name, productNumber);
    this.setProducts([
      ...currentProducts,
      { cartItemId, name, price, quantity, productNumber, image, customLot },
    ]);
  }

  removeCartItem(identifier: string): void {
    const currentProducts = this.products();
    const index = currentProducts.findIndex(
      (item) => item.cartItemId === identifier || item.name === identifier,
    );

    if (index === -1) {
      return;
    }

    const item = currentProducts[index];
    if (item.quantity > 1) {
      const updated = [...currentProducts];
      updated[index] = { ...item, quantity: item.quantity - 1 };
      this.setProducts(updated);
      return;
    }

    this.deleteCartItem(identifier);
  }

  deleteCartItem(identifier: string): void {
    const currentProducts = this.products();
    // Si coincide con cartItemId único, eliminar únicamente esa línea
    if (currentProducts.some((item) => item.cartItemId === identifier)) {
      this.setProducts(currentProducts.filter((item) => item.cartItemId !== identifier));
      return;
    }

    // Si coincide con el nombre de producto, eliminar solo el primer elemento coincidente
    const index = currentProducts.findIndex((item) => item.name === identifier);
    if (index !== -1) {
      const updated = [...currentProducts];
      updated.splice(index, 1);
      this.setProducts(updated);
    }
  }

  removeFromCart(name: string): void {
    this.removeCartItem(name);
  }

  deleteProduct(name: string): void {
    this.deleteCartItem(name);
  }

  clearCart(): void {
    this.setProducts([]);
  }

  getTotal(): number {
    return this.products().reduce((total, product) => total + product.price * product.quantity, 0);
  }

  private setProducts(products: CartProduct[]): void {
    this.products.set(products);
    this.adapter.save(products);

    if (typeof localStorage !== 'undefined') {
      try {
        if (products.length > 0) {
          const raw = localStorage.getItem('cal_sarda_abandoned_cart');
          const meta = raw ? JSON.parse(raw) : {};
          meta.lastUpdated = Date.now();
          localStorage.setItem('cal_sarda_abandoned_cart', JSON.stringify(meta));
        } else {
          localStorage.removeItem('cal_sarda_abandoned_cart');
        }
      } catch {
        // Ignorar excepciones de almacenamiento
      }
    }
  }
}
