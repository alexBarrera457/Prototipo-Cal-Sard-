import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { InvoicingService, determineVatRate, CAL_SARDA_COMPANY_INFO } from './invoicing';
import type { Order } from '@cal-sarda/domain';

describe('InvoicingService', () => {
  let service: InvoicingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InvoicingService],
    });
    service = TestBed.inject(InvoicingService);
  });

  it('determines VAT rates accurately by food/product category', () => {
    // 4% Superreducido: Panes artesanales de obrador
    expect(determineVatRate({ name: 'Pa de Pagès Tradicional' })).toBe(4);
    expect(determineVatRate({ name: 'Pan de masa madre' })).toBe(4);

    // 10% Reducido: Alimentos generales, conservas, cafés, dulces
    expect(determineVatRate({ name: 'Café 100% Robusta Natural' })).toBe(10);
    expect(determineVatRate({ name: 'Bonito del Norte en Aceite de Oliva' })).toBe(10);
    expect(determineVatRate({ name: 'Turrón de Agramunt' })).toBe(10);
    expect(determineVatRate({ name: 'Jamón Ibérico de Bellota' })).toBe(10);

    // 21% General: Bodega gourmet, vinos, cavas y licores
    expect(determineVatRate({ name: 'Vino Tinto Priorat DOQ' })).toBe(21);
    expect(determineVatRate({ name: 'Cava Brut Nature Gran Reserva' })).toBe(21);
    expect(determineVatRate({ name: 'Vermut Artesano de Reus' })).toBe(21);
  });

  it('generates simplified invoice with fiscal data and exact VAT breakdown', () => {
    const order: Order = {
      reference: 'CS-2026-1042',
      customer: {
        name: 'Montserrat Puig',
        email: 'montserrat@example.com',
        phone: '612 345 678',
        address: 'Carrer de Mallorca, 350',
        postalCode: '08013',
        city: 'Barcelona',
      },
      items: [
        {
          name: 'Pa de Pagès 1kg',
          price: 4.5,
          quantity: 2, // Total 9.00 € (4% IVA)
        },
        {
          name: 'Café gourmet en grano',
          price: 8.8,
          quantity: 1, // Total 8.80 € (10% IVA)
        },
        {
          name: 'Vino Tinto Selección',
          price: 18.0,
          quantity: 1, // Total 18.00 € (21% IVA)
        },
      ],
      shippingCost: 7.99, // 21% IVA
      total: 43.79,
      fulfillment: 'delivery',
      paymentMethod: 'Tarjeta bancaria',
      status: 'confirmed',
    };

    const invoice = service.generateInvoice(order);

    expect(invoice.invoiceNumber).toBe('FS-2026-1042');
    expect(invoice.orderReference).toBe('CS-2026-1042');
    expect(invoice.company.cif).toBe(CAL_SARDA_COMPANY_INFO.cif);
    expect(invoice.company.address).toContain('Marina, 237');
    expect(invoice.customer.name).toBe('Montserrat Puig');

    // Comprobar desglose impositivo
    expect(invoice.taxBreakdown.length).toBe(3); // 4%, 10%, 21%

    const vat4 = invoice.taxBreakdown.find((t) => t.vatRate === 4);
    expect(vat4).toBeDefined();
    expect(vat4?.total).toBe(9.0);
    // Base 4%: 9 / 1.04 = 8.65
    expect(vat4?.baseAmount).toBe(8.65);
    expect(vat4?.vatAmount).toBe(0.35);

    const vat10 = invoice.taxBreakdown.find((t) => t.vatRate === 10);
    expect(vat10).toBeDefined();
    expect(vat10?.total).toBe(8.8);
    // Base 10%: 8.8 / 1.10 = 8.00
    expect(vat10?.baseAmount).toBe(8.0);
    expect(vat10?.vatAmount).toBe(0.8);

    const vat21 = invoice.taxBreakdown.find((t) => t.vatRate === 21);
    expect(vat21).toBeDefined();
    // 18.00 € vino + 7.99 € envío = 25.99 €
    expect(vat21?.total).toBe(25.99);

    // Suma de base + IVA debe cuadrar exactamente
    const calculatedTotal = invoice.subtotalBase + invoice.totalVat;
    expect(Math.abs(calculatedTotal - order.total)).toBeLessThanOrEqual(0.02);
  });

  it('renders printable HTML template with company NIF and legal references', () => {
    const order: Order = {
      reference: 'CS-2026-0001',
      customer: {
        name: 'Cliente Test',
        email: 'test@example.com',
      },
      items: [
        {
          name: 'Turrón Blando',
          price: 10.0,
          quantity: 1,
        },
      ],
      total: 10.0,
      status: 'confirmed',
    };

    const invoice = service.generateInvoice(order);
    const html = service.generateInvoiceHtml(invoice);

    expect(html).toContain('FACTURA SIMPLIFICADA');
    expect(html).toContain('FS-2026-0001');
    expect(html).toContain(CAL_SARDA_COMPANY_INFO.cif);
    expect(html).toContain('RD 1619/2012');
    expect(html).toContain('Desglose de Impuestos (IVA)');
    expect(html).toContain('Turrón Blando');
  });

  it('incorporates customer fiscal data (company name, NIF/CIF, address) when provided', () => {
    const order: Order = {
      reference: 'CS-2026-0099',
      customer: {
        name: 'Particular Nombre',
        email: 'empresa@example.com',
      },
      items: [
        {
          name: 'Lote Gourmet Especial',
          price: 50.0,
          quantity: 1,
        },
      ],
      total: 50.0,
      status: 'confirmed',
    };

    const fiscalData = {
      companyName: 'Gourmet BCN S.L.',
      taxId: 'B-12345678',
      address: 'Passeig de Gràcia, 100',
      postalCode: '08008',
      city: 'Barcelona',
    };

    const invoice = service.generateInvoice(order, fiscalData);
    expect(invoice.customer.name).toBe('Gourmet BCN S.L.');
    expect(invoice.customer.taxId).toBe('B-12345678');
    expect(invoice.customer.companyName).toBe('Gourmet BCN S.L.');
    expect(invoice.customer.address).toBe('Passeig de Gràcia, 100');

    const html = service.generateInvoiceHtml(invoice);
    expect(html).toContain('Gourmet BCN S.L.');
    expect(html).toContain('B-12345678');
  });

  it('distributes discounts proportionally across tax rates and guarantees strict fiscal invariant', () => {
    const order: Order = {
      reference: 'CS-2026-DISC-01',
      customer: {
        name: 'Maria Valls',
        email: 'maria@example.com',
      },
      items: [
        {
          name: 'Pa de Pagès artesanal', // 4% IVA
          price: 5.0,
          quantity: 2, // 10.00 €
        },
        {
          name: 'Café Robusta', // 10% IVA
          price: 10.0,
          quantity: 2, // 20.00 €
        },
        {
          name: 'Vino Tinto Priorat', // 21% IVA
          price: 20.0,
          quantity: 1, // 20.00 €
        },
      ],
      shippingCost: 5.0, // 21% IVA
      // Subtotal productos = 50.00 €, Envío = 5.00 €, Total bruto = 55.00 €
      discount: 10.0, // Cupón 10€
      giftCardDiscount: 5.0, // Tarjeta 5€
      total: 40.0, // Total final facturado
      status: 'confirmed',
    };

    const invoice = service.generateInvoice(order);

    expect(invoice.total).toBe(40.0);
    expect(invoice.discount).toBe(15.0);

    // Invariante fiscal legal estricto: subtotalBase + totalVat === total
    const sumCalculated = Math.round((invoice.subtotalBase + invoice.totalVat) * 100) / 100;
    expect(sumCalculated).toBe(invoice.total);

    // Cada fila del desglose debe cumplir baseAmount + vatAmount === total
    for (const item of invoice.taxBreakdown) {
      const lineSum = Math.round((item.baseAmount + item.vatAmount) * 100) / 100;
      expect(lineSum).toBe(item.total);
    }

    // Comprobar que el HTML incluye la línea de descuento
    const html = service.generateInvoiceHtml(invoice);
    expect(html).toContain('Descuento aplicado');
    expect(html).toContain('15,00');
  });

  it('renders watermark and cancellation banner when order is cancelled', () => {
    const order: Order = {
      reference: 'CS-2026-CANCELLED',
      customer: {
        name: 'Joan Roig',
        email: 'joan@example.com',
      },
      items: [
        {
          name: 'Fuet Artesano',
          price: 7.5,
          quantity: 1,
        },
      ],
      total: 7.5,
      status: 'cancelado',
    };

    const invoice = service.generateInvoice(order);
    expect(invoice.isCancelled).toBe(true);

    const html = service.generateInvoiceHtml(invoice);
    expect(html).toContain('FACTURA ANULADA / ABONO');
    expect(html).toContain('DOCUMENTO DE ABONO - Pedido cancelado');
  });
});
