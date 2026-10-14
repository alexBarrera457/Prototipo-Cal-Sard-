import { Inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import type { CartItem, FulfillmentMethod, Order, OrderCustomer } from '@cal-sarda/domain';

export type { CartItem, FulfillmentMethod, Order, OrderCustomer };

export interface CreateOrderInput {
  customer: OrderCustomer;
  items: CartItem[];
  fulfillment: FulfillmentMethod;
  shippingZoneLabel?: string;
  shippingCost?: number;
  subtotal?: number;
  total?: number;
  notes?: string;
}

/**
 * Seam (Costura): Interfaz que desacopla la persistencia de pedidos de la lógica de negocio.
 * Permite alternar entre almacenamiento en memoria (tests y modo sin conexión) y Supabase (Issue #19).
 */
export interface OrdersRepository {
  saveOrder(order: Order): Promise<Order>;
  getOrder(referenceOrId: string): Promise<Order | null>;
  getAllOrders?(): Promise<Order[]>;
}

export const ORDERS_REPOSITORY = new InjectionToken<OrdersRepository>('ORDERS_REPOSITORY');

/**
 * Adaptador en memoria para pruebas unitarias, SSR y modo sin conexión.
 */
@Injectable()
export class InMemoryOrdersRepository implements OrdersRepository {
  private orders: Order[] = [];

  constructor(@Optional() @Inject('INITIAL_ORDERS') initialOrders?: Order[]) {
    this.orders = initialOrders ? [...initialOrders] : [];
  }

  async saveOrder(order: Order): Promise<Order> {
    const saved: Order = { ...order };
    this.orders.push(saved);
    return saved;
  }

  async getOrder(referenceOrId: string): Promise<Order | null> {
    return this.orders.find((o) => o.reference === referenceOrId || o.id === referenceOrId) ?? null;
  }

  async getAllOrders(): Promise<Order[]> {
    return [...this.orders];
  }
}

/**
 * Módulo profundo para gestión y formalización de encargos en Cal Sardà.
 */
@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly repository: OrdersRepository;
  private orderCounter = 1042;
  readonly latestOrder = signal<Order | null>(null);

  constructor(
    @Optional()
    @Inject(ORDERS_REPOSITORY)
    repository?: OrdersRepository,
  ) {
    this.repository = repository ?? new InMemoryOrdersRepository();
  }

  /**
   * Genera un código identificador amigable y reconocible (ej: CS-2026-1042).
   */
  generateOrderReference(): string {
    const year = new Date().getFullYear();
    const count = this.orderCounter++;
    return `CS-${year}-${count}`;
  }

  /**
   * Devuelve la estimación amigable de plazo de recogida o entrega.
   */
  getEstimatedDateLabel(fulfillment: FulfillmentMethod): string {
    if (fulfillment === 'pickup') {
      return 'Disponible para recogida en tienda a partir de mañana (laborable de 9:00 a 14:00 y de 17:00 a 20:30) en Carrer de Marina, 237, Barcelona';
    }
    return 'Entrega estimada en 24-48 horas laborables (transporte refrigerado urgente)';
  }

  /**
   * Devuelve las instrucciones y métodos de pago permitidos según la modalidad.
   */
  getPaymentInstructions(fulfillment: FulfillmentMethod): string {
    if (fulfillment === 'pickup') {
      return 'Pago en tienda física en el momento de la recogida (tarjeta bancaria o efectivo) o mediante Bizum.';
    }
    return 'Pago por Bizum al confirmar el encargo telefónicamente o contra reembolso al recibirlo.';
  }

  /**
   * Formaliza el encargo, genera su referencia única y lo persiste mediante el repositorio.
   */
  async submitOrder(input: CreateOrderInput): Promise<Order> {
    const subtotal =
      input.subtotal ?? input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = input.shippingCost ?? 0;
    const total = input.total ?? subtotal + shippingCost;
    const reference = this.generateOrderReference();
    const estimatedDate = this.getEstimatedDateLabel(input.fulfillment);
    const paymentMethod = this.getPaymentInstructions(input.fulfillment);

    const order: Order = {
      reference,
      customer: { ...input.customer },
      items: input.items.map((item) => ({ ...item })),
      subtotal,
      shippingCost,
      total,
      fulfillment: input.fulfillment,
      shippingZoneLabel: input.shippingZoneLabel,
      estimatedDate,
      paymentMethod,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    const saved = await this.repository.saveOrder(order);
    this.latestOrder.set(saved);
    return saved;
  }

  clearLatestOrder(): void {
    this.latestOrder.set(null);
  }
}
