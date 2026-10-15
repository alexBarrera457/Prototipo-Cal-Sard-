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
});
