import { Injectable, signal } from '@angular/core';

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

@Injectable({
  providedIn: 'root',
})
export class GiftCardsService {
  private readonly storageKey = 'cal_sarda_gift_cards';
  readonly cards = signal<GiftCardRecord[]>([]);

  constructor() {
    this.loadCards();
  }

  private loadCards(): void {
    if (typeof localStorage === 'undefined') {
      this.cards.set([...DEFAULT_INITIAL_GIFT_CARDS]);
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cards.set(parsed);
          return;
        }
      }
    } catch {
      // Ignorar errores de lectura
    }

    this.cards.set([...DEFAULT_INITIAL_GIFT_CARDS]);
    this.saveCards();
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

    return {
      success: true,
      redeemedAmount: redeemAmount,
      remainingBalance: newBalance,
    };
  }
}
