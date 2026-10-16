import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, expect, it, beforeEach } from 'vitest';
import { CustomersService } from './customers';
import { OrdersService, InMemoryOrdersRepository, ORDERS_REPOSITORY } from './orders';

describe('CustomersService', () => {
  let service: CustomersService;
  let ordersService: OrdersService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        CustomersService,
        OrdersService,
        {
          provide: ORDERS_REPOSITORY,
          useValue: new InMemoryOrdersRepository([
            {
              id: 'ord-1',
              reference: 'CS-101',
              customer: {
                name: 'Montserrat Puig',
                email: 'montserrat.puig@gmail.com',
                phone: '612 345 678',
              },
              items: [{ name: 'Formatge Curat', price: 20, quantity: 1 }],
              total: 20,
              status: 'entregado',
              createdAt: '2026-02-10T10:00:00Z',
            },
            {
              id: 'ord-2',
              reference: 'CS-102',
              customer: {
                name: 'Jaume Sardà',
                email: 'cliente@calsarda.com',
                phone: '611 223 344',
                address: 'Carrer Mallorca 184',
              },
              items: [{ name: 'Jamón de Bellota', price: 50, quantity: 1 }],
              total: 50,
              status: 'entregado',
              createdAt: '2026-03-01T10:00:00Z',
            },
            {
              id: 'ord-3',
              reference: 'CS-103',
              customer: {
                name: 'Jaume Sardà',
                email: 'cliente@calsarda.com',
                phone: '611 223 344',
              },
              items: [{ name: 'Secallona artesana', price: 15, quantity: 2 }],
              total: 30,
              status: 'entregado',
              createdAt: '2026-03-15T10:00:00Z',
            },
          ]),
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(CustomersService);
    ordersService = TestBed.inject(OrdersService);
  });

  it('aggregates customers dynamically from recorded orders', () => {
    const list = service.customers();
    expect(list.length).toBe(2);

    const jaume = service.getCustomerByEmail('cliente@calsarda.com');
    expect(jaume).toBeDefined();
    expect(jaume?.totalOrders).toBe(2);
    expect(jaume?.totalSpent).toBe(80); // 50 + 30
    expect(jaume?.isRecurrent).toBe(true);
    expect(jaume?.orders.length).toBe(2);

    const montserrat = service.getCustomerByEmail('montserrat.puig@gmail.com');
    expect(montserrat).toBeDefined();
    expect(montserrat?.totalOrders).toBe(1);
    expect(montserrat?.totalSpent).toBe(20);
    expect(montserrat?.isRecurrent).toBe(false);
  });

  it('allows updating customer internal notes and type with persistence', () => {
    service.updateInternalNotes(
      'montserrat.puig@gmail.com',
      'Avisar siempre por WhatsApp antes de preparar.',
    );
    service.updateCustomerType('montserrat.puig@gmail.com', 'empresa');

    const updated = service.getCustomerByEmail('montserrat.puig@gmail.com');
    expect(updated?.internalNotes).toBe('Avisar siempre por WhatsApp antes de preparar.');
    expect(updated?.type).toBe('empresa');
  });
});
