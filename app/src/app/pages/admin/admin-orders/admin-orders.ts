import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersService, type Order, type OrderStatus } from '../../../services/orders';
import { I18nService } from '../../../services/i18n';
import { InvoicingService } from '../../../services/invoicing';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.css',
})
export class AdminOrders {
  readonly ordersService = inject(OrdersService);
  readonly i18n = inject(I18nService);
  readonly invoicingService = inject(InvoicingService);

  readonly statusFilter = signal<string>('todos');
  readonly fulfillmentFilter = signal<string>('todos');
  readonly searchQuery = signal<string>('');
  searchQueryModel = '';
  readonly selectedOrder = signal<Order | null>(null);
  readonly isRefreshing = signal<boolean>(false);
  readonly updatingOrderRef = signal<string | null>(null);

  // Pedidos filtrados reactivamente
  readonly filteredOrders = computed(() => {
    const orders = this.ordersService.allOrders();
    const status = this.statusFilter();
    const fulfillment = this.fulfillmentFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return orders.filter((order) => {
      // 1. Filtro por estado
      if (status !== 'todos') {
        const normalized = this.normalizeStatus(order.status);
        if (normalized !== status) {
          return false;
        }
      }

      // 2. Filtro por modalidad de entrega
      if (fulfillment !== 'todos' && order.fulfillment !== fulfillment) {
        return false;
      }

      // 3. Búsqueda por texto (referencia, nombre, email, teléfono)
      if (query) {
        const refMatch = order.reference?.toLowerCase().includes(query) ?? false;
        const nameMatch = order.customer?.name?.toLowerCase().includes(query) ?? false;
        const emailMatch = order.customer?.email?.toLowerCase().includes(query) ?? false;
        const phoneMatch = order.customer?.phone?.toLowerCase().includes(query) ?? false;
        if (!refMatch && !nameMatch && !emailMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });
  });

  // Conteo reactivo de pedidos según su estado operacional
  readonly statusCounts = computed(() => {
    const orders = this.ordersService.allOrders();
    const counts = {
      todos: orders.length,
      recibido: 0,
      en_preparacion: 0,
      listo_recogida: 0,
      enviado: 0,
      entregado: 0,
      cancelado: 0,
    };

    for (const order of orders) {
      const norm = this.normalizeStatus(order.status);
      if (norm in counts) {
        counts[norm as keyof typeof counts]++;
      }
    }
    return counts;
  });

  normalizeStatus(status?: string): OrderStatus {
    if (!status) return 'recibido';
    switch (status) {
      case 'confirmed':
      case 'pending':
      case 'recibido':
        return 'recibido';
      case 'in_prep':
      case 'en_preparacion':
        return 'en_preparacion';
      case 'ready':
      case 'listo_recogida':
        return 'listo_recogida';
      case 'shipped':
      case 'enviado':
        return 'enviado';
      case 'delivered':
      case 'entregado':
        return 'entregado';
      case 'cancelled':
      case 'cancelado':
        return 'cancelado';
      default:
        return 'recibido';
    }
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  setFulfillmentFilter(fulfillment: string): void {
    this.fulfillmentFilter.set(fulfillment);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQueryModel = input.value;
    this.searchQuery.set(input.value);
  }

  onSearchInput(value: string): void {
    this.searchQueryModel = value;
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQueryModel = '';
    this.searchQuery.set('');
  }

  openOrderDetail(order: Order): void {
    this.selectedOrder.set(order);
  }

  closeOrderDetail(): void {
    this.selectedOrder.set(null);
  }

  async advanceStatus(order: Order, nextStatus: OrderStatus): Promise<void> {
    if (!order.reference) return;
    this.updatingOrderRef.set(order.reference);
    try {
      const updated = await this.ordersService.updateOrderStatus(order.reference, nextStatus);
      if (updated && this.selectedOrder()?.reference === order.reference) {
        this.selectedOrder.set(updated);
      }
    } finally {
      this.updatingOrderRef.set(null);
    }
  }

  async cancelOrder(order: Order): Promise<void> {
    await this.advanceStatus(order, 'cancelado');
  }

  async refreshOrders(): Promise<void> {
    this.isRefreshing.set(true);
    try {
      await this.ordersService.loadAllOrders();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  getStatusBadgeClass(status?: string): string {
    const norm = this.normalizeStatus(status);
    switch (norm) {
      case 'recibido':
        return 'badge-received';
      case 'en_preparacion':
        return 'badge-in-prep';
      case 'listo_recogida':
        return 'badge-ready';
      case 'enviado':
        return 'badge-shipped';
      case 'entregado':
        return 'badge-delivered';
      case 'cancelado':
        return 'badge-cancelled';
      default:
        return 'badge-received';
    }
  }

  getStatusLabel(status?: string): string {
    const norm = this.normalizeStatus(status);
    switch (norm) {
      case 'recibido':
        return this.i18n.t('admin.status_recibido');
      case 'en_preparacion':
        return this.i18n.t('admin.status_en_preparacion');
      case 'listo_recogida':
        return this.i18n.t('admin.status_listo_recogida');
      case 'enviado':
        return this.i18n.t('admin.status_enviado');
      case 'entregado':
        return this.i18n.t('admin.status_entregado');
      case 'cancelado':
        return this.i18n.t('admin.status_cancelado');
      default:
        return this.i18n.t('admin.status_recibido');
    }
  }

  getFulfillmentLabel(fulfillment?: string): string {
    if (fulfillment === 'delivery') {
      return this.i18n.currentLang() === 'ca' ? 'Entrega a domicili' : 'Entrega a domicilio';
    }
    return this.i18n.currentLang() === 'ca' ? 'Recollida a botiga' : 'Recogida en tienda';
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) return '0,00 €';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  printInvoice(order: Order): void {
    const invoice = this.invoicingService.generateInvoice(order);
    this.invoicingService.printInvoice(invoice);
  }
}
