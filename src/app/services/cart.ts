import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export interface CartProduct {
  name: string;
  price: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private readonly storageKey = 'cal-sarda-cart';
  private storageReady = false;
  products = signal<CartProduct[]>([]);

  count = computed(() => {
    return this.products().reduce(
      (total, product) => total + product.quantity,
      0
    );
  });

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => {
        try {
          const savedCart = localStorage.getItem(this.storageKey);
          if (savedCart) {
            const parsed: unknown = JSON.parse(savedCart);
            if (Array.isArray(parsed)) {
              this.products.set(parsed.filter(this.isCartProduct));
            }
          }
        } catch {
          // Browsers with disabled storage still get an in-memory cart.
        } finally {
          this.storageReady = true;
        }
      });
    }
  }

  addToCart(name: string, price: number): void {

    const currentProducts = this.products();
    const existingProduct = currentProducts.find(product => product.name === name);

    if (existingProduct) {
      this.setProducts(currentProducts.map(product =>
        product.name === name
          ? { ...product, quantity: product.quantity + 1 }
          : product
      ));
      return;
    }

    this.setProducts([...currentProducts, { name, price, quantity: 1 }]);

  }

  removeFromCart(name: string): void {

    const currentProducts = this.products();

    const product = currentProducts.find(
      item => item.name === name
    );

    if (!product) {
      return;
    }

    if (product.quantity > 1) {
      this.setProducts(currentProducts.map(item =>
        item.name === name
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
      return;
    }

    this.setProducts(currentProducts.filter(item => item.name !== name));

  }

  deleteProduct(name: string): void {

    this.setProducts(this.products().filter(product => product.name !== name));

  }

  getTotal(): number {

    return this.products().reduce(
      (total, product) =>
        total + product.price * product.quantity,
      0
    );

  }

  private setProducts(products: CartProduct[]): void {
    this.products.set(products);

    if (this.storageReady && isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(products));
      } catch {
        // Cart updates remain usable when browser storage is unavailable.
      }
    }
  }

  private isCartProduct(value: unknown): value is CartProduct {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const item = value as Partial<CartProduct>;
    return typeof item.name === 'string'
      && item.name.length > 0
      && typeof item.price === 'number'
      && Number.isFinite(item.price)
      && item.price >= 0
      && typeof item.quantity === 'number'
      && Number.isInteger(item.quantity)
      && item.quantity > 0;
  }

}
