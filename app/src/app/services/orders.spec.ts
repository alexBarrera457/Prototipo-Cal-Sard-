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
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'usr-auth-test-uuid' } },
        error: null,
      }),
    },
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
          update: (updates: any) => {
            let matched: any = null;
            const chain: any = {
              eq: (col: string, val: any) => {
                matched = ordersDb.find((o) => o[col] === val);
                if (matched) Object.assign(matched, updates);
                return chain;
              },
              filter: (_p: string, _op: string, val: any) => {
                matched = ordersDb.find((o) => o.shipping_address?.reference === val);
                if (matched) Object.assign(matched, updates);
                return chain;
              },
              select: () => ({
                single: async () => ({
                  data: matched ? { ...matched } : null,
                  error: matched ? null : { message: 'Not found' },
                }),
              }),
            };
            return chain;
          },
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
          update: (updates: any) => {
            let orderId: string | null = null;
            let productName: string | null = null;
            const chain: any = {
              eq: (col: string, val: any) => {
                if (col === 'order_id') orderId = val;
                if (col === 'product_name') productName = val;
                if (orderId && productName) {
                  const item = orderItemsDb.find(
                    (it) => it.order_id === orderId && it.product_name === productName,
                  );
                  if (item) Object.assign(item, updates);
                }
                return chain;
              },
            };
            return chain;
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return client as unknown as SupabaseClient & {
    ordersDb: any[];
    orderItemsDb: any[];
    auth: { getUser: any };
  };
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
    expect(mockClient.ordersDb[0].user_id).toBe('usr-auth-test-uuid');
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

  it('updates order status in InMemoryOrdersRepository and in OrdersService signal', async () => {
    const memoryRepo = new InMemoryOrdersRepository();
    const service = new OrdersService(memoryRepo);

    const created = await service.submitOrder({
      customer: { name: 'Marta Roca', email: 'marta@test.cat' },
      items: [{ name: 'Pa de Pagès', price: 3.5, quantity: 1 }],
      fulfillment: 'pickup',
    });

    expect(created.status).toBe('confirmed');

    // Actualizar estado a 'en_preparacion'
    const updated1 = await service.updateOrderStatus(created.reference!, 'en_preparacion');
    expect(updated1).not.toBeNull();
    expect(updated1?.status).toBe('en_preparacion');
    expect(service.allOrders().find((o) => o.reference === created.reference)?.status).toBe(
      'en_preparacion',
    );
    expect(service.latestOrder()?.status).toBe('en_preparacion');

    // Actualizar a 'listo_recogida'
    const updated2 = await service.updateOrderStatus(created.reference!, 'listo_recogida');
    expect(updated2?.status).toBe('listo_recogida');
    expect(service.allOrders().find((o) => o.reference === created.reference)?.status).toBe(
      'listo_recogida',
    );
    expect(service.notifications.lastDispatchedAlert()?.newStatus).toBe('listo_recogida');
    expect(service.notifications.lastDispatchedAlert()?.orderReference).toBe(created.reference);

    // Intentar actualizar pedido inexistente
    const notFound = await service.updateOrderStatus('CS-UNKNOWN-999', 'cancelado');
    expect(notFound).toBeNull();
  });

  it('preserves status: proforma and dispatches proforma quote notifications without confirming order', async () => {
    const memoryRepo = new InMemoryOrdersRepository();
    const service = new OrdersService(memoryRepo);

    const proformaSpy = vi.spyOn(service.notifications, 'sendProformaQuoteNotifications');
    const confirmSpy = vi.spyOn(service.notifications, 'sendOrderConfirmationNotifications');

    const created = await service.submitOrder({
      reference: 'PRF-2026-9999',
      customer: { name: 'Empresa Test', companyName: 'Empresa Test SL', email: 'b2b@test.cat' },
      items: [{ name: 'Lote Navidad Gourmet', price: 60.0, quantity: 10 }],
      total: 600.0,
      fulfillment: 'delivery',
      status: 'proforma',
      paymentStatus: 'pending',
    });

    expect(created.status).toBe('proforma');
    expect(created.paymentStatus).toBe('pending');
    expect(proformaSpy).toHaveBeenCalledWith(created);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  describe('Cut-to-order weighing in obrador (#54)', () => {
    it('correctly identifies cut-to-order products and infers estimated weights', () => {
      const service = new OrdersService(new InMemoryOrdersRepository());

      expect(service.isCutToOrderProduct('Jamón Ibérico de Bellota al corte 200g')).toBe(true);
      expect(service.isCutToOrderProduct('Formatge Garrotxa semicurat tallat')).toBe(true);
      expect(service.isCutToOrderProduct('Secallona artesana d’Osona')).toBe(true);
      expect(service.isCutToOrderProduct('Conservas Espinaler Berberechos')).toBe(false);

      expect(service.inferEstimatedWeight('Pernil ibèric 200g')).toBe(200);
      expect(service.inferEstimatedWeight('Formatge Mahó 1kg')).toBe(1000);
      expect(service.inferEstimatedWeight('Llonganissa artesana')).toBe(250);
    });

    it('adjusts weight on scale and recalculates item price, subtotal and order total proportionally', async () => {
      const memoryRepo = new InMemoryOrdersRepository();
      const service = new OrdersService(memoryRepo);

      const order: Order = {
        reference: 'CS-2026-WEIGH-01',
        customer: {
          name: 'Ferran Adrià',
          email: 'ferran@elbulli.cat',
          phone: '932000000',
          address: 'Cala Montjoi',
          postalCode: '17480',
          city: 'Roses',
        },
        items: [
          {
            name: 'Pernil Ibèric al tall 200g',
            price: 20.0,
            quantity: 1,
            estimatedWeightGrams: 200,
          },
          {
            name: 'Pa amb Tomàquet artesà',
            price: 4.0,
            quantity: 2,
          },
        ],
        subtotal: 28.0,
        shippingCost: 5.0,
        total: 33.0,
        status: 'en_preparacion',
      };

      await memoryRepo.saveOrder(order);
      await service.loadAllOrders();

      // Ajustar peso de 200g a 220g (+10% -> precio de 20.0 a 22.0)
      const updated = await service.updateOrderWeighing('CS-2026-WEIGH-01', 0, 220);

      expect(updated).not.toBeNull();
      expect(updated?.items[0].realWeightGrams).toBe(220);
      expect(updated?.items[0].price).toBe(22.0); // 20 * (220 / 200) = 22.0
      expect(updated?.subtotal).toBe(30.0); // 22.0 + 8.0 = 30.0
      expect(updated?.total).toBe(35.0); // 30.0 + 5.0 shipping = 35.0

      // Re-verificar que en memoria quedó guardado
      const fetched = await memoryRepo.getOrder('CS-2026-WEIGH-01');
      expect(fetched?.items[0].realWeightGrams).toBe(220);
      expect(fetched?.total).toBe(35.0);
    });

    it('persists weighing adjustment to Supabase orders and order_items tables via SupabaseOrdersRepository', async () => {
      const mockClient = createMockSupabaseClient();
      const service = new OrdersService(undefined, mockClient);

      const created = await service.submitOrder({
        customer: { name: 'Josep Roca', email: 'josep@celler.cat' },
        items: [
          {
            name: 'Pernil Ibèric de Bellota 200g',
            price: 25.0,
            quantity: 1,
            estimatedWeightGrams: 200,
          },
          {
            name: 'Formatge d’Ovellla Curat',
            price: 10.0,
            quantity: 1,
          },
        ],
        fulfillment: 'pickup',
      });

      expect(mockClient.ordersDb.length).toBe(1);
      expect(mockClient.orderItemsDb.length).toBe(2);

      // Scale weight measured in store: 240g instead of 200g (+20% -> 30.0 €)
      const adjusted = await service.updateOrderWeighing(created.reference!, 0, 240);

      expect(adjusted).not.toBeNull();
      expect(adjusted?.items[0].realWeightGrams).toBe(240);
      expect(adjusted?.items[0].price).toBe(30.0);
      expect(adjusted?.subtotal).toBe(40.0); // 30.0 + 10.0 = 40.0
      expect(adjusted?.total).toBe(40.0);

      // Verify Supabase orders table received the new total and subtotal
      expect(mockClient.ordersDb[0].total).toBe(40.0);
      expect(mockClient.ordersDb[0].shipping_address.subtotal).toBe(40.0);

      // Verify Supabase order_items table received updated unit_price and real_weight_grams
      const pernilItem = mockClient.orderItemsDb.find(
        (it) => it.product_name === 'Pernil Ibèric de Bellota 200g',
      );
      expect(pernilItem).toBeTruthy();
      expect(pernilItem.unit_price).toBe(30.0);
      expect(pernilItem.real_weight_grams).toBe(240);

      // Verify fetching from Supabase repository returns updated weight and price
      const fetchedFromRepo = await service.getOrder(created.reference!);
      expect(fetchedFromRepo?.total).toBe(40.0);
      expect(fetchedFromRepo?.items[0].realWeightGrams).toBe(240);
      expect(fetchedFromRepo?.items[0].price).toBe(30.0);
    });
  });
});
