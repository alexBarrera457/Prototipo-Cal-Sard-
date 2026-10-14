import { Inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import type { CartItem, FulfillmentMethod, Order, OrderCustomer } from '@cal-sarda/domain';
import { SUPABASE_CLIENT, type SupabaseClient } from './supabase';

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
 * Adaptador de persistencia relacional en Supabase contra las tablas `orders` y `order_items`.
 * Incorpora fallback transparente a memoria en caso de desconexión o fallo de red.
 */
@Injectable()
export class SupabaseOrdersRepository implements OrdersRepository {
  private readonly fallbackRepo: OrdersRepository;

  constructor(
    @Optional()
    @Inject(SUPABASE_CLIENT)
    private readonly supabase?: SupabaseClient | null,
    @Optional()
    @Inject('FALLBACK_ORDERS_REPO')
    fallbackRepo?: OrdersRepository,
  ) {
    this.fallbackRepo = fallbackRepo ?? new InMemoryOrdersRepository();
  }

  async saveOrder(order: Order): Promise<Order> {
    if (!this.supabase) {
      return this.fallbackRepo.saveOrder(order);
    }

    try {
      const orderPayload = {
        customer_name: order.customer.name,
        customer_email: order.customer.email,
        customer_phone: order.customer.phone ?? null,
        shipping_address: {
          reference: order.reference,
          fulfillment: order.fulfillment,
          shippingZoneLabel: order.shippingZoneLabel,
          shippingCost: order.shippingCost,
          subtotal: order.subtotal,
          address: order.customer.address ?? null,
          postalCode: order.customer.postalCode ?? null,
          city: order.customer.city ?? null,
          estimatedDate: order.estimatedDate,
          paymentMethod: order.paymentMethod,
        },
        status: order.status ?? 'confirmed',
        total: order.total,
        notes: order.reference ? `Ref: ${order.reference}` : null,
      };

      const { data: orderData, error: orderError } = await this.supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (orderError || !orderData) {
        return this.fallbackRepo.saveOrder(order);
      }

      const orderId = orderData.id;

      if (order.items && order.items.length > 0) {
        const itemsPayload = order.items.map((item) => ({
          order_id: orderId,
          product_name: item.name,
          unit_price: item.price,
          quantity: item.quantity,
        }));

        await this.supabase.from('order_items').insert(itemsPayload);
      }

      const savedOrder: Order = {
        ...order,
        id: orderId,
        createdAt: orderData.created_at ?? order.createdAt,
      };

      await this.fallbackRepo.saveOrder(savedOrder);
      return savedOrder;
    } catch {
      return this.fallbackRepo.saveOrder(order);
    }
  }

  async getOrder(referenceOrId: string): Promise<Order | null> {
    if (!this.supabase) {
      return this.fallbackRepo.getOrder(referenceOrId);
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        referenceOrId,
      );

      let query = this.supabase.from('orders').select(`
          id,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          status,
          total,
          notes,
          created_at,
          order_items (
            product_name,
            unit_price,
            quantity
          )
        `);

      if (isUuid) {
        query = query.eq('id', referenceOrId);
      } else {
        query = query.filter('shipping_address->>reference', 'eq', referenceOrId);
      }

      const { data, error } = await query.single();
      if (error || !data) {
        return this.fallbackRepo.getOrder(referenceOrId);
      }

      const shipping = (data.shipping_address as Record<string, unknown>) || {};
      const items: CartItem[] = Array.isArray(data.order_items)
        ? data.order_items.map((it: any) => ({
            name: it.product_name,
            price: Number(it.unit_price),
            quantity: Number(it.quantity),
          }))
        : [];

      return {
        id: data.id,
        reference: (shipping['reference'] as string) ?? referenceOrId,
        customer: {
          name: data.customer_name,
          email: data.customer_email,
          phone: data.customer_phone ?? undefined,
          address: (shipping['address'] as string) ?? undefined,
          postalCode: (shipping['postalCode'] as string) ?? undefined,
          city: (shipping['city'] as string) ?? undefined,
        },
        items,
        subtotal: typeof shipping['subtotal'] === 'number' ? shipping['subtotal'] : undefined,
        shippingCost:
          typeof shipping['shippingCost'] === 'number' ? shipping['shippingCost'] : undefined,
        total: Number(data.total),
        fulfillment: (shipping['fulfillment'] as FulfillmentMethod) ?? 'pickup',
        shippingZoneLabel: (shipping['shippingZoneLabel'] as string) ?? undefined,
        estimatedDate: (shipping['estimatedDate'] as string) ?? undefined,
        paymentMethod: (shipping['paymentMethod'] as string) ?? undefined,
        status: data.status,
        createdAt: data.created_at,
      };
    } catch {
      return this.fallbackRepo.getOrder(referenceOrId);
    }
  }

  async getAllOrders(): Promise<Order[]> {
    if (!this.supabase) {
      return this.fallbackRepo.getAllOrders ? this.fallbackRepo.getAllOrders() : [];
    }

    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select(
          `
          id,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          status,
          total,
          notes,
          created_at,
          order_items (
            product_name,
            unit_price,
            quantity
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (error || !data) {
        return this.fallbackRepo.getAllOrders ? this.fallbackRepo.getAllOrders() : [];
      }

      return data.map((d: any) => {
        const shipping = d.shipping_address || {};
        const items = Array.isArray(d.order_items)
          ? d.order_items.map((it: any) => ({
              name: it.product_name,
              price: Number(it.unit_price),
              quantity: Number(it.quantity),
            }))
          : [];

        return {
          id: d.id,
          reference: shipping.reference ?? `CS-${d.id.substring(0, 4)}`,
          customer: {
            name: d.customer_name,
            email: d.customer_email,
            phone: d.customer_phone,
            address: shipping.address,
            postalCode: shipping.postalCode,
            city: shipping.city,
          },
          items,
          subtotal: shipping.subtotal,
          shippingCost: shipping.shippingCost,
          total: Number(d.total),
          fulfillment: shipping.fulfillment ?? 'pickup',
          shippingZoneLabel: shipping.shippingZoneLabel,
          estimatedDate: shipping.estimatedDate,
          paymentMethod: shipping.paymentMethod,
          status: d.status,
          createdAt: d.created_at,
        };
      });
    } catch {
      return this.fallbackRepo.getAllOrders ? this.fallbackRepo.getAllOrders() : [];
    }
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
    @Optional()
    @Inject(SUPABASE_CLIENT)
    supabaseClient?: SupabaseClient | null,
  ) {
    if (repository) {
      this.repository = repository;
    } else if (supabaseClient) {
      this.repository = new SupabaseOrdersRepository(supabaseClient);
    } else {
      this.repository = new InMemoryOrdersRepository();
    }
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

  async getOrder(referenceOrId: string): Promise<Order | null> {
    return this.repository.getOrder(referenceOrId);
  }

  clearLatestOrder(): void {
    this.latestOrder.set(null);
  }
}
