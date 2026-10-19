import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { GiftCardsService, DEFAULT_INITIAL_GIFT_CARDS } from './gift-cards';

describe('GiftCardsService (#64)', () => {
  let service: GiftCardsService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    TestBed.configureTestingModule({
      providers: [GiftCardsService],
    });
    service = TestBed.inject(GiftCardsService);
  });

  it('initializes with default sample gift cards', () => {
    expect(service.cards().length).toBe(DEFAULT_INITIAL_GIFT_CARDS.length);
    const card50 = service.getGiftCard('REGAL-CS-50');
    expect(card50).not.toBeNull();
    expect(card50?.currentBalance).toBe(50.0);
  });

  it('creates a new digital gift card with valid unique code and metadata', () => {
    const created = service.createGiftCard({
      amount: 75.0,
      senderName: 'Marta Soler',
      recipientName: 'Oriol Valls',
      recipientEmail: 'oriol@example.cat',
      dedication: 'Gaudeix d’aquest regal per la teva nova llar!',
    });

    expect(created.code).toMatch(/^REGAL-CS-\d{4}$/);
    expect(created.initialBalance).toBe(75.0);
    expect(created.currentBalance).toBe(75.0);
    expect(created.senderName).toBe('Marta Soler');
    expect(created.recipientName).toBe('Oriol Valls');
    expect(created.isActive).toBe(true);

    const retrieved = service.getGiftCard(created.code);
    expect(retrieved).toEqual(created);
  });

  it('validates gift card balance and returns available amount', () => {
    const result = service.checkBalance('REGAL-CS-50');
    expect(result.valid).toBe(true);
    expect(result.balance).toBe(50.0);
    expect(result.card?.recipientName).toBe('Client Fidel');

    const invalid = service.checkBalance('INVENTADO-999');
    expect(invalid.valid).toBe(false);
    expect(invalid.balance).toBe(0);
  });

  it('supports partial redemption maintaining remaining balance for future purchases', () => {
    // Canje parcial de 20 € de una tarjeta de 50 €
    const redeem1 = service.redeemBalance('REGAL-CS-50', 20.0);
    expect(redeem1.success).toBe(true);
    expect(redeem1.redeemedAmount).toBe(20.0);
    expect(redeem1.remainingBalance).toBe(30.0);

    const cardAfter1 = service.getGiftCard('REGAL-CS-50');
    expect(cardAfter1?.currentBalance).toBe(30.0);
    expect(cardAfter1?.isActive).toBe(true);

    // Segundo canje parcial de 30 € (agota la tarjeta)
    const redeem2 = service.redeemBalance('REGAL-CS-50', 35.0); // solicita más del disponible
    expect(redeem2.success).toBe(true);
    expect(redeem2.redeemedAmount).toBe(30.0); // solo puede canjear los 30 restantes
    expect(redeem2.remainingBalance).toBe(0);

    const cardAfter2 = service.getGiftCard('REGAL-CS-50');
    expect(cardAfter2?.currentBalance).toBe(0);
    expect(cardAfter2?.isActive).toBe(false);

    // Intentar canjear tarjeta agotada
    const checkExhausted = service.checkBalance('REGAL-CS-50');
    expect(checkExhausted.valid).toBe(false);
  });
});

describe('SupabaseGiftCardsRepository', () => {
  it('saves and reads gift cards in Supabase table and falls back gracefully', async () => {
    const giftCardsDb: any[] = [];
    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          order: async () => ({
            data: giftCardsDb,
            error: null,
          }),
          eq: (_col: string, val: any) => ({
            maybeSingle: async () => {
              const found = giftCardsDb.find((c) => c.code === val);
              return { data: found || null, error: null };
            },
          }),
        }),
        upsert: async (payload: any) => {
          giftCardsDb.push(payload);
          return { error: null };
        },
        update: (payload: any) => ({
          eq: (col: string, val: any) => ({
            select: () => ({
              single: async () => {
                const found = giftCardsDb.find((c) => c[col] === val);
                if (found) Object.assign(found, payload);
                return { data: found, error: null };
              },
            }),
          }),
        }),
      }),
    };

    const repo = new (await import('./gift-cards')).SupabaseGiftCardsRepository(
      mockSupabase as any,
    );

    const saved = await repo.save({
      code: 'REGAL-TEST-100',
      initialBalance: 100,
      currentBalance: 100,
      senderName: 'Anna',
      recipientName: 'Bernat',
      recipientEmail: 'bernat@example.cat',
      createdAt: new Date().toISOString(),
      isActive: true,
    });

    expect(saved.code).toBe('REGAL-TEST-100');
    expect(giftCardsDb.length).toBe(1);

    const byCode = await repo.getByCode('REGAL-TEST-100');
    expect(byCode?.recipientName).toBe('Bernat');

    const updated = await repo.update('REGAL-TEST-100', { currentBalance: 50 });
    expect(updated?.currentBalance).toBe(50);
  });
});
