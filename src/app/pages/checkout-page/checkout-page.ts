import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CartService } from '../../services/cart';
import { loadStoreProducts, StoreProduct } from '../../services/products';

type FulfillmentMethod = 'pickup' | 'delivery';

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css'
})
export class CheckoutPage {
  readonly products = signal<StoreProduct[]>([]);
  fulfillment: FulfillmentMethod = 'pickup';
  previewReady = false;
  customer = {
    name: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: ''
  };

  constructor(public cartService: CartService) {
    void loadStoreProducts().then((products) => this.products.set(products));
  }

  productImage(name: string): string {
    return this.products().find(product => product.name === name)?.image ?? '/images/history.jpg';
  }

  preparePreview(): void {
    this.previewReady = true;
  }

  editDetails(): void {
    this.previewReady = false;
  }
}
