import { describe, expect, it, vi } from 'vitest';
import {
  InMemoryOrdersRepository,
  ORDERS_REPOSITORY,
  OrdersRepository,
  OrdersService,
  SupabaseOrdersRepository,
} from './orders';
import type { Order } from './orders';
import type { SupabaseClient } from './supabase';

function createMockSupabaseClient() {
  const ordersDb: any[] = [];
  const orderItemsDb: any[] = [];

  const client = {
    ordersDb,
    orderItemsDb,
    from: (table: string) => {
      if (table === 'orders') {
        return {
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const inserted = {
                  ...payload,
                  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                  created_at: new Date().toISOString(),
                };
                ordersDb.push(inserted);
                return { data: inserted, error: null };
              },
            }),
          }),
          select: () => {
            const queryObj: any = {
              eq: (col: string, val: any) => ({
                single: async () => {
                  const found = ordersDb.find((o) => o[col] === val);
                  if (!found) return { data: null, error: { message: 'Not found' } };
                  const items = orderItemsDb.filter((it) => it.order_id === found.id);
                  return { data: { ...found, order_items: items }, error: null };
                },
              }),
              filter: (_path: string, _op: string, val: any) => ({
                single: async () => {
                  const found = ordersDb.find((o) => o.shipping_address?.reference === val);
                  if (!found) return { data: null, error: { message: 'Not found' } };
                  const items = orderItemsDb.filter((it) => it.order_id === found.id);
                  return { data: { ...found, order_items: items }, error: null };
                },
              }),
              order: () =>
                Promise.resolve({
                  data: ordersDb.map((o) => ({
                    ...o,
                    order_items: orderItemsDb.filter((it) => it.order_id === o.id),
                  })),
                  error: null,
                }),
            };
            return queryObj;
          },
        };
      }
      if (table === 'order_items') {
        return {
          insert: async (items: any[]) => {
            orderItemsDb.push(...items);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return client as unknown as SupabaseClient & { ordersDb: any[]; orderItemsDb: any[] };
}

describe('OrdersService', () => {
  it('generates friendly reference codes formatted as CS-YYYY-XXXX', () => {
    const service = new OrdersService();
    const currentYear = new Date().getFullYear();

    const ref1 = service.generateOrderReference();
    const ref2 = service.generateOrderReference();

    expect(ref1).toBe(`CS-${currentYear}-1042`);
    expect(ref2).toBe(`CS-${currentYear}-1043`);
  });

  it('provides appropriate estimated dates and payment instructions for pickup and delivery', () => {
    const service = new OrdersService();

    const pickupDate = service.getEstimatedDateLabel('pickup');
    expect(pickupDate).toContain('recogida en tienda');
    expect(pickupDate).toContain('Marina, 237');

    const deliveryDate = service.getEstimatedDateLabel('delivery');
    expect(deliveryDate).toContain('24-48 horas laborables');
    expect(deliveryDate).toContain('refrigerado');

    const pickupPayment = service.getPaymentInstructions('pickup');
    expect(pickupPayment).toContain('tienda física');
    expect(pickupPayment).toContain('Bizum');

    const deliveryPayment = service.getPaymentInstructions('delivery');
    expect(deliveryPayment).toContain('Bizum');
    expect(deliveryPayment).toContain('reembolso');
  });

  it('submits an order, assigns reference and calculations, persists in repository, and updates signal', async () => {
    const service = new OrdersService();
    expect(service.latestOrder()).toBeNull();

    const order = await service.submitOrder({
      customer: {
        name: 'Carles Puig',
        email: 'carles@test.cat',
        phone: '612345678',
      },
      items: [
        {
          name: 'Secallona artesana',
          price: 6.8,
          quantity: 2,
          productNumber: '02',
        },
        {
          name: 'Formatge de Maó semicurat',
          price: 9.5,
          quantity: 1,
          productNumber: '05',
        },
      ],
      fulfillment: 'pickup',
      shippingCost: 0,
      shippingZoneLabel: 'Recogida en tienda (gratis)',
    });

    expect(order.reference).toMatch(/^CS-\d{4}-\d+$/);
    expect(order.subtotal).toBeCloseTo(6.8 * 2 + 9.5, 2);
    expect(order.shippingCost).toBe(0);
    expect(order.total).toBeCloseTo(23.1, 2);
    expect(order.status).toBe('confirmed');
    expect(order.items.length).toBe(2);
    expect(order.customer.name).toBe('Carles Puig');

    expect(service.latestOrder()).toEqual(order);

    const fetched = await service.getOrder(order.reference!);
    expect(fetched).toEqual(order);

    const sentEmails = service.notifications.getSentEmails();
    expect(sentEmails.length).toBe(2);
    expect(sentEmails.some((e) => e.to === 'carles@test.cat')).toBe(true);
    expect(sentEmails.some((e) => e.to === 'sarda@calsarda.com')).toBe(true);

    service.clearLatestOrder();
    expect(service.latestOrder()).toBeNull();
  });

  it('supports custom repository via OrdersRepository Seam interface', async () => {
    const customOrders: Order[] = [];
    const customRepo: OrdersRepository = {
      saveOrder: async (ord) => {
        customOrders.push(ord);
        return ord;
      },
      getOrder: async (ref) => customOrders.find((o) => o.reference === ref) ?? null,
      getAllOrders: async () => [...customOrders],
    };

    const service = new OrdersService(customRepo);
    await service.submitOrder({
      customer: {
        name: 'Marta Soler',
        email: 'marta@test.cat',
        phone: '699887766',
        address: 'Carrer Aragó 400',
        postalCode: '08013',
        city: 'Barcelona',
      },
      items: [
        {
          name: 'Café 100% Arábica',
          price: 5.5,
          quantity: 2,
        },
      ],
      fulfillment: 'delivery',
      shippingCost: 7.99,
      shippingZoneLabel: 'Cataluña (7,99 €)',
    });

    expect(customOrders.length).toBe(1);
    expect(customOrders[0].customer.name).toBe('Marta Soler');
    expect(customOrders[0].shippingCost).toBe(7.99);
    expect(customOrders[0].total).toBeCloseTo(11.0 + 7.99, 2);

    const fetched = await customRepo.getOrder(customOrders[0].reference!);
    expect(fetched).toEqual(customOrders[0]);
  });

  it('InMemoryOrdersRepository correctly stores and fetches orders', async () => {
    const repo = new InMemoryOrdersRepository();
    const sampleOrder: Order = {
      reference: 'CS-2026-9999',
      customer: { name: 'Joan', email: 'joan@test.cat' },
      items: [],
      total: 50,
      status: 'confirmed',
    };

    await repo.saveOrder(sampleOrder);
    const found = await repo.getOrder('CS-2026-9999');
    expect(found).toEqual(sampleOrder);

    const notFound = await repo.getOrder('CS-9999-0000');
    expect(notFound).toBeNull();

    const all = await repo.getAllOrders!();
    expect(all.length).toBe(1);
  });
});

describe('SupabaseOrdersRepository', () => {
  it('persists order into orders table and line items into order_items table in Supabase', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseOrdersRepository(mockClient);

    const newOrder: Order = {
      reference: 'CS-2026-1042',
      customer: {
        name: 'Montserrat Caballe',
        email: 'montserrat@test.cat',
        phone: '932325508',
        address: 'Carrer Gran de Gràcia, 12',
        postalCode: '08012',
        city: 'Barcelona',
      },
      items: [
        { name: 'Secallona artesana', price: 6.8, quantity: 2 },
        { name: 'Formatge Garrotxa', price: 14.5, quantity: 1 },
      ],
      subtotal: 28.1,
      shippingCost: 7.99,
      total: 36.09,
      fulfillment: 'delivery',
      shippingZoneLabel: 'Cataluña (7,99 €)',
      estimatedDate: 'Entrega en 24-48h',
      paymentMethod: 'Bizum',
      status: 'confirmed',
    };

    const saved = await repo.saveOrder(newOrder);

    expect(saved.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(saved.reference).toBe('CS-2026-1042');

    // Verify orders table received record
    expect(mockClient.ordersDb.length).toBe(1);
    expect(mockClient.ordersDb[0].customer_name).toBe('Montserrat Caballe');
    expect(mockClient.ordersDb[0].total).toBe(36.09);
    expect(mockClient.ordersDb[0].shipping_address.reference).toBe('CS-2026-1042');

    // Verify order_items table received 2 items with foreign key
    expect(mockClient.orderItemsDb.length).toBe(2);
    expect(mockClient.orderItemsDb[0].order_id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(mockClient.orderItemsDb[0].product_name).toBe('Secallona artesana');
    expect(mockClient.orderItemsDb[0].quantity).toBe(2);
    expect(mockClient.orderItemsDb[1].product_name).toBe('Formatge Garrotxa');

    // Verify fetching by reference
    const fetched = await repo.getOrder('CS-2026-1042');
    expect(fetched).toBeTruthy();
    expect(fetched?.customer.name).toBe('Montserrat Caballe');
    expect(fetched?.items.length).toBe(2);

    // Verify fetching by UUID id
    const fetchedById = await repo.getOrder('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(fetchedById).toBeTruthy();
    expect(fetchedById?.reference).toBe('CS-2026-1042');

    // Verify getAllOrders
    const all = await repo.getAllOrders!();
    expect(all.length).toBe(1);
    expect(all[0].customer.email).toBe('montserrat@test.cat');
  });

  it('falls back to memory repository gracefully when Supabase client is null', async () => {
    const fallbackRepo = new InMemoryOrdersRepository();
    const repo = new SupabaseOrdersRepository(null, fallbackRepo);

    const testOrder: Order = {
      reference: 'CS-2026-5555',
      customer: { name: 'Pere', email: 'pere@test.cat' },
      items: [{ name: 'Llonganissa', price: 8.0, quantity: 1 }],
      total: 8.0,
      status: 'confirmed',
    };

    const saved = await repo.saveOrder(testOrder);
    expect(saved.reference).toBe('CS-2026-5555');

    const fetched = await repo.getOrder('CS-2026-5555');
    expect(fetched).toEqual(testOrder);

    const all = await repo.getAllOrders!();
    expect(all.length).toBe(1);
  });

  it('falls back to local repository when Supabase query returns error or throws exception', async () => {
    const failingClient = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: 'Database connection failed' } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const fallbackRepo = new InMemoryOrdersRepository();
    const repo = new SupabaseOrdersRepository(failingClient, fallbackRepo);

    const testOrder: Order = {
      reference: 'CS-2026-7777',
      customer: { name: 'Laia', email: 'laia@test.cat' },
      items: [],
      total: 10,
      status: 'confirmed',
    };

    const saved = await repo.saveOrder(testOrder);
    expect(saved.reference).toBe('CS-2026-7777');

    const fetched = await fallbackRepo.getOrder('CS-2026-7777');
    expect(fetched).toBeTruthy();
  });

  it('OrdersService utilizes SupabaseOrdersRepository when SUPABASE_CLIENT is provided', async () => {
    const mockClient = createMockSupabaseClient();
    const service = new OrdersService(undefined, mockClient);

    const order = await service.submitOrder({
      customer: { name: 'Ramon', email: 'ramon@test.cat' },
      items: [{ name: 'Fuet artesà', price: 4.5, quantity: 1 }],
      fulfillment: 'pickup',
    });

    expect(order.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(mockClient.ordersDb.length).toBe(1);
    expect(mockClient.orderItemsDb.length).toBe(1);
  });

  it('uses client-generated UUID and inserts order items when select return is empty (RLS restricted)', async () => {
    let capturedOrderPayload: any = null;
    let capturedItemsPayload: any = null;

    const rlsMockClient = {
      from: (table: string) => ({
        insert: (payload: any) => {
          if (table === 'orders') {
            capturedOrderPayload = payload;
            return {
              select: () => ({
                single: async () => ({ data: null, error: null }),
              }),
            };
          }
          if (table === 'order_items') {
            capturedItemsPayload = payload;
            return Promise.resolve({ error: null });
          }
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseOrdersRepository(rlsMockClient);
    const orderToSave: Order = {
      reference: 'CS-2026-8888',
      customer: { name: 'Jordi', email: 'jordi@test.cat' },
      items: [{ name: 'Sobrassada de Mallorca', price: 7.2, quantity: 2 }],
      total: 14.4,
      status: 'confirmed',
    };

    const saved = await repo.saveOrder(orderToSave);

    expect(saved.id).toBeTruthy();
    expect(capturedOrderPayload.id).toBe(saved.id);
    expect(capturedItemsPayload.length).toBe(1);
    expect(capturedItemsPayload[0].order_id).toBe(saved.id);
    expect(capturedItemsPayload[0].product_name).toBe('Sobrassada de Mallorca');
  });
});
