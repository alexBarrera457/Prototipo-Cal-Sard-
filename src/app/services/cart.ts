import { Injectable, signal, computed } from '@angular/core';

export interface CartProduct {
  name: string;
  price: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {

  products = signal<CartProduct[]>([]);

  count = computed(() => {
    return this.products().reduce(
      (total, product) => total + product.quantity,
      0
    );
  });

  addToCart(name: string, price: number): void {

    const currentProducts = this.products();

    const existingProduct = currentProducts.find(
      product => product.name === name
    );

    if (existingProduct) {

      existingProduct.quantity++;

      this.products.set([...currentProducts]);

    } else {

      this.products.set([
        ...currentProducts,
        {
          name: name,
          price: price,
          quantity: 1
        }
      ]);

    }

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

      product.quantity--;

      this.products.set([...currentProducts]);

    } else {

      this.products.set(
        currentProducts.filter(
          item => item.name !== name
        )
      );

    }

  }

  deleteProduct(name: string): void {

    this.products.set(
      this.products().filter(
        product => product.name !== name
      )
    );

  }

  getTotal(): number {

    return this.products().reduce(
      (total, product) =>
        total + product.price * product.quantity,
      0
    );

  }

}