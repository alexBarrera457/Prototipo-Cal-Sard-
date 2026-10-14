import { describe, expect, it } from 'vitest';
import {
  InMemoryOrdersRepository,
  ORDERS_REPOSITORY,
  OrdersRepository,
  OrdersService,
} from './orders';
import type { Order } from './orders';

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
