import { isPlatformBrowser } from '@angular/common';
import { Component, inject, Inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type {
  FulfillmentMethod,
  PaymentMethodType,
  PaymentTransactionResult,
} from '@cal-sarda/domain';

import { CartService } from '../../services/cart';
import { I18nService } from '../../services/i18n';
import { InvoicingService } from '../../services/invoicing';
import { OrdersService, type Order } from '../../services/orders';
import { PaymentsService } from '../../services/payments';

export type { FulfillmentMethod, PaymentMethodType };

export interface CheckoutFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  cardNumber?: string;
  cardExp?: string;
  cardCvc?: string;
  bizumPhone?: string;
}

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
})
export class CheckoutPage {
  fulfillment: FulfillmentMethod = 'pickup';
  paymentMethod: PaymentMethodType = 'store';
  readonly previewReady = signal(false);
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly confirmedOrder = signal<Order | null>(null);
  readonly copied = signal(false);
  readonly errors = signal<CheckoutFormErrors>({});

  readonly paymentProcessing = signal(false);
  readonly paymentError = signal<string | null>(null);
  readonly paymentResult = signal<PaymentTransactionResult | null>(null);

  public readonly i18n = inject(I18nService);
  private readonly invoicingService = inject(InvoicingService);
  public readonly paymentsService = inject(PaymentsService);

  customer = {
    name: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
  };

  card = {
    number: '',
    exp: '',
    cvc: '',
  };

  bizum = {
    phone: '',
  };

  constructor(
    public cartService: CartService,
    public ordersService: OrdersService,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

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
    const isCa = this.i18n.currentLang() === 'ca';
    if (this.fulfillment === 'pickup') {
      return isCa ? 'Recollida a la botiga (gratuït)' : 'Recogida en tienda (gratis)';
    }
    const cp = this.customer.postalCode.trim();
    if (this.isValidPostalCode(cp)) {
      if (this.isCataloniaPostalCode(cp)) {
        return isCa ? 'Catalunya (7,99 €)' : 'Cataluña (7,99 €)';
      }
      return isCa ? 'Resta península (8,99 €)' : 'Resto península (8,99 €)';
    }
    return isCa ? 'Estimat (Catalunya / Península)' : 'Estimado (Cataluña / Península)';
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

    if (this.paymentMethod === 'card') {
      const num = this.card.number.trim();
      const exp = this.card.exp.trim();
      const cvc = this.card.cvc.trim();

      if (!num) {
        errs.cardNumber = 'El número de tarjeta es obligatorio.';
      }
      if (!exp) {
        errs.cardExp = 'La fecha de caducidad es obligatoria.';
      }
      if (!cvc) {
        errs.cardCvc = 'El CVC es obligatorio.';
      }

      if (num && exp && cvc) {
        const check = this.paymentsService.validateCard(num, exp, cvc);
        if (!check.valid) {
          errs.cardNumber = check.error;
        }
      }
    } else if (this.paymentMethod === 'bizum') {
      const bPhone = (this.bizum.phone || this.customer.phone).trim();
      if (!bPhone) {
        errs.bizumPhone = 'El teléfono para Bizum es obligatorio.';
      } else {
        const check = this.paymentsService.validateBizum(bPhone);
        if (!check.valid) {
          errs.bizumPhone = check.error;
        }
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

  onPaymentMethodChange(): void {
    this.paymentError.set(null);
    if (this.submitted()) {
      this.validate();
    }
  }

  async confirmOrder(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (!this.validate()) {
      this.previewReady.set(false);
      return;
    }

    this.submitting.set(true);
    this.paymentProcessing.set(true);
    this.paymentError.set(null);
    try {
      const reference = this.ordersService.generateOrderReference();

      // Procesar el pago a través de la pasarela desacoplada
      const tx = await this.paymentsService.processPayment({
        orderReference: reference,
        amount: this.finalTotal,
        currency: 'eur',
        paymentMethod: this.paymentMethod,
        customer: { ...this.customer },
        cardNumber: this.card.number,
        cardExp: this.card.exp,
        cardCvc: this.card.cvc,
        bizumPhone: this.bizum.phone || this.customer.phone,
      });

      if (!tx.success) {
        this.paymentError.set(
          tx.errorMessage || 'No se ha podido procesar el pago. Por favor, revisa tus datos.',
        );
        return;
      }

      this.paymentResult.set(tx);

      const items = [...this.cartService.products()];
      const order = await this.ordersService.submitOrder({
        reference,
        customer: { ...this.customer },
        items,
        fulfillment: this.fulfillment,
        shippingCost: this.shippingCost,
        shippingZoneLabel: this.shippingZoneLabel,
        subtotal: this.cartService.getTotal(),
        total: this.finalTotal,
        paymentMethod: this.paymentsService.getMethodLabel(
          this.paymentMethod,
          this.i18n.currentLang() === 'ca' ? 'ca' : 'es',
        ),
        paymentMethodType: this.paymentMethod,
        paymentStatus: tx.status,
        paymentTransactionId: tx.transactionId,
      });

      this.cartService.clearCart();
      this.confirmedOrder.set(order);

      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      this.submitting.set(false);
      this.paymentProcessing.set(false);
    }
  }

  printOrder(): void {
    if (isPlatformBrowser(this.platformId)) {
      const order = this.confirmedOrder();
      if (order) {
        const invoice = this.invoicingService.generateInvoice(order);
        this.invoicingService.printInvoice(invoice);
      } else {
        window.print();
      }
    }
  }

  async copyReference(reference: string): Promise<void> {
    if (isPlatformBrowser(this.platformId) && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(reference);
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2500);
      } catch {
        // Ignorar fallo de permisos del portapapeles
      }
    }
  }

  resetOrderState(): void {
    this.confirmedOrder.set(null);
    this.previewReady.set(false);
    this.submitted.set(false);
    this.paymentError.set(null);
    this.paymentResult.set(null);
    this.customer = {
      name: '',
      email: '',
      phone: '',
      address: '',
      postalCode: '',
      city: '',
    };
    this.card = { number: '', exp: '', cvc: '' };
    this.bizum = { phone: '' };
  }
}
