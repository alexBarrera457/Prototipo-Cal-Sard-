import { isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type {
  FulfillmentMethod,
  PaymentMethodType,
  PaymentTransactionResult,
} from '@cal-sarda/domain';

import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { CouponsService, type Coupon } from '../../services/coupons';
import { I18nService } from '../../services/i18n';
import { InvoicingService } from '../../services/invoicing';
import { OrdersService, type Order } from '../../services/orders';
import { PaymentsService } from '../../services/payments';
import { ProductsService, type StoreProduct } from '../../services/products';
import { GiftCardsService, type GiftCardRecord } from '../../services/gift-cards';

export type { FulfillmentMethod, PaymentMethodType };

export interface TimeSlotOption {
  id: string;
  label: string;
  period: 'morning' | 'midday' | 'afternoon' | 'evening';
  startHour: number;
  endHour: number;
  available: boolean;
  statusBadge: 'available' | 'limited';
}

export const CHECKOUT_TIME_SLOTS: {
  id: string;
  label: string;
  period: 'morning' | 'midday' | 'afternoon' | 'evening';
  startHour: number;
  endHour: number;
}[] = [
  { id: '10:00 - 12:00', label: '10:00 - 12:00', period: 'morning', startHour: 10, endHour: 12 },
  { id: '12:00 - 14:00', label: '12:00 - 14:00', period: 'midday', startHour: 12, endHour: 14 },
  { id: '17:00 - 19:00', label: '17:00 - 19:00', period: 'afternoon', startHour: 17, endHour: 19 },
  { id: '19:00 - 20:30', label: '19:00 - 20:30', period: 'evening', startHour: 19, endHour: 20 },
];

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
  slotDate?: string;
  slotTime?: string;
}

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
})
export class CheckoutPage implements OnInit {
  private _fulfillment: FulfillmentMethod = 'pickup';
  get fulfillment(): FulfillmentMethod {
    return this._fulfillment;
  }
  set fulfillment(val: FulfillmentMethod) {
    this._fulfillment = val;
    if (this.selectedSlotDate && this.selectedSlotDate < this.minSlotDate) {
      this.selectedSlotDate = this.minSlotDate;
    }
  }
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
  public readonly couponsService = inject(CouponsService);
  public readonly giftCardsService = inject(GiftCardsService);
  public readonly authService = inject(AuthService, { optional: true });
  public readonly productsService = inject(ProductsService, { optional: true });

  couponCodeInput = '';
  readonly appliedCoupon = signal<Coupon | null>(null);
  readonly couponError = signal<string | null>(null);
  readonly couponSuccess = signal<string | null>(null);

  giftCardCodeInput = '';
  readonly appliedGiftCard = signal<{
    code: string;
    card: GiftCardRecord;
    appliedAmount: number;
    remainingBalance: number;
  } | null>(null);
  readonly giftCardError = signal<string | null>(null);
  readonly giftCardSuccess = signal<string | null>(null);

  readonly couponDiscount = computed<number>(() => {
    const coupon = this.appliedCoupon();
    if (!coupon) return 0;
    const subtotal = this.cartService.getTotal();
    if (coupon.discountType === 'percentage') {
      return Math.round(((subtotal * coupon.discountValue) / 100) * 100) / 100;
    }
    return Math.min(subtotal, coupon.discountValue);
  });

  readonly giftCardDiscount = computed<number>(() => {
    const applied = this.appliedGiftCard();
    if (!applied) return 0;
    const base = Math.max(
      0,
      this.cartService.getTotal() - this.couponDiscount() + this.shippingCost,
    );
    return Math.min(base, applied.card.currentBalance);
  });

  readonly catalogProducts = signal<StoreProduct[]>([]);
  orderNotes = '';

  // Selector de franjas horarias (#65)
  selectedSlotDate = '';
  selectedTimeSlot = '';

  formatDateIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  get minSlotDate(): string {
    const now = new Date();
    if (this.fulfillment === 'pickup') {
      if (now.getDay() !== 0 && now.getHours() < 18) {
        return this.formatDateIso(now);
      }
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      if (next.getDay() === 0) {
        next.setDate(next.getDate() + 1);
      }
      return this.formatDateIso(next);
    } else {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      if (next.getDay() === 0) {
        next.setDate(next.getDate() + 1);
      }
      return this.formatDateIso(next);
    }
  }

  readonly availableTimeSlots = computed<TimeSlotOption[]>(() => {
    const dateStr = this.selectedSlotDate;
    if (!dateStr) {
      return CHECKOUT_TIME_SLOTS.map((s) => ({
        ...s,
        available: true,
        statusBadge: s.id === '12:00 - 14:00' ? 'limited' : 'available',
      }));
    }

    const d = new Date(dateStr + 'T12:00:00');
    if (d.getDay() === 0) {
      return CHECKOUT_TIME_SLOTS.map((s) => ({
        ...s,
        available: false,
        statusBadge: 'available',
      }));
    }

    const now = new Date();
    const isToday = dateStr === this.formatDateIso(now);

    return CHECKOUT_TIME_SLOTS.map((s) => {
      let available = true;
      if (isToday) {
        available = now.getHours() + 2 <= s.startHour;
      }
      return {
        ...s,
        available,
        statusBadge: s.id === '12:00 - 14:00' ? 'limited' : 'available',
      };
    });
  });

  initDefaultSlot(): void {
    if (!this.selectedSlotDate || this.selectedSlotDate < this.minSlotDate) {
      this.selectedSlotDate = this.minSlotDate;
    }
    const slots = this.availableTimeSlots();
    const available = slots.filter((s) => s.available);
    if (!this.selectedTimeSlot || !available.some((s) => s.id === this.selectedTimeSlot)) {
      if (available.length > 0) {
        this.selectedTimeSlot = available[0].id;
      } else {
        this.selectedTimeSlot = '10:00 - 12:00';
      }
    }
  }

  selectTimeSlot(slotId: string): void {
    this.selectedTimeSlot = slotId;
    this.onFieldInput('slotTime');
  }

  onSlotDateChange(newDate: string): void {
    this.selectedSlotDate = newDate;
    const slots = this.availableTimeSlots();
    const available = slots.filter((s) => s.available);
    if (!available.some((s) => s.id === this.selectedTimeSlot)) {
      if (available.length > 0) {
        this.selectedTimeSlot = available[0].id;
      }
    }
    this.onFieldInput('slotDate');
  }

  getSlotPeriodLabel(period: 'morning' | 'midday' | 'afternoon' | 'evening'): string {
    switch (period) {
      case 'morning':
        return this.i18n.t('checkout.morning');
      case 'midday':
        return this.i18n.t('checkout.midday');
      case 'afternoon':
        return this.i18n.t('checkout.afternoon');
      case 'evening':
        return this.i18n.t('checkout.evening');
    }
  }

  readonly detectedAllergenWarnings = computed<string[]>(() => {
    const user = this.authService?.currentUser();
    const userAllergens = user?.preferences?.allergens;
    if (!userAllergens || userAllergens.length === 0) return [];

    const cartItems = this.cartService.products();
    const prods = this.catalogProducts();
    const conflicts = new Set<string>();

    for (const item of cartItems) {
      const prod = prods.find(
        (p) => (item.productNumber && p.number === item.productNumber) || p.name === item.name,
      );
      if (prod?.allergens) {
        for (const pa of prod.allergens) {
          for (const ua of userAllergens) {
            if (
              pa.toLowerCase().includes(ua.toLowerCase()) ||
              ua.toLowerCase().includes(pa.toLowerCase())
            ) {
              conflicts.add(`${item.name} (${pa})`);
            }
          }
        }
      }
    }

    return Array.from(conflicts);
  });

  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
    city: string;
    taxId?: string;
    companyName?: string;
  } = {
    name: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    taxId: '',
    companyName: '',
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

  ngOnInit(): void {
    if (this.productsService) {
      void this.productsService.getProducts().then((prods) => {
        this.catalogProducts.set(prods);
      });
    }

    const user = this.authService?.currentUser();
    if (user) {
      if (!this.customer.name && user.name) this.customer.name = user.name;
      if (!this.customer.email && user.email) this.customer.email = user.email;
      if (!this.customer.phone && user.phone) this.customer.phone = user.phone;

      const defaultAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      if (defaultAddr) {
        if (!this.customer.address) this.customer.address = defaultAddr.street;
        if (!this.customer.postalCode) this.customer.postalCode = defaultAddr.postalCode;
        if (!this.customer.city) this.customer.city = defaultAddr.city;
      } else if (user.address) {
        if (!this.customer.address) this.customer.address = user.address;
        if (!this.customer.postalCode && user.postalCode)
          this.customer.postalCode = user.postalCode;
        if (!this.customer.city && user.city) this.customer.city = user.city;
      }

      if (user.fiscalData) {
        if (!this.customer.taxId && user.fiscalData.taxId)
          this.customer.taxId = user.fiscalData.taxId;
        if (!this.customer.companyName && user.fiscalData.companyName) {
          this.customer.companyName = user.fiscalData.companyName;
        }
      }

      if (user.preferences) {
        if (!this.orderNotes) {
          const cutLabels: Record<string, string> = {
            muy_fino: 'Corte muy fino',
            estandar: 'Corte estándar',
            grueso: 'Corte grueso',
          };
          const packLabels: Record<string, string> = {
            vacio_100g: 'Al vacío (100g)',
            vacio_200g: 'Al vacío (200g)',
            papel_colmado: 'Papel parafinado',
          };
          const parts: string[] = [];
          if (user.preferences.cutThickness) {
            parts.push(cutLabels[user.preferences.cutThickness] || user.preferences.cutThickness);
          }
          if (user.preferences.packaging) {
            parts.push(packLabels[user.preferences.packaging] || user.preferences.packaging);
          }
          if (user.preferences.allergens && user.preferences.allergens.length > 0) {
            parts.push(`Alérgenos: ${user.preferences.allergens.join(', ')}`);
          }
          const basePref = parts.length > 0 ? `[Obrador: ${parts.join(' | ')}]` : '';
          const customNote = user.preferences.obradorNotes?.trim() || '';
          this.orderNotes = [basePref, customNote].filter(Boolean).join(' ');
        }
      }
    }

    this.initDefaultSlot();
  }

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
    const base = this.cartService.getTotal() - this.couponDiscount() + this.shippingCost;
    return Math.max(0, Math.round((base - this.giftCardDiscount()) * 100) / 100);
  }

  applyCoupon(): void {
    this.couponError.set(null);
    this.couponSuccess.set(null);
    const code = this.couponCodeInput.trim();
    if (!code) {
      this.couponError.set(
        this.i18n.currentLang() === 'ca'
          ? 'Introdueix un codi de cupó.'
          : 'Introduce un código de cupón.',
      );
      return;
    }

    const result = this.couponsService.validateCoupon(code, this.cartService.getTotal());
    if (!result.valid) {
      this.couponError.set(result.error || 'El cupó no és vàlid.');
      return;
    }

    this.appliedCoupon.set(result.coupon!);
    const desc =
      result.coupon!.discountType === 'percentage'
        ? `-${result.coupon!.discountValue}% (-${result.discountAmount.toFixed(2)} €)`
        : `-${result.discountAmount.toFixed(2)} €`;

    this.couponSuccess.set(
      this.i18n.currentLang() === 'ca'
        ? `Cupó ${result.coupon!.code} aplicat: ${desc}`
        : `Cupón ${result.coupon!.code} aplicado con éxito: ${desc}`,
    );
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponError.set(null);
    this.couponSuccess.set(null);
    this.couponCodeInput = '';
  }

  applyGiftCard(): void {
    this.giftCardError.set(null);
    this.giftCardSuccess.set(null);
    const code = this.giftCardCodeInput.trim().toUpperCase();
    if (!code) {
      this.giftCardError.set(
        this.i18n.currentLang() === 'ca'
          ? 'Introdueix un codi de targeta regal.'
          : 'Introduce un código de tarjeta regalo.',
      );
      return;
    }

    const res = this.giftCardsService.checkBalance(code);
    if (!res.valid || !res.card) {
      this.giftCardError.set(
        res.message ||
          (this.i18n.currentLang() === 'ca'
            ? 'Targeta regal no vàlida o sense saldo.'
            : 'Tarjeta regalo no válida o sin saldo restante.'),
      );
      return;
    }

    const remainingDue = Math.max(
      0,
      this.cartService.getTotal() - this.couponDiscount() + this.shippingCost,
    );
    const appliedAmount = Math.min(remainingDue, res.card.currentBalance);
    const remainingBalance = Math.round((res.card.currentBalance - appliedAmount) * 100) / 100;

    this.appliedGiftCard.set({
      code: res.card.code,
      card: res.card,
      appliedAmount,
      remainingBalance,
    });

    this.giftCardSuccess.set(
      this.i18n.currentLang() === 'ca'
        ? `Targeta ${res.card.code} aplicada: -${appliedAmount.toFixed(2)} € (Saldo restant: ${remainingBalance.toFixed(2)} €)`
        : `Tarjeta ${res.card.code} aplicada con éxito: -${appliedAmount.toFixed(2)} € (Saldo restante: ${remainingBalance.toFixed(2)} €)`,
    );
  }

  removeGiftCard(): void {
    this.appliedGiftCard.set(null);
    this.giftCardError.set(null);
    this.giftCardSuccess.set(null);
    this.giftCardCodeInput = '';
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

    if (!this.selectedSlotDate) {
      errs.slotDate =
        this.i18n.currentLang() === 'ca'
          ? 'La data de recollida o lliurament és obligatòria.'
          : 'La fecha de entrega o recogida es obligatoria.';
    } else {
      const d = new Date(this.selectedSlotDate + 'T12:00:00');
      if (d.getDay() === 0) {
        errs.slotDate =
          this.i18n.currentLang() === 'ca'
            ? 'L’obrador de Cal Sardà roman tancat els diumenges per descans setmanal.'
            : 'El obrador de Cal Sardà permanece cerrado los domingos por descanso semanal.';
      } else if (this.selectedSlotDate < this.minSlotDate) {
        errs.slotDate =
          this.i18n.currentLang() === 'ca'
            ? this.fulfillment === 'delivery'
              ? 'El repartiment a domicili requereix un mínim de 24 hores d’antelació.'
              : 'La data seleccionada no compleix el marge mínim de preparació (mín. 2h).'
            : this.fulfillment === 'delivery'
              ? 'El reparto a domicilio requiere un mínimo de 24 horas de antelación.'
              : 'La fecha seleccionada no cumple el margen mínimo de preparación (mín. 2h).';
      }
    }

    if (!this.selectedTimeSlot) {
      errs.slotTime =
        this.i18n.currentLang() === 'ca'
          ? 'Has de triar una franja horària concertada.'
          : 'Debes elegir una franja horaria concertada.';
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
    if (this.selectedSlotDate < this.minSlotDate) {
      this.selectedSlotDate = this.minSlotDate;
    }
    this.initDefaultSlot();
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

      const coupon = this.appliedCoupon();
      const discount = this.couponDiscount();
      const giftCard = this.appliedGiftCard();
      const giftCardDisc = this.giftCardDiscount();

      const items = [...this.cartService.products()];
      const order = await this.ordersService.submitOrder({
        reference,
        customer: { ...this.customer },
        items,
        fulfillment: this.fulfillment,
        shippingCost: this.shippingCost,
        shippingZoneLabel: this.shippingZoneLabel,
        scheduledDate: this.selectedSlotDate,
        scheduledTimeSlot: this.selectedTimeSlot,
        subtotal: this.cartService.getTotal(),
        discount,
        couponCode: coupon ? coupon.code : undefined,
        giftCardDiscount: giftCardDisc > 0 ? giftCardDisc : undefined,
        giftCardCode: giftCard ? giftCard.code : undefined,
        total: this.finalTotal,
        notes: this.orderNotes.trim() || undefined,
        paymentMethod: this.paymentsService.getMethodLabel(
          this.paymentMethod,
          this.i18n.currentLang() === 'ca' ? 'ca' : 'es',
        ),
        paymentMethodType: this.paymentMethod,
        paymentStatus: tx.status,
        paymentTransactionId: tx.transactionId,
      });

      if (coupon) {
        this.couponsService.incrementUsage(coupon.code);
      }

      if (giftCard && giftCardDisc > 0) {
        this.giftCardsService.redeemBalance(giftCard.code, giftCardDisc);
      }

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
    this.removeCoupon();
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
