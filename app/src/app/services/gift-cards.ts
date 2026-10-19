import { Inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import { SUPABASE_CLIENT, type SupabaseClient } from './supabase';

export interface GiftCardRecord {
  code: string;
  initialBalance: number;
  currentBalance: number;
  senderName: string;
  senderEmail?: string;
  recipientName: string;
  recipientEmail: string;
  dedication?: string;
  deliveryDate?: string;
  createdAt: string;
  isActive: boolean;
}

export interface GiftCardValidationResult {
  valid: boolean;
  balance: number;
  message?: string;
  card?: GiftCardRecord;
}

export interface GiftCardRedeemResult {
  success: boolean;
  redeemedAmount: number;
  remainingBalance: number;
  error?: string;
}

export const DEFAULT_INITIAL_GIFT_CARDS: GiftCardRecord[] = [
  {
    code: 'REGAL-CS-50',
    initialBalance: 50.0,
    currentBalance: 50.0,
    senderName: 'Família Sardà',
    recipientName: 'Client Fidel',
    recipientEmail: 'client@calsarda.com',
    dedication: 'Bones festes amb el millor producte artesà del Colmado Cal Sardà.',
    createdAt: '2026-10-01T10:00:00Z',
    isActive: true,
  },
  {
    code: 'REGAL-CS-100',
    initialBalance: 100.0,
    currentBalance: 100.0,
    senderName: 'Empresa Associada BCN',
    recipientName: 'Equip Comercial',
    recipientEmail: 'comercial@empresa.cat',
    dedication: 'Gràcies pel vostre compromís durant tot aquest any!',
    createdAt: '2026-10-05T12:00:00Z',
    isActive: true,
  },
  {
    code: 'REGAL-CS-1930',
    initialBalance: 30.0,
    currentBalance: 30.0,
    senderName: 'Colmado Cal Sardà 1930',
    recipientName: 'Veí de Sagrada Família',
    recipientEmail: 'vei@calsarda.com',
    dedication: 'Gaudeix d’un tast tradicional al Carrer Marina 237.',
    createdAt: '2026-10-10T09:00:00Z',
    isActive: true,
  },
];

export const GIFT_CARDS_REPOSITORY = new InjectionToken<GiftCardsRepository>(
  'GIFT_CARDS_REPOSITORY',
);

export interface GiftCardsRepository {
  getAll(): Promise<GiftCardRecord[]>;
  getByCode(code: string): Promise<GiftCardRecord | null>;
  save(card: GiftCardRecord): Promise<GiftCardRecord>;
  update(code: string, updates: Partial<GiftCardRecord>): Promise<GiftCardRecord | null>;
}

export class InMemoryGiftCardsRepository implements GiftCardsRepository {
  private cards: GiftCardRecord[];

  constructor(initialCards: GiftCardRecord[] = DEFAULT_INITIAL_GIFT_CARDS) {
    this.cards = initialCards.map((c) => ({ ...c }));
  }

  async getAll(): Promise<GiftCardRecord[]> {
    return [...this.cards];
  }

  async getByCode(code: string): Promise<GiftCardRecord | null> {
    const clean = code.trim().toUpperCase();
    const found = this.cards.find((c) => c.code.toUpperCase() === clean);
    return found ? { ...found } : null;
  }

  async save(card: GiftCardRecord): Promise<GiftCardRecord> {
    const idx = this.cards.findIndex((c) => c.code.toUpperCase() === card.code.toUpperCase());
    if (idx >= 0) {
      this.cards[idx] = { ...card };
    } else {
      this.cards.unshift({ ...card });
    }
    return { ...card };
  }

  async update(code: string, updates: Partial<GiftCardRecord>): Promise<GiftCardRecord | null> {
    const clean = code.trim().toUpperCase();
    const idx = this.cards.findIndex((c) => c.code.toUpperCase() === clean);
    if (idx === -1) return null;
    this.cards[idx] = { ...this.cards[idx], ...updates };
    return { ...this.cards[idx] };
  }
}

export class SupabaseGiftCardsRepository implements GiftCardsRepository {
  private readonly fallbackRepo: GiftCardsRepository;

  constructor(
    private readonly supabase?: SupabaseClient | null,
    fallbackRepo?: GiftCardsRepository,
  ) {
    this.fallbackRepo = fallbackRepo ?? new InMemoryGiftCardsRepository();
  }

  async getAll(): Promise<GiftCardRecord[]> {
    if (!this.supabase) return this.fallbackRepo.getAll();
    try {
      const { data, error } = await this.supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return this.fallbackRepo.getAll();
      return data.map((d: any) => ({
        code: d.code,
        initialBalance: Number(d.initial_balance),
        currentBalance: Number(d.current_balance),
        senderName: d.sender_name,
        senderEmail: d.sender_email ?? undefined,
        recipientName: d.recipient_name,
        recipientEmail: d.recipient_email,
        dedication: d.dedication ?? undefined,
        deliveryDate: d.delivery_date ?? undefined,
        createdAt: d.created_at,
        isActive: d.is_active,
      }));
    } catch {
      return this.fallbackRepo.getAll();
    }
  }

  async getByCode(code: string): Promise<GiftCardRecord | null> {
    if (!this.supabase) return this.fallbackRepo.getByCode(code);
    try {
      const clean = code.trim().toUpperCase();
      const { data, error } = await this.supabase
        .from('gift_cards')
        .select('*')
        .eq('code', clean)
        .maybeSingle();
      if (error || !data) return this.fallbackRepo.getByCode(code);
      return {
        code: data.code,
        initialBalance: Number(data.initial_balance),
        currentBalance: Number(data.current_balance),
        senderName: data.sender_name,
        senderEmail: data.sender_email ?? undefined,
        recipientName: data.recipient_name,
        recipientEmail: data.recipient_email,
        dedication: data.dedication ?? undefined,
        deliveryDate: data.delivery_date ?? undefined,
        createdAt: data.created_at,
        isActive: data.is_active,
      };
    } catch {
      return this.fallbackRepo.getByCode(code);
    }
  }

  async save(card: GiftCardRecord): Promise<GiftCardRecord> {
    if (!this.supabase) return this.fallbackRepo.save(card);
    try {
      const payload: Record<string, any> = {
        code: card.code,
        initial_balance: card.initialBalance,
        current_balance: card.currentBalance,
        sender_name: card.senderName,
        sender_email: card.senderEmail ?? null,
        recipient_name: card.recipientName,
        recipient_email: card.recipientEmail,
        dedication: card.dedication ?? null,
        delivery_date: card.deliveryDate ?? null,
        is_active: card.isActive,
        created_at: card.createdAt,
      };
      const { error } = await this.supabase.from('gift_cards').upsert(payload);
      if (error) return this.fallbackRepo.save(card);
      await this.fallbackRepo.save(card);
      return card;
    } catch {
      return this.fallbackRepo.save(card);
    }
  }

  async update(code: string, updates: Partial<GiftCardRecord>): Promise<GiftCardRecord | null> {
    if (!this.supabase) return this.fallbackRepo.update(code, updates);
    try {
      const clean = code.trim().toUpperCase();
      const payload: Record<string, any> = {};
      if (updates.currentBalance !== undefined) payload['current_balance'] = updates.currentBalance;
      if (updates.isActive !== undefined) payload['is_active'] = updates.isActive;

      const { data, error } = await this.supabase
        .from('gift_cards')
        .update(payload)
        .eq('code', clean)
        .select()
        .single();
      if (error || !data) return this.fallbackRepo.update(code, updates);
      await this.fallbackRepo.update(code, updates);
      return {
        code: data.code,
        initialBalance: Number(data.initial_balance),
        currentBalance: Number(data.current_balance),
        senderName: data.sender_name,
        senderEmail: data.sender_email ?? undefined,
        recipientName: data.recipient_name,
        recipientEmail: data.recipient_email,
        dedication: data.dedication ?? undefined,
        deliveryDate: data.delivery_date ?? undefined,
        createdAt: data.created_at,
        isActive: data.is_active,
      };
    } catch {
      return this.fallbackRepo.update(code, updates);
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class GiftCardsService {
  private readonly repository: GiftCardsRepository;
  private readonly storageKey = 'cal_sarda_gift_cards';
  readonly cards = signal<GiftCardRecord[]>([]);

  constructor(
    @Optional() @Inject(GIFT_CARDS_REPOSITORY) repository?: GiftCardsRepository,
    @Optional() @Inject(SUPABASE_CLIENT) supabaseClient?: SupabaseClient | null,
  ) {
    let initialCards = [...DEFAULT_INITIAL_GIFT_CARDS];
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialCards = parsed;
          }
        }
      } catch {
        // Ignorar errores de lectura
      }
    }

    if (repository) {
      this.repository = repository;
    } else if (supabaseClient) {
      this.repository = new SupabaseGiftCardsRepository(
        supabaseClient,
        new InMemoryGiftCardsRepository(initialCards),
      );
    } else {
      this.repository = new InMemoryGiftCardsRepository(initialCards);
    }

    this.cards.set(initialCards);
    this.syncFromRepository();
  }

  private async syncFromRepository(): Promise<void> {
    try {
      const fromRepo = await this.repository.getAll();
      if (fromRepo && fromRepo.length > 0) {
        this.cards.set(fromRepo);
        this.saveCards();
      }
    } catch {
      // Fallback
    }
  }

  getRepository(): GiftCardsRepository {
    return this.repository;
  }

  private loadCards(): void {
    this.syncFromRepository();
  }

  private saveCards(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.cards()));
    } catch {
      // Ignorar errores de guardado
    }
  }

  generateUniqueCode(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `REGAL-CS-${randomNum}`;
  }

  createGiftCard(payload: {
    amount: number;
    senderName: string;
    senderEmail?: string;
    recipientName: string;
    recipientEmail: string;
    dedication?: string;
    deliveryDate?: string;
  }): GiftCardRecord {
    let code = this.generateUniqueCode();
    // Prevenir colisiones
    while (this.cards().some((c) => c.code === code)) {
      code = this.generateUniqueCode();
    }

    const safeAmount = Math.max(10, Math.round(payload.amount * 100) / 100);

    const newCard: GiftCardRecord = {
      code,
      initialBalance: safeAmount,
      currentBalance: safeAmount,
      senderName: payload.senderName.trim(),
      senderEmail: payload.senderEmail?.trim(),
      recipientName: payload.recipientName.trim(),
      recipientEmail: payload.recipientEmail.trim(),
      dedication: payload.dedication?.trim(),
      deliveryDate: payload.deliveryDate,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    this.cards.update((list) => [newCard, ...list]);
    this.saveCards();
    this.repository.save(newCard).catch(() => {});
    return newCard;
  }

  getGiftCard(code: string): GiftCardRecord | null {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    return this.cards().find((c) => c.code.toUpperCase() === clean) ?? null;
  }

  checkBalance(code: string): GiftCardValidationResult {
    if (!code || !code.trim()) {
      return { valid: false, balance: 0, message: 'Introdueix un codi de targeta regal.' };
    }

    const card = this.getGiftCard(code);
    if (!card) {
      return { valid: false, balance: 0, message: 'Targeta regal no trobada o inexistent.' };
    }

    if (!card.isActive) {
      return { valid: false, balance: 0, message: 'Aquesta targeta regal no està activa.' };
    }

    if (card.currentBalance <= 0) {
      return { valid: false, balance: 0, message: 'Aquesta targeta regal no té saldo restant.' };
    }

    return {
      valid: true,
      balance: card.currentBalance,
      card,
      message: `Saldo disponible: ${card.currentBalance.toFixed(2)} €`,
    };
  }

  redeemBalance(code: string, amountToRedeem: number): GiftCardRedeemResult {
    const card = this.getGiftCard(code);
    if (!card || !card.isActive) {
      return {
        success: false,
        redeemedAmount: 0,
        remainingBalance: 0,
        error: 'Targeta regal no vàlida o inactiva.',
      };
    }

    if (amountToRedeem <= 0) {
      return {
        success: false,
        redeemedAmount: 0,
        remainingBalance: card.currentBalance,
        error: 'L’import a canviar ha de ser superior a 0 €.',
      };
    }

    const redeemAmount = Math.min(card.currentBalance, Math.round(amountToRedeem * 100) / 100);
    const newBalance = Math.round((card.currentBalance - redeemAmount) * 100) / 100;

    this.cards.update((list) =>
      list.map((c) =>
        c.code.toUpperCase() === card.code.toUpperCase()
          ? {
              ...c,
              currentBalance: newBalance,
              isActive: newBalance > 0,
            }
          : c,
      ),
    );
    this.saveCards();
    this.repository
      .update(card.code, { currentBalance: newBalance, isActive: newBalance > 0 })
      .catch(() => {});

    return {
      success: true,
      redeemedAmount: redeemAmount,
      remainingBalance: newBalance,
    };
  }

  resetToDefaults(): void {
    this.cards.set([...DEFAULT_INITIAL_GIFT_CARDS]);
    this.saveCards();
    for (const card of DEFAULT_INITIAL_GIFT_CARDS) {
      this.repository.save(card).catch(() => {});
    }
  }
}
