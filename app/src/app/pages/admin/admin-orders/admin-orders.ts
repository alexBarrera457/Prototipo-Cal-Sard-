import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OrdersService,
  type Order,
  type OrderStatus,
  type CartItem,
} from '../../../services/orders';
import { I18nService } from '../../../services/i18n';
import { InvoicingService } from '../../../services/invoicing';
import {
  AbandonedCartService,
  type AbandonedCartAdminRecord,
} from '../../../services/abandoned-cart';

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
  readonly abandonedCartService = inject(AbandonedCartService);

  readonly statusFilter = signal<string>('todos');
  readonly fulfillmentFilter = signal<string>('todos');
  readonly searchQuery = signal<string>('');
  searchQueryModel = '';
  readonly selectedOrder = signal<Order | null>(null);
  readonly isRefreshing = signal<boolean>(false);
  readonly updatingOrderRef = signal<string | null>(null);
  readonly abandonedCarts = signal<AbandonedCartAdminRecord[]>(
    this.abandonedCartService.getAdminAbandonedCarts(),
  );
  readonly lineWeights = signal<Record<string, number>>({});
  readonly isWeighing = signal<boolean>(false);

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
      proforma: 0,
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
      case 'proforma':
      case 'presupuesto':
        return 'proforma';
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
      case 'proforma':
        return 'badge-proforma';
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
      case 'proforma':
        return 'Proforma B2B (Pendiente pago)';
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

  readonly toastMessage = signal<string | null>(null);

  showToast(text: string): void {
    this.toastMessage.set(text);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  getWhatsAppUrl(order: Order): string {
    const rawPhone = order.customer?.phone || '';
    const digitsOnly = rawPhone.replace(/\D/g, '');
    let fullPhone = digitsOnly;
    if (fullPhone.length === 9) {
      fullPhone = `34${fullPhone}`;
    }
    const isCa = this.i18n.currentLang() === 'ca';
    const status = this.normalizeStatus(order.status);
    let message = '';

    if (status === 'listo_recogida') {
      message = isCa
        ? `Hola ${order.customer?.name || 'client'}! La teva comanda ${order.reference} ja està preparada al Colmado Cal Sardà (Carrer de Marina, 237). Pots passar a recollir-la en el nostre horari habitual. Moltes gràcies!`
        : `¡Hola ${order.customer?.name || 'cliente'}! Tu pedido ${order.reference} ya está preparado en el Colmado Cal Sardà (Carrer de Marina, 237). Puedes pasar a recogerlo en nuestro horario habitual. ¡Muchas gracias!`;
    } else if (status === 'enviado') {
      message = isCa
        ? `Hola ${order.customer?.name || 'client'}! La teva comanda ${order.reference} de Cal Sardà ja ha sortit en repartiment cap a la teva adreça. Moltes gràcies!`
        : `¡Hola ${order.customer?.name || 'cliente'}! Tu pedido ${order.reference} de Cal Sardà ya ha salido en reparto hacia tu dirección. ¡Muchas gracias!`;
    } else {
      message = isCa
        ? `Hola ${order.customer?.name || 'client'}! Et contactem des del Colmado Cal Sardà respecte a la teva comanda ${order.reference}.`
        : `¡Hola ${order.customer?.name || 'cliente'}! Te contactamos desde el Colmado Cal Sardà respecto a tu pedido ${order.reference}.`;
    }

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  }

  openWhatsApp(order: Order): void {
    if (!order.customer?.phone || !order.customer.phone.replace(/\D/g, '')) {
      this.showToast(this.i18n.t('admin.whatsapp_no_phone'));
      return;
    }
    if (typeof window !== 'undefined') {
      window.open(this.getWhatsAppUrl(order), '_blank', 'noopener,noreferrer');
    }
  }

  printPreparationSlip(order: Order): void {
    this.invoicingService.printPreparationSlip(order, this.i18n.currentLang());
  }

  async sendAbandonedCartReminder(record: AbandonedCartAdminRecord): Promise<void> {
    const success = await this.abandonedCartService.sendFriendlyReminder({
      name: record.customerName,
      email: record.customerEmail,
    });
    if (success) {
      record.reminderSent = true;
      record.reminderSentAt = new Date().toISOString();
      this.showToast(this.i18n.t('abandoned_cart.reminder_sent'));
    }
  }

  isCutToOrder(item: CartItem): boolean {
    return !!item.isCutToOrder || this.ordersService.isCutToOrderProduct(item.name);
  }

  getEstimatedWeight(item: CartItem): number {
    return item.estimatedWeightGrams || this.ordersService.inferEstimatedWeight(item.name);
  }

  getLineWeightKey(order: Order, index: number): string {
    return `${order.reference || order.id}-${index}`;
  }

  getCurrentWeight(order: Order, index: number, item: CartItem): number {
    const key = this.getLineWeightKey(order, index);
    const custom = this.lineWeights()[key];
    if (custom !== undefined) {
      return custom;
    }
    return item.realWeightGrams ?? this.getEstimatedWeight(item);
  }

  onWeightChange(order: Order, index: number, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val > 0) {
      const key = this.getLineWeightKey(order, index);
      this.lineWeights.update((weights) => ({
        ...weights,
        [key]: val,
      }));
    }
  }

  async saveLineWeight(order: Order, index: number): Promise<void> {
    const refOrId = order.reference || order.id;
    if (!refOrId) return;

    const item = order.items?.[index];
    if (!item) return;

    const weight = this.getCurrentWeight(order, index, item);
    this.isWeighing.set(true);
    try {
      const updated = await this.ordersService.updateOrderWeighing(refOrId, index, weight);
      if (updated) {
        if (
          this.selectedOrder()?.reference === order.reference ||
          this.selectedOrder()?.id === order.id
        ) {
          this.selectedOrder.set(updated);
        }
        const isCa = this.i18n.currentLang() === 'ca';
        const msg = isCa
          ? `⚖️ Pes real ajustat a ${weight}g. Nou total: ${this.formatCurrency(updated.total)}`
          : `⚖️ Pesaje ajustado a ${weight}g. Nuevo total: ${this.formatCurrency(updated.total)}`;
        this.showToast(msg);
      }
    } finally {
      this.isWeighing.set(false);
    }
  }
}
