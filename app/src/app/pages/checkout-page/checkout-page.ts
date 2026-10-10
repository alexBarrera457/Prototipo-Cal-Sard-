import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CartService } from '../../services/cart';

export type FulfillmentMethod = 'pickup' | 'delivery';

export interface CheckoutFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
})
export class CheckoutPage {
  fulfillment: FulfillmentMethod = 'pickup';
  readonly previewReady = signal(false);
  readonly submitted = signal(false);
  readonly errors = signal<CheckoutFormErrors>({});

  customer = {
    name: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
  };

  constructor(public cartService: CartService) {}

  get isDelivery(): boolean {
    return this.fulfillment === 'delivery';
  }

  get shippingCost(): number {
    if (this.fulfillment === 'pickup') {
      return 0;
    }
    const cp = this.customer.postalCode.trim();
    if (this.isValidPostalCode(cp)) {
      return this.isCataloniaPostalCode(cp) ? 7.99 : 8.99;
    }
    return 7.99;
  }

  get shippingZoneLabel(): string {
    if (this.fulfillment === 'pickup') {
      return 'Recogida en tienda (gratis)';
    }
    const cp = this.customer.postalCode.trim();
    if (this.isValidPostalCode(cp)) {
      return this.isCataloniaPostalCode(cp) ? 'Cataluña (7,99 €)' : 'Resto península (8,99 €)';
    }
    return 'Estimado (Cataluña / Península)';
  }

  get finalTotal(): number {
    return this.cartService.getTotal() + this.shippingCost;
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  isValidSpanishPhone(phone: string): boolean {
    const clean = phone.replace(/^(\+34|0034)/, '').replace(/[\s\-\.]/g, '');
    return /^[6789]\d{8}$/.test(clean);
  }

  isValidPostalCode(postalCode: string): boolean {
    const clean = postalCode.trim();
    if (!/^\d{5}$/.test(clean)) {
      return false;
    }
    const prefix = parseInt(clean.substring(0, 2), 10);
    return prefix >= 1 && prefix <= 52;
  }

  isCataloniaPostalCode(postalCode: string): boolean {
    const clean = postalCode.trim();
    if (clean.length < 2) {
      return false;
    }
    const prefix = clean.substring(0, 2);
    // Barcelona (08), Girona (17), Lleida (25), Tarragona (43)
    return ['08', '17', '25', '43'].includes(prefix);
  }

  validate(): boolean {
    const errs: CheckoutFormErrors = {};

    const name = this.customer.name.trim();
    if (!name) {
      errs.name = 'El nombre y apellidos son obligatorios.';
    } else if (name.length < 2) {
      errs.name = 'Introduce un nombre válido.';
    }

    const email = this.customer.email.trim();
    if (!email) {
      errs.email = 'El correo electrónico es obligatorio.';
    } else if (!this.isValidEmail(email)) {
      errs.email = 'Introduce un correo electrónico válido (ej. usuario@dominio.com).';
    }

    const phone = this.customer.phone.trim();
    if (!phone) {
      errs.phone = 'El teléfono de contacto es obligatorio.';
    } else if (!this.isValidSpanishPhone(phone)) {
      errs.phone =
        'Introduce un teléfono español válido de 9 dígitos (ej. 612 34 56 78 o 93 232 55 08).';
    }

    if (this.fulfillment === 'delivery') {
      const address = this.customer.address.trim();
      if (!address) {
        errs.address = 'La dirección de entrega es obligatoria.';
      } else if (address.length < 5) {
        errs.address = 'Introduce una dirección completa.';
      }

      const cp = this.customer.postalCode.trim();
      if (!cp) {
        errs.postalCode = 'El código postal es obligatorio.';
      } else if (!this.isValidPostalCode(cp)) {
        errs.postalCode = 'Introduce un código postal válido de 5 dígitos (01000 - 52999).';
      }

      const city = this.customer.city.trim();
      if (!city) {
        errs.city = 'La población o ciudad es obligatoria.';
      } else if (city.length < 2) {
        errs.city = 'Introduce una población válida.';
      }
    }

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  preparePreview(): void {
    this.submitted.set(true);
    if (!this.validate()) {
      return;
    }
    this.previewReady.set(true);
  }

  editDetails(): void {
    this.previewReady.set(false);
  }

  onFieldInput(field: keyof CheckoutFormErrors): void {
    if (this.submitted()) {
      this.validate();
    }
  }

  onFulfillmentChange(): void {
    if (this.submitted()) {
      this.validate();
    }
  }
}
