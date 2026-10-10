import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CartService } from '../../services/cart';

type FulfillmentMethod = 'pickup' | 'delivery';

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
})
export class CheckoutPage {
  fulfillment: FulfillmentMethod = 'pickup';
  previewReady = false;
  customer = {
    name: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
  };

  constructor(public cartService: CartService) {}

  preparePreview(): void {
    this.previewReady = true;
  }

  editDetails(): void {
    this.previewReady = false;
  }
}
