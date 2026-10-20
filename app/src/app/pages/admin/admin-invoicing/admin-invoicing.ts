import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersService, type Order } from '../../../services/orders';
import { InvoicingService } from '../../../services/invoicing';
import { I18nService } from '../../../services/i18n';
import type { Invoice, TaxBreakdownItem } from '@cal-sarda/domain';

export interface FiscalAggregates {
  totalBilled: number;
  totalBase: number;
  totalVat: number;
  invoiceCount: number;
  base4: number;
  vat4: number;
  base10: number;
  vat10: number;
  base21: number;
  vat21: number;
}

@Component({
  selector: 'app-admin-invoicing',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin-invoicing.html',
  styleUrl: './admin-invoicing.css',
})
export class AdminInvoicing {
  readonly ordersService = inject(OrdersService);
  readonly invoicingService = inject(InvoicingService);
  readonly i18n = inject(I18nService);

  readonly searchQuery = signal<string>('');
  searchQueryModel = '';
  readonly periodFilter = signal<string>('todos');
  readonly vatFilter = signal<string>('todos');
  readonly selectedInvoice = signal<Invoice | null>(null);

  // Convierte los pedidos reactivos en facturas simplificadas oficiales
  readonly allInvoices = computed<Invoice[]>(() => {
    const orders = this.ordersService.allOrders();
    return orders.map((order) => this.invoicingService.generateInvoice(order));
  });

  // Facturas filtradas por texto, periodo y presencia de tipos de IVA
  readonly filteredInvoices = computed<Invoice[]>(() => {
    const invoices = this.allInvoices();
    const query = this.searchQuery().trim().toLowerCase();
    const period = this.periodFilter();
    const vat = this.vatFilter();
    const now = new Date();

    return invoices.filter((inv) => {
      // 1. Filtro por periodo temporal
      if (period !== 'todos') {
        const invDate = new Date(inv.issuedAt);
        if (period === 'hoy') {
          const isToday =
            invDate.getDate() === now.getDate() &&
            invDate.getMonth() === now.getMonth() &&
            invDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (period === 'semana') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (invDate < sevenDaysAgo) return false;
        } else if (period === 'mes') {
          const isThisMonth =
            invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        }
      }

      // 2. Filtro por tipo de IVA contenido en la factura
      if (vat !== 'todos') {
        const targetRate = Number(vat);
        const hasRate = inv.taxBreakdown.some((t) => t.vatRate === targetRate);
        if (!hasRate) return false;
      }

      // 3. Filtro por búsqueda de texto
      if (query) {
        const numMatch = inv.invoiceNumber.toLowerCase().includes(query);
        const refMatch = inv.orderReference.toLowerCase().includes(query);
        const nameMatch = inv.customer.name.toLowerCase().includes(query);
        const emailMatch = inv.customer.email
          ? inv.customer.email.toLowerCase().includes(query)
          : false;
        if (!numMatch && !refMatch && !nameMatch && !emailMatch) {
          return false;
        }
      }

      return true;
    });
  });

  // Acumulados y totales fiscales
  readonly fiscalAggregates = computed<FiscalAggregates>(() => {
    const invoices = this.filteredInvoices();
    let totalBilled = 0;
    let totalBase = 0;
    let totalVat = 0;
    let base4 = 0;
    let vat4 = 0;
    let base10 = 0;
    let vat10 = 0;
    let base21 = 0;
    let vat21 = 0;

    for (const inv of invoices) {
      totalBilled += inv.total;
      totalBase += inv.subtotalBase;
      totalVat += inv.totalVat;

      for (const t of inv.taxBreakdown) {
        if (t.vatRate === 4) {
          base4 += t.baseAmount;
          vat4 += t.vatAmount;
        } else if (t.vatRate === 10) {
          base10 += t.baseAmount;
          vat10 += t.vatAmount;
        } else if (t.vatRate === 21) {
          base21 += t.baseAmount;
          vat21 += t.vatAmount;
        }
      }
    }

    const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

    return {
      totalBilled: round(totalBilled),
      totalBase: round(totalBase),
      totalVat: round(totalVat),
      invoiceCount: invoices.length,
      base4: round(base4),
      vat4: round(vat4),
      base10: round(base10),
      vat10: round(vat10),
      base21: round(base21),
      vat21: round(vat21),
    };
  });

  onSearchChange(): void {
    this.searchQuery.set(this.searchQueryModel);
  }

  clearSearch(): void {
    this.searchQueryModel = '';
    this.searchQuery.set('');
  }

  setPeriodFilter(period: string): void {
    this.periodFilter.set(period);
  }

  setVatFilter(vat: string): void {
    this.vatFilter.set(vat);
  }

  openPreview(invoice: Invoice): void {
    this.selectedInvoice.set(invoice);
  }

  closePreview(): void {
    this.selectedInvoice.set(null);
  }

  readonly toastMessage = signal<string | null>(null);

  showToast(text: string): void {
    this.toastMessage.set(text);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  downloadInvoicePdf(invoice: Invoice): void {
    this.invoicingService.downloadInvoicePdf(invoice);
    this.showToast(this.i18n.t('admin.toast_invoice_downloaded'));
  }

  printInvoice(invoice: Invoice): void {
    this.invoicingService.printInvoice(invoice);
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) return '0,00 €';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  /**
   * Genera y descarga el libro fiscal oficial en formato CSV.
   */
  exportFiscalBookCsv(): void {
    const invoices = this.filteredInvoices();
    const headers = [
      'Nº Factura',
      'Referencia Pedido',
      'Fecha Emisión',
      'Cliente',
      'Base Imponible (€)',
      'Cuota IVA 4% (€)',
      'Cuota IVA 10% (€)',
      'Cuota IVA 21% (€)',
      'Cuota IVA Total (€)',
      'Total Factura (€)',
      'Modalidad',
      'Método de Pago',
    ];

    const rows = invoices.map((inv) => {
      const getVat = (rate: number) =>
        inv.taxBreakdown.find((t) => t.vatRate === rate)?.vatAmount ?? 0;

      return [
        `"${inv.invoiceNumber}"`,
        `"${inv.orderReference}"`,
        `"${new Date(inv.issuedAt).toISOString()}"`,
        `"${(inv.customer.name || '').replace(/"/g, '""')}"`,
        inv.subtotalBase.toFixed(2),
        getVat(4).toFixed(2),
        getVat(10).toFixed(2),
        getVat(21).toFixed(2),
        inv.totalVat.toFixed(2),
        inv.total.toFixed(2),
        `"${inv.fulfillment === 'delivery' ? 'Domicilio' : 'Recogida tienda'}"`,
        `"${(inv.paymentMethod || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', `libro-fiscal-cal-sarda-${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url);
        }
      }
    }
  }
}
