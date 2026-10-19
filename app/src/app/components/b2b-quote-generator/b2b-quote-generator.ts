import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../services/i18n';
import { AuthService } from '../../services/auth';
import { OrdersService, type Order } from '../../services/orders';
import { InvoicingService, round2 } from '../../services/invoicing';
import type { Invoice } from '@cal-sarda/domain';

export interface CorporateLotOption {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  badge?: string;
  highlights: string[];
}

export const CORPORATE_LOTS: CorporateLotOption[] = [
  {
    id: 'lote-tradicion',
    name: 'Lote Tradición Catalana',
    price: 45.0,
    description:
      'Selección de embutidos artesanos del obrador, fuet de Vic, queso curado de pastor y pan de cristal.',
    image: '/images/gift-lots/lote-de-embutidos-catalanes.jpg',
    badge: 'MÁS POPULAR',
    highlights: ['Fuet artesano', 'Queso curado', 'Lomo ibérico', 'Pan de cristal'],
  },
  {
    id: 'lote-bodega-navidad',
    name: 'Lote Bodega & Selección Navideña',
    price: 55.0,
    description:
      'Cava Brut Nature Reserva de autor, turrón blando de Jijona de obrador, barquillos artesanales y jamón ibérico.',
    image: '/images/gift-lots/lote-de-productos-catalanes.jpg',
    badge: 'SELECCIÓN SARDÀ',
    highlights: [
      'Cava Brut Nature D.O.',
      'Turrón blando obrador',
      'Jamón ibérico',
      'Neules artesanes',
    ],
  },
  {
    id: 'lote-gran-reserva',
    name: 'Lote Gran Reserva Cal Sardà',
    price: 85.0,
    description:
      'Paleta de bellota 100% ibérica, vino Priorat D.O.Q., conservas premium de mar del Cantábrico y dulces gourmet.',
    image: '/images/gift-lots/lote-de-productos-catalanes-artesanos.jpg',
    badge: 'GOURMET PREMIUM',
    highlights: [
      'Paleta bellota 100%',
      'Vino D.O.Q. Priorat',
      'Bonito del Cantábrico',
      'Chocolates artesanos',
    ],
  },
  {
    id: 'lote-turrones-fiesta',
    name: 'Lote Dulces Tradicionales y Turrones',
    price: 40.0,
    description:
      'Variedad de turrones artesanos, polvorones de almendra marcona, peladillas y barquillos con chocolate.',
    image: '/images/gift-lots/lote-de-turrones-artesanos-especiales.jpg',
    badge: 'TRADICIÓN NAVIDEÑA',
    highlights: [
      'Turrón de Jijona',
      'Turrón de Alicante',
      'Polvorones artesanos',
      'Barquillos chocolate',
    ],
  },
];

@Component({
  selector: 'app-b2b-quote-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './b2b-quote-generator.html',
  styleUrl: './b2b-quote-generator.css',
})
export class B2bQuoteGeneratorComponent {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService, { optional: true });
  readonly ordersService = inject(OrdersService);
  readonly invoicingService = inject(InvoicingService);

  readonly lots = CORPORATE_LOTS;
  readonly selectedLot = signal<CorporateLotOption>(CORPORATE_LOTS[0]);
  readonly quantity = signal<number>(30);

  // Formulario fiscal
  companyName = '';
  cif = '';
  fiscalAddress = '';
  postalCode = '';
  city = '';
  contactPerson = '';
  contactEmail = '';
  contactPhone = '';
  deliveryNotes = '';

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly generatedInvoice = signal<Invoice | null>(null);

  constructor() {
    this.prefillUserFiscalData();
  }

  private prefillUserFiscalData(): void {
    const user = this.auth?.currentUser();
    if (user) {
      this.contactPerson = user.name || '';
      this.contactEmail = user.email || '';
      this.contactPhone = user.phone || '';
      if (user.fiscalData) {
        this.companyName = user.fiscalData.companyName || '';
        this.cif = user.fiscalData.taxId || '';
        this.fiscalAddress = user.fiscalData.address || '';
        this.postalCode = user.fiscalData.postalCode || '';
        this.city = user.fiscalData.city || '';
      }
    }
  }

  selectLot(lot: CorporateLotOption): void {
    this.selectedLot.set(lot);
  }

  setQuantity(qty: number): void {
    if (qty >= 1) {
      this.quantity.set(qty);
    }
  }

  // Cálculos económicos en tiempo real
  readonly grossSubtotal = computed<number>(() => {
    return round2(this.selectedLot().price * this.quantity());
  });

  readonly discountPercent = computed<number>(() => {
    // 3% por encargo anticipado + 2% adicional si supera 1.800 €
    return this.grossSubtotal() >= 1800 ? 5 : 3;
  });

  readonly discountAmount = computed<number>(() => {
    return round2((this.grossSubtotal() * this.discountPercent()) / 100);
  });

  readonly netBase = computed<number>(() => {
    return round2(this.grossSubtotal() - this.discountAmount());
  });

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  }

  async generateProforma(): Promise<void> {
    this.errorMessage.set('');

    const company = this.companyName.trim();
    const taxId = this.cif.trim().toUpperCase();
    const email = this.contactEmail.trim();
    const address = this.fiscalAddress.trim();
    const pCode = this.postalCode.trim();
    const city = this.city.trim() || 'Barcelona';

    if (!company || !taxId || !email || !address || !pCode) {
      this.errorMessage.set(this.i18n.t('b2b.validation_error'));
      return;
    }

    this.isSubmitting.set(true);

    try {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const proformaRef = `PRF-${year}-${randomSuffix}`;
      const lot = this.selectedLot();
      const qty = this.quantity();
      const discount = this.discountPercent();
      const discountedUnitPrice = round2(lot.price * (1 - discount / 100));

      const orderData: Order = await this.ordersService.submitOrder({
        reference: proformaRef,
        status: 'proforma',
        paymentStatus: 'pending',
        customer: {
          name: this.contactPerson.trim() || company,
          companyName: company,
          taxId,
          email,
          phone: this.contactPhone.trim() || undefined,
          address,
          postalCode: pCode,
          city,
        },
        items: [
          {
            name: `${lot.name} (Lote Corporativo)`,
            price: discountedUnitPrice,
            quantity: qty,
          },
        ],
        subtotal: this.netBase(),
        shippingCost: 0,
        total: this.netBase(),
        fulfillment: 'delivery',
        paymentMethod: 'Transferencia bancaria B2B',
        notes: `Factura Proforma B2B: ${company} (CIF: ${taxId}). Descuento aplicado: ${discount}%. ${this.deliveryNotes ? 'Notas: ' + this.deliveryNotes : ''}`,
      });

      const invoice = this.invoicingService.generateInvoice(orderData, {
        companyName: company,
        taxId,
        address,
        postalCode: pCode,
        city,
      });

      this.generatedInvoice.set(invoice);
    } catch {
      this.errorMessage.set('Hubo un error al generar la proforma. Por favor inténtalo de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  printProforma(): void {
    const inv = this.generatedInvoice();
    if (inv) {
      this.invoicingService.printInvoice(inv);
    }
  }

  reset(): void {
    this.generatedInvoice.set(null);
    this.errorMessage.set('');
  }
}
