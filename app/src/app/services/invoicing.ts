import { Injectable } from '@angular/core';
import type { Invoice, InvoiceItem, Order, TaxBreakdownItem } from '@cal-sarda/domain';

export const CAL_SARDA_COMPANY_INFO = {
  legalName: 'Cal Sardà Obrador Gastronòmic S.L.',
  tradeName: 'Cal Sardà (Des de 1930)',
  cif: 'B-08193026',
  address: 'Carrer de la Marina, 237',
  postalCode: '08013',
  city: 'Barcelona',
  country: 'España',
  phone: '+34 93 245 67 89',
  email: 'obrador@calsarda.com',
};

/**
 * Determina el tipo impositivo de IVA según la naturaleza del producto alimenticio o servicio.
 * - 4% Superreducido: Panes artesanales de obrador y productos de primera necesidad.
 * - 10% Reducido: Alimentos en general (café, conservas, turrones, dulces, embutidos, frutos secos).
 * - 21% General: Bodega (vinos, cavas, licores), lotes de empresa y gastos de logística/envío.
 */
export function determineVatRate(item: { name: string; productNumber?: string }): number {
  const name = item.name.toLowerCase();

  // 21% Bodega / Bebidas alcohólicas
  if (
    name.includes('vino') ||
    name.includes('cava') ||
    name.includes('bodega') ||
    name.includes('vermut') ||
    name.includes('licor') ||
    name.includes('espumoso')
  ) {
    return 21;
  }

  // 4% Pan artesanal de masa madre y pan de molde obrador
  if (
    name.includes('pan ') ||
    name.includes('pa ') ||
    name.includes('pagès') ||
    name.includes('pages') ||
    name.includes('hogaza') ||
    name.includes('baguette')
  ) {
    return 4;
  }

  // 10% Alimentación general gourmet
  return 10;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

@Injectable({
  providedIn: 'root',
})
export class InvoicingService {
  readonly company = CAL_SARDA_COMPANY_INFO;

  /**
   * Genera el desglose fiscal formal de una factura simplificada / ticket a partir de un pedido.
   */
  generateInvoice(order: Order): Invoice {
    const ref = order.reference ?? 'CS-DEMO-001';
    const invoiceNumber = `FS-${ref.replace(/^CS-/, '')}`;
    const issuedAt = order.createdAt ?? new Date().toISOString();

    // 1. Procesar líneas de pedido
    const invoiceItems: InvoiceItem[] = (order.items ?? []).map((item) => {
      const quantity = Math.max(1, item.quantity ?? 1);
      const unitPrice = round2(item.price ?? 0);
      const total = round2(unitPrice * quantity);
      const vatRate = determineVatRate(item);
      const baseAmount = round2(total / (1 + vatRate / 100));
      const vatAmount = round2(total - baseAmount);

      return {
        name: item.name,
        quantity,
        unitPrice,
        total,
        vatRate,
        baseAmount,
        vatAmount,
      };
    });

    // 2. Gastos de envío (IVA General 21%)
    const shippingTotal = round2(order.shippingCost ?? 0);
    const shippingVatRate = 21;
    const shippingBase = round2(shippingTotal / (1 + shippingVatRate / 100));
    const shippingVat = round2(shippingTotal - shippingBase);

    // 3. Agrupar desglose por tipo de IVA
    const taxMap = new Map<number, { base: number; vat: number; total: number }>();

    for (const item of invoiceItems) {
      const current = taxMap.get(item.vatRate) ?? { base: 0, vat: 0, total: 0 };
      current.base = round2(current.base + item.baseAmount);
      current.vat = round2(current.vat + item.vatAmount);
      current.total = round2(current.total + item.total);
      taxMap.set(item.vatRate, current);
    }

    if (shippingTotal > 0) {
      const current = taxMap.get(shippingVatRate) ?? { base: 0, vat: 0, total: 0 };
      current.base = round2(current.base + shippingBase);
      current.vat = round2(current.vat + shippingVat);
      current.total = round2(current.total + shippingTotal);
      taxMap.set(shippingVatRate, current);
    }

    const taxBreakdown: TaxBreakdownItem[] = Array.from(taxMap.entries())
      .map(([vatRate, val]) => ({
        vatRate,
        baseAmount: round2(val.base),
        vatAmount: round2(val.vat),
        total: round2(val.total),
      }))
      .sort((a, b) => a.vatRate - b.vatRate);

    // 4. Totales consolidados
    const subtotalBase = round2(taxBreakdown.reduce((sum, t) => sum + t.baseAmount, 0));
    const totalVat = round2(taxBreakdown.reduce((sum, t) => sum + t.vatAmount, 0));
    const grandTotal = round2(order.total ?? subtotalBase + totalVat);

    return {
      invoiceNumber,
      orderReference: ref,
      issuedAt,
      company: this.company,
      customer: {
        name: order.customer?.name ?? 'Cliente Particular',
        email: order.customer?.email ?? '',
        phone: order.customer?.phone,
        address: order.customer?.address,
        postalCode: order.customer?.postalCode,
        city: order.customer?.city,
      },
      items: invoiceItems,
      taxBreakdown,
      subtotalBase,
      totalVat,
      shippingBase,
      shippingVat,
      shippingTotal,
      total: grandTotal,
      paymentMethod: order.paymentMethod,
      fulfillment: order.fulfillment,
    };
  }

  /**
   * Genera el HTML formateado para impresión formal o exportación a PDF.
   */
  generateInvoiceHtml(invoice: Invoice): string {
    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

    const formattedDate = new Date(invoice.issuedAt).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const itemsRows = invoice.items
      .map(
        (it) => `
        <tr>
          <td>${it.name}</td>
          <td style="text-align:center;">${it.quantity}</td>
          <td style="text-align:right;">${formatCurrency(it.unitPrice)}</td>
          <td style="text-align:center;">${it.vatRate}%</td>
          <td style="text-align:right; font-weight:600;">${formatCurrency(it.total)}</td>
        </tr>`,
      )
      .join('');

    const shippingRow =
      invoice.shippingTotal > 0
        ? `
        <tr>
          <td>Gastos de envío refrigerado a domicilio</td>
          <td style="text-align:center;">1</td>
          <td style="text-align:right;">${formatCurrency(invoice.shippingTotal)}</td>
          <td style="text-align:center;">21%</td>
          <td style="text-align:right; font-weight:600;">${formatCurrency(invoice.shippingTotal)}</td>
        </tr>`
        : '';

    const taxRows = invoice.taxBreakdown
      .map(
        (t) => `
        <tr>
          <td>IVA ${t.vatRate}%</td>
          <td style="text-align:right;">${formatCurrency(t.baseAmount)}</td>
          <td style="text-align:right;">${formatCurrency(t.vatAmount)}</td>
          <td style="text-align:right; font-weight:600;">${formatCurrency(t.total)}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Factura Simplificada ${invoice.invoiceNumber} - Cal Sardà</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 24px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e5e0d8;
      padding: 32px;
      border-radius: 8px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #8c2423;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 700;
      color: #8c2423;
      letter-spacing: 0.05em;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #666;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta h2 {
      margin: 0;
      font-size: 18px;
      color: #1a1a1a;
    }
    .invoice-meta p {
      margin: 2px 0 0;
      color: #666;
    }
    .columns {
      display: flex;
      justify-content: space-between;
      margin-bottom: 28px;
      gap: 20px;
    }
    .box {
      flex: 1;
      background: #faf8f5;
      border: 1px solid #eee8e0;
      padding: 14px 18px;
      border-radius: 6px;
    }
    .box-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #8c2423;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #f4ede4;
      color: #5c432d;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 10px;
      border-bottom: 1px solid #d4cdc5;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
    }
    .tax-table {
      margin-top: 14px;
      font-size: 12px;
    }
    .tax-table th {
      background: #f8f6f2;
    }
    .totals-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #8c2423;
    }
    .grand-total {
      text-align: right;
    }
    .grand-total-val {
      font-size: 24px;
      font-weight: 700;
      color: #8c2423;
    }
    .footer-note {
      margin-top: 32px;
      text-align: center;
      font-size: 11px;
      color: #777;
      border-top: 1px dashed #d4cdc5;
      padding-top: 14px;
    }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1 class="brand-title">CAL SARDÀ</h1>
        <div class="brand-sub">OBRADOR GASTRONÒMIC DES DE 1930</div>
      </div>
      <div class="invoice-meta">
        <h2>FACTURA SIMPLIFICADA</h2>
        <p><strong>Nº:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Pedido:</strong> ${invoice.orderReference}</p>
      </div>
    </div>

    <div class="columns">
      <div class="box">
        <div class="box-title">Emisor / Vendedor</div>
        <strong>${invoice.company.legalName}</strong><br>
        NIF: ${invoice.company.cif}<br>
        ${invoice.company.address}<br>
        ${invoice.company.postalCode} ${invoice.company.city} (${invoice.company.country})<br>
        Tel: ${invoice.company.phone} · ${invoice.company.email}
      </div>
      <div class="box">
        <div class="box-title">Cliente / Destinatario</div>
        <strong>${invoice.customer.name}</strong><br>
        ${invoice.customer.email ? `Email: ${invoice.customer.email}<br>` : ''}
        ${invoice.customer.phone ? `Tel: ${invoice.customer.phone}<br>` : ''}
        ${invoice.customer.address ? `${invoice.customer.address}, ${invoice.customer.postalCode || ''} ${invoice.customer.city || ''}<br>` : ''}
        Modalidad: ${invoice.fulfillment === 'delivery' ? 'Entrega a domicilio' : 'Recogida en tienda (Marina 237)'}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left;">Concepto</th>
          <th style="text-align:center;">Cant.</th>
          <th style="text-align:right;">Precio Ud.</th>
          <th style="text-align:center;">IVA</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        ${shippingRow}
      </tbody>
    </table>

    <div class="box-title">Desglose de Impuestos (IVA)</div>
    <table class="tax-table">
      <thead>
        <tr>
          <th style="text-align:left;">Tipo de Impuesto</th>
          <th style="text-align:right;">Base Imponible</th>
          <th style="text-align:right;">Cuota IVA</th>
          <th style="text-align:right;">Total con IVA</th>
        </tr>
      </thead>
      <tbody>
        ${taxRows}
      </tbody>
    </table>

    <div class="totals-area">
      <div>
        <p style="margin:0; font-size:12px; color:#666;">
          Régimen General de IVA español.<br>
          Método de pago: <strong>${invoice.paymentMethod || 'Abono en tienda / contra reembolso'}</strong>
        </p>
      </div>
      <div class="grand-total">
        <span style="font-size:12px; font-weight:600; text-transform:uppercase; color:#666;">TOTAL FACTURA</span><br>
        <span class="grand-total-val">${formatCurrency(invoice.total)}</span>
      </div>
    </div>

    <div class="footer-note">
      Documento válido como justificante y factura simplificada según el RD 1619/2012 de facturación.<br>
      Cal Sardà · Carrer de la Marina, 237 · 08013 Barcelona · Gràcies per la vostra confiança!
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Abre la factura simplificada en una ventana lista para imprimir o guardar en PDF.
   */
  printInvoice(invoice: Invoice): void {
    if (typeof window === 'undefined') {
      return;
    }
    const html = this.generateInvoiceHtml(invoice);
    const printWindow = window.open('', '_blank', 'width=840,height=900');
    if (!printWindow) {
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
