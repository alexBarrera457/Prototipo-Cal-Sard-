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

export interface CartProduct {
  name: string;
  price: number;
  quantity: number;
}

/**
 * Seam (Costura): Interfaz que desacopla la persistencia del carrito de la lógica de negocio.
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
      item.quantity > 0
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

    if (this.adapter.init) {
      this.adapter.init((loaded) => {
        if (loaded.length > 0) {
          this.products.set(loaded);
        }
      });
    } else {
      const loaded = this.adapter.load();
      if (loaded.length > 0) {
        this.products.set(loaded);
      }
    }
  }

  addToCart(name: string, price: number, quantity = 1): void {
    const currentProducts = this.products();
    const existingProduct = currentProducts.find((product) => product.name === name);

    if (existingProduct) {
      this.setProducts(
        currentProducts.map((product) =>
          product.name === name ? { ...product, quantity: product.quantity + quantity } : product,
        ),
      );
      return;
    }

    this.setProducts([...currentProducts, { name, price, quantity }]);
  }

  removeFromCart(name: string): void {
    const currentProducts = this.products();
    const product = currentProducts.find((item) => item.name === name);

    if (!product) {
      return;
    }

    if (product.quantity > 1) {
      this.setProducts(
        currentProducts.map((item) =>
          item.name === name ? { ...item, quantity: item.quantity - 1 } : item,
        ),
      );
      return;
    }

    this.deleteProduct(name);
  }

  deleteProduct(name: string): void {
    this.setProducts(this.products().filter((product) => product.name !== name));
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
  }
}
