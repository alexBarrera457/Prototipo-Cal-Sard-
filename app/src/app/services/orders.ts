import { Inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import type {
  CartItem,
  FulfillmentMethod,
  Order,
  OrderCustomer,
  OrderStatus,
} from '@cal-sarda/domain';
import { NotificationService } from './notifications';
import { SUPABASE_CLIENT, type SupabaseClient } from './supabase';

export type { CartItem, FulfillmentMethod, Order, OrderCustomer, OrderStatus };

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
  updateOrderStatus?(referenceOrId: string, status: OrderStatus): Promise<Order | null>;
}

export const ORDERS_REPOSITORY = new InjectionToken<OrdersRepository>('ORDERS_REPOSITORY');

export const DEFAULT_INITIAL_ORDERS: Order[] = [
  {
    id: 'b6f2f310-7214-4c42-b062-817366304101',
    reference: 'CS-2026-1042',
    customer: {
      name: 'Montserrat Puig',
      email: 'montserrat.puig@gmail.com',
      phone: '612 345 678',
    },
    items: [
      { name: 'Pa de Pagès Tradicional (1kg)', price: 3.5, quantity: 2 },
      { name: 'Cafè de Finca Torrat Artesanal 250g', price: 8.5, quantity: 1 },
      { name: 'Oli d’Oliva Verge Extra Siurana 500ml', price: 13.5, quantity: 2 },
    ],
    subtotal: 42.5,
    shippingCost: 0,
    total: 42.5,
    fulfillment: 'pickup',
    status: 'listo_recogida',
    estimatedDate: 'Disponible para recogida hoy en Carrer de Marina, 237, Barcelona',
    paymentMethod: 'Pago en tienda física en el momento de la recogida.',
    notes: 'Por favor, el pan cortado en rebanadas gruesas.',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'b6f2f310-7214-4c42-b062-817366304102',
    reference: 'CS-2026-1041',
    customer: {
      name: 'Jaume Sardà',
      email: 'cliente@calsarda.com',
      phone: '633 456 789',
      address: 'Carrer de Mallorca, 184, 3º 2ª',
      postalCode: '08036',
      city: 'Barcelona',
    },
    items: [
      { name: 'Cistella Selecció Formatges Artesans', price: 42.0, quantity: 1 },
      { name: 'Llonganissa de Vic Tradicional', price: 9.8, quantity: 2 },
      { name: 'Vi Negre Selecció Priorat 75cl', price: 17.3, quantity: 1 },
    ],
    subtotal: 78.9,
    shippingCost: 4.9,
    total: 83.8,
    fulfillment: 'delivery',
    shippingZoneLabel: 'Barcelona ciutat (08001 - 08042)',
    status: 'en_preparacion',
    estimatedDate: 'Entrega estimada en 24-48 horas laborables',
    paymentMethod: 'Pago por Bizum al confirmar el encargo telefónicamente.',
    notes: 'Timbre número 2. Llamar al móvil si no contesta.',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'b6f2f310-7214-4c42-b062-817366304106',
    reference: 'CS-2026-1035',
    customer: {
      name: 'Jaume Sardà',
      email: 'cliente@calsarda.com',
      phone: '633 999 888',
    },
    items: [
      { name: 'Cafè de Finca Torrat Artesanal 250g', price: 8.5, quantity: 2 },
      { name: 'Carquinyolis Artesans d’Ametlla 250g', price: 7.5, quantity: 1 },
    ],
    subtotal: 24.5,
    shippingCost: 0,
    total: 24.5,
    fulfillment: 'pickup',
    status: 'entregado',
    estimatedDate: 'Entregado en tienda Carrer de Marina, 237',
    paymentMethod: 'Pago en tienda',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: 'b6f2f310-7214-4c42-b062-817366304103',
    reference: 'CS-2026-1040',
    customer: {
      name: 'Laia Vidal',
      email: 'laia.vidal@empresa.cat',
      phone: '677 889 900',
    },
    items: [
      { name: 'Mel Ecològica de Romaní 500g', price: 7.2, quantity: 2 },
      { name: 'Carquinyolis Artesans d’Ametlla 250g', price: 8.4, quantity: 2 },
    ],
    subtotal: 31.2,
    shippingCost: 0,
    total: 31.2,
    fulfillment: 'pickup',
    status: 'recibido',
    estimatedDate: 'Disponible para recogida a partir de mañana en Carrer de Marina, 237',
    paymentMethod: 'Pago en tienda al recoger.',
    notes: 'Recogerá mi hermana por la tarde.',
    createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
  {
    id: 'b6f2f310-7214-4c42-b062-817366304104',
    reference: 'CS-2026-1039',
    customer: {
      name: 'Marc Rovira',
      email: 'marc.rovira@bcn.cat',
      phone: '655 123 456',
      address: 'Passeig de Sant Joan, 56, 1r 1a',
      postalCode: '08010',
      city: 'Barcelona',
    },
    items: [
      { name: 'Llot de Nadal Gastronòmic Especial Cal Sardà', price: 95.0, quantity: 1 },
      { name: 'Torró d’Agramunt Artesanal 300g', price: 10.0, quantity: 2 },
    ],
    subtotal: 115.0,
    shippingCost: 0,
    total: 115.0,
    fulfillment: 'delivery',
    shippingZoneLabel: 'Barcelona ciutat (08001 - 08042)',
    status: 'entregado',
    estimatedDate: 'Entregado hoy a las 11:30h',
    paymentMethod: 'Tarjeta de crédito / Bizum.',
    notes: 'Entregar en conserjería.',
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
  },
  {
    id: 'b6f2f310-7214-4c42-b062-817366304105',
    reference: 'CS-2026-1038',
    customer: {
      name: 'Carme Soler',
      email: 'carme.soler@gencat.cat',
      phone: '644 998 877',
      address: 'Carrer d’Aragó, 312, 4º',
      postalCode: '08009',
      city: 'Barcelona',
    },
    items: [
      { name: 'Formatge d’Obrador Madurat de Cabra 400g', price: 16.5, quantity: 1 },
      { name: 'Pernil Ibèric d’Engreix Tallat a Ganivet 100g', price: 14.0, quantity: 2 },
    ],
    subtotal: 44.5,
    shippingCost: 4.9,
    total: 49.4,
    fulfillment: 'delivery',
    shippingZoneLabel: 'Barcelona ciutat',
    status: 'enviado',
    estimatedDate: 'En reparto urgente hoy antes de las 19:00h',
    paymentMethod: 'Bizum',
    notes: 'Avisar antes de subir.',
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
];

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
    this.orders.unshift(saved);
    return saved;
  }

  async getOrder(referenceOrId: string): Promise<Order | null> {
    return this.orders.find((o) => o.reference === referenceOrId || o.id === referenceOrId) ?? null;
  }

  async getAllOrders(): Promise<Order[]> {
    return [...this.orders];
  }

  async updateOrderStatus(referenceOrId: string, status: OrderStatus): Promise<Order | null> {
    const orderIndex = this.orders.findIndex(
      (o) => o.reference === referenceOrId || o.id === referenceOrId,
    );
    if (orderIndex === -1) {
      return null;
    }
    this.orders[orderIndex] = {
      ...this.orders[orderIndex],
      status,
    };
    return { ...this.orders[orderIndex] };
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
      const clientGeneratedId =
        order.id ||
        (typeof globalThis !== 'undefined' &&
        typeof (globalThis as any).crypto?.randomUUID === 'function'
          ? (globalThis as any).crypto.randomUUID()
          : undefined);

      const orderPayload = {
        ...(clientGeneratedId ? { id: clientGeneratedId } : {}),
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

      if (orderError) {
        return this.fallbackRepo.saveOrder(order);
      }

      const orderId = orderData?.id || clientGeneratedId;
      if (!orderId) {
        return this.fallbackRepo.saveOrder(order);
      }

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
        createdAt: orderData?.created_at ?? order.createdAt ?? new Date().toISOString(),
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

  async updateOrderStatus(referenceOrId: string, status: OrderStatus): Promise<Order | null> {
    if (!this.supabase) {
      return this.fallbackRepo.updateOrderStatus
        ? this.fallbackRepo.updateOrderStatus(referenceOrId, status)
        : null;
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        referenceOrId,
      );

      let query = this.supabase.from('orders').update({ status });
      if (isUuid) {
        query = query.eq('id', referenceOrId);
      } else {
        query = query.filter('shipping_address->>reference', 'eq', referenceOrId);
      }

      const { data, error } = await query.select().single();
      if (error || !data) {
        return this.fallbackRepo.updateOrderStatus
          ? this.fallbackRepo.updateOrderStatus(referenceOrId, status)
          : null;
      }

      await this.fallbackRepo.updateOrderStatus?.(referenceOrId, status);
      return this.getOrder(referenceOrId);
    } catch {
      return this.fallbackRepo.updateOrderStatus
        ? this.fallbackRepo.updateOrderStatus(referenceOrId, status)
        : null;
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
  private readonly notificationService: NotificationService;
  private orderCounter = 1042;
  readonly latestOrder = signal<Order | null>(null);
  readonly allOrders = signal<Order[]>([]);
  readonly loading = signal<boolean>(false);

  constructor(
    @Optional()
    @Inject(ORDERS_REPOSITORY)
    repository?: OrdersRepository,
    @Optional()
    @Inject(SUPABASE_CLIENT)
    supabaseClient?: SupabaseClient | null,
    @Optional()
    notificationService?: NotificationService,
  ) {
    if (repository) {
      this.repository = repository;
    } else if (supabaseClient) {
      this.repository = new SupabaseOrdersRepository(supabaseClient);
    } else {
      this.repository = new InMemoryOrdersRepository(DEFAULT_INITIAL_ORDERS);
    }
    this.notificationService = notificationService ?? new NotificationService();

    // Carga inicial reactiva de pedidos
    this.loadAllOrders();
  }

  get notifications(): NotificationService {
    return this.notificationService;
  }

  /**
   * Carga la lista completa de pedidos en el signal reactivo allOrders.
   */
  async loadAllOrders(): Promise<Order[]> {
    this.loading.set(true);
    try {
      const orders = (await this.repository.getAllOrders?.()) ?? [];
      this.allOrders.set(orders);
      return orders;
    } finally {
      this.loading.set(false);
    }
  }

  async getAllOrders(): Promise<Order[]> {
    return this.loadAllOrders();
  }

  /**
   * Actualiza el estado operativo de un encargo y refresca el signal allOrders.
   */
  async updateOrderStatus(referenceOrId: string, status: OrderStatus): Promise<Order | null> {
    const updated = (await this.repository.updateOrderStatus?.(referenceOrId, status)) ?? null;
    if (updated) {
      this.allOrders.update((orders) =>
        orders.map((o) =>
          o.reference === updated.reference || o.id === updated.id ? { ...updated } : o,
        ),
      );
      if (
        this.latestOrder()?.reference === updated.reference ||
        this.latestOrder()?.id === updated.id
      ) {
        this.latestOrder.set({ ...updated });
      }
    }
    return updated;
  }

  /**
   * Obtiene los encargos de un cliente filtrando por email y ordenados por fecha descendente.
   */
  async getOrdersByCustomerEmail(email: string): Promise<Order[]> {
    if (!email) return [];
    const all = await this.getAllOrders();
    const cleanEmail = email.trim().toLowerCase();
    return all
      .filter((o) => o.customer?.email?.trim().toLowerCase() === cleanEmail)
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
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
   * Formaliza el encargo, genera su referencia única, lo persiste y despacha notificaciones.
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
      notes: input.notes,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    const saved = await this.repository.saveOrder(order);
    this.latestOrder.set(saved);
    this.allOrders.update((orders) => [
      saved,
      ...orders.filter((o) => o.reference !== saved.reference && o.id !== saved.id),
    ]);

    try {
      await this.notificationService.sendOrderConfirmationNotifications(saved);
    } catch (err) {
      console.warn('Fallo al despachar notificación de pedido:', err);
    }

    return saved;
  }

  async getOrder(referenceOrId: string): Promise<Order | null> {
    return this.repository.getOrder(referenceOrId);
  }

  clearLatestOrder(): void {
    this.latestOrder.set(null);
  }
}
