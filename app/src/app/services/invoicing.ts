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
  generateInvoice(
    order: Order,
    fiscalData?: {
      companyName?: string;
      taxId?: string;
      address?: string;
      postalCode?: string;
      city?: string;
    },
  ): Invoice {
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

    const customerName =
      fiscalData?.companyName ||
      order.customer?.companyName ||
      order.customer?.name ||
      'Cliente Particular';
    const customerTaxId = fiscalData?.taxId || order.customer?.taxId;
    const customerCompanyName = fiscalData?.companyName || order.customer?.companyName;
    const customerAddress = fiscalData?.address || order.customer?.address;
    const customerPostalCode = fiscalData?.postalCode || order.customer?.postalCode;
    const customerCity = fiscalData?.city || order.customer?.city;

    return {
      invoiceNumber,
      orderReference: ref,
      issuedAt,
      company: this.company,
      customer: {
        name: customerName,
        email: order.customer?.email ?? '',
        phone: order.customer?.phone,
        address: customerAddress,
        postalCode: customerPostalCode,
        city: customerCity,
        taxId: customerTaxId,
        companyName: customerCompanyName,
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
        ${invoice.customer.taxId ? `NIF/CIF: <strong>${invoice.customer.taxId}</strong><br>` : ''}
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

  /**
   * Genera el HTML de la comanda de preparación / hoja de obrador del colmado.
   */
  generatePreparationSlipHtml(order: Order, lang: 'es' | 'ca' = 'es'): string {
    const isCa = lang === 'ca';
    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString(isCa ? 'ca-ES' : 'es-ES', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleDateString();

    const fulfillmentText =
      order.fulfillment === 'delivery'
        ? isCa
          ? '🚚 REPARTIMENT A DOMICILI'
          : '🚚 REPARTO A DOMICILIO'
        : isCa
          ? '🏪 RECOLLIDA AL COLMADO (Marina 237)'
          : '🏪 RECOGIDA EN COLMADO (Marina 237)';

    const itemsRows = (order.items ?? [])
      .map(
        (it) => `
      <tr>
        <td style="text-align:center; width: 40px; font-size: 16px;">[ &nbsp; ]</td>
        <td style="font-weight: 600;">${it.name}</td>
        <td style="text-align: center; font-size: 14px; font-weight: 700;">${it.quantity}</td>
        <td style="text-align: right; color: #555;">${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(it.price * it.quantity)}</td>
      </tr>
    `,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${isCa ? 'Comanda de Preparació' : 'Comanda de Preparación'} ${order.reference} - Cal Sardà</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.4;
      font-size: 13px;
      margin: 0;
      padding: 20px;
    }
    .slip-container {
      max-width: 760px;
      margin: 0 auto;
      border: 2px solid #2b2520;
      padding: 24px;
      border-radius: 8px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #9e3a24;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #9e3a24;
      margin: 0;
      letter-spacing: 0.05em;
    }
    .brand-sub {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #555;
    }
    .meta-box {
      text-align: right;
    }
    .meta-box h2 {
      margin: 0;
      font-size: 20px;
      font-family: monospace;
      color: #1a1a1a;
    }
    .fulfillment-badge {
      display: inline-block;
      margin-top: 4px;
      padding: 4px 10px;
      background: #f4eee2;
      border: 1px solid #dfd8cc;
      font-weight: 700;
      font-size: 12px;
      border-radius: 4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .info-card {
      background: #faf8f5;
      border: 1px solid #e5dfd5;
      padding: 10px 14px;
      border-radius: 6px;
    }
    .info-title {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #9e3a24;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .notes-box {
      background: #fffbeb;
      border: 2px dashed #d97706;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .notes-title {
      font-size: 11px;
      font-weight: 700;
      color: #b45309;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #2b2520;
      color: #fff;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: left;
    }
    td {
      padding: 9px 10px;
      border-bottom: 1px solid #ddd;
    }
    .footer-control {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 24px;
      border-top: 1px solid #2b2520;
      padding-top: 14px;
      font-size: 11px;
    }
    .control-box {
      border: 1px solid #ccc;
      padding: 8px;
      height: 48px;
      border-radius: 4px;
    }
    @media print {
      body { padding: 0; }
      .slip-container { border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="header">
      <div>
        <h1 class="brand-title">CAL SARDÀ</h1>
        <div class="brand-sub">${isCa ? 'COLMADO FAMILIAR DES DE 1930 · SAGRADA FAMÍLIA' : 'COLMADO FAMILIAR DESDE 1930 · SAGRADA FAMILIA'}</div>
      </div>
      <div class="meta-box">
        <h2>${order.reference}</h2>
        <div class="fulfillment-badge">${fulfillmentText}</div>
        <div style="font-size: 11px; color: #555; margin-top: 4px;">${formattedDate}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-title">${isCa ? 'Client' : 'Cliente'}</div>
        <strong style="font-size: 14px;">${order.customer?.name}</strong><br>
        ${order.customer?.phone ? `📞 Tel: <strong>${order.customer.phone}</strong><br>` : ''}
        ${order.customer?.email ? `✉️ ${order.customer.email}` : ''}
      </div>
      <div class="info-card">
        <div class="info-title">${isCa ? 'Destinació / Lliurament' : 'Destino / Entrega'}</div>
        ${
          order.fulfillment === 'delivery'
            ? `
          <strong>${order.customer?.address || ''}</strong><br>
          ${order.customer?.postalCode || ''} ${order.customer?.city || ''}
        `
            : `
          <strong>Cal Sardà Colmado</strong><br>
          Carrer de la Marina, 237, 08013 Barcelona
        `
        }
      </div>
    </div>

    ${
      order.notes
        ? `
      <div class="notes-box">
        <div class="notes-title">⚠️ ${isCa ? 'INDICACIONS ESPECIALS DEL CLIENT (Tall / Envasat)' : 'INDICACIONES ESPECIALES DEL CLIENTE (Corte / Envasado)'}</div>
        <div style="font-size: 13px; font-weight: 600;">« ${order.notes} »</div>
      </div>
    `
        : ''
    }

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">OK</th>
          <th>${isCa ? 'Producte / Article del Colmado' : 'Producto / Artículo del Colmado'}</th>
          <th style="text-align: center; width: 70px;">${isCa ? 'Quant.' : 'Cant.'}</th>
          <th style="text-align: right; width: 90px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div style="text-align: right; font-size: 14px; margin-bottom: 14px;">
      <strong>Total comanda: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total)}</strong>
    </div>

    <div class="footer-control">
      <div class="control-box">
        <strong>${isCa ? 'Preparat per:' : 'Preparado por:'}</strong>
      </div>
      <div class="control-box">
        <strong>${isCa ? 'Comprovat per:' : 'Comprobado por:'}</strong>
      </div>
      <div class="control-box">
        <strong>${isCa ? 'Hora recollida/sortida:' : 'Hora recogida/salida:'}</strong>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Abre la comanda de preparación en una ventana lista para imprimir.
   */
  printPreparationSlip(order: Order, lang: 'es' | 'ca' = 'es'): void {
    if (typeof window === 'undefined') {
      return;
    }
    const html = this.generatePreparationSlipHtml(order, lang);
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
