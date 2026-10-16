import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { StockAlertService, StockAlertSubscription } from './stock-alerts';
import type { StoreProduct } from './products';

describe('StockAlertService', () => {
  let service: StockAlertService;

  const mockProduct: StoreProduct = {
    number: '01',
    name: 'Café 100% Robusta',
    category: 'CAFÉ GOURMET',
    price: 5.25,
    inStock: false,
    image: '/images/products/cafe.jpg',
    shortDescription: '5,25 €',
    description: 'Café gourmet de selección',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [StockAlertService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(StockAlertService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created and start with empty subscriptions', () => {
    expect(service).toBeTruthy();
    expect(service.subscriptions()).toEqual([]);
    expect(service.activeAlertProduct()).toBeNull();
  });

  it('validates email and phone inputs correctly', () => {
    expect(service.validateContact('cliente@calsarda.com', 'email')).toBe(true);
    expect(service.validateContact('invalido-sin-arroba', 'email')).toBe(false);
    expect(service.validateContact('612345678', 'whatsapp')).toBe(true);
    expect(service.validateContact('+34 612 34 56 78', 'whatsapp')).toBe(true);
    expect(service.validateContact('123', 'whatsapp')).toBe(false);
    expect(service.validateContact('', 'whatsapp')).toBe(false);
  });

  it('subscribes a new customer to out-of-stock product alerts', () => {
    const result = service.subscribe({
      productNumber: '01',
      productName: 'Café 100% Robusta',
      contact: 'cliente@calsarda.com',
      channel: 'email',
      customerName: 'Maria',
    });

    expect(result.success).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(result.subscription).toBeDefined();
    expect(result.subscription?.productNumber).toBe('01');
    expect(result.subscription?.status).toBe('pending');
    expect(service.getWaitingCount('01')).toBe(1);
    expect(service.getWaitingCount('02')).toBe(0);
  });

  it('detects duplicate subscription for same product, channel and contact', () => {
    service.subscribe({
      productNumber: '01',
      productName: 'Café 100% Robusta',
      contact: 'cliente@calsarda.com',
      channel: 'email',
    });

    const dupResult = service.subscribe({
      productNumber: '01',
      productName: 'Café 100% Robusta',
      contact: ' CLIENTE@calsarda.com ',
      channel: 'email',
    });

    expect(dupResult.success).toBe(true);
    expect(dupResult.isDuplicate).toBe(true);
    expect(service.getWaitingCount('01')).toBe(1);
  });

  it('rejects invalid contact with error', () => {
    const result = service.subscribe({
      productNumber: '01',
      productName: 'Café 100% Robusta',
      contact: 'no-es-un-email',
      channel: 'email',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_contact');
    expect(service.getWaitingCount('01')).toBe(0);
  });

  it('notifies restock to all pending subscribers for that product', async () => {
    // 2 clientes esperando producto 01
    service.subscribe({
      productNumber: '01',
      productName: 'Café 100% Robusta',
      contact: 'cliente1@calsarda.com',
      channel: 'email',
    });
    service.subscribe({
      productNumber: '01',
      productName: 'Café 100% Robusta',
      contact: '612345678',
      channel: 'whatsapp',
    });
    // 1 cliente esperando producto 02
    service.subscribe({
      productNumber: '02',
      productName: 'Turrón de Xixona',
      contact: 'cliente2@calsarda.com',
      channel: 'email',
    });

    expect(service.getWaitingCount('01')).toBe(2);
    expect(service.getWaitingCount('02')).toBe(1);

    // Se repone stock del producto 01
    const res = await service.notifyRestock('01', 'Café 100% Robusta');

    expect(res.notifiedCount).toBe(2);
    expect(res.subscribers.length).toBe(2);
    expect(service.getWaitingCount('01')).toBe(0); // Ya no quedan en espera
    expect(service.getWaitingCount('02')).toBe(1); // El producto 02 sigue esperando

    const pending = service.getAllPendingAlerts();
    expect(pending.length).toBe(1);
    expect(pending[0].productNumber).toBe('02');
  });

  it('opens and closes the alert modal for a product', () => {
    service.openAlertModal(mockProduct);
    expect(service.activeAlertProduct()).toEqual(mockProduct);

    service.closeAlertModal();
    expect(service.activeAlertProduct()).toBeNull();
  });

  it('removes a subscription by id', () => {
    const res = service.subscribe({
      productNumber: '01',
      productName: 'Café 100% Robusta',
      contact: 'cliente@calsarda.com',
      channel: 'email',
    });

    const subId = res.subscription!.id;
    expect(service.getWaitingCount('01')).toBe(1);

    service.removeSubscription(subId);
    expect(service.getWaitingCount('01')).toBe(0);
  });
});
