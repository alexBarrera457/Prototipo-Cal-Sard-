import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import type { StoreProduct } from './products';
import { NotificationService } from './notifications';

export type StockAlertChannel = 'whatsapp' | 'email';

export interface StockAlertSubscription {
  id: string;
  productNumber: string;
  productName: string;
  contact: string;
  channel: StockAlertChannel;
  customerName?: string;
  status: 'pending' | 'notified';
  createdAt: string;
  notifiedAt?: string;
}

export interface SubscribeStockAlertParams {
  productNumber: string;
  productName: string;
  contact: string;
  channel: StockAlertChannel;
  customerName?: string;
}

export interface SubscribeStockAlertResult {
  success: boolean;
  isDuplicate: boolean;
  subscription?: StockAlertSubscription;
  error?: string;
}

export interface RestockNotificationResult {
  notifiedCount: number;
  subscribers: StockAlertSubscription[];
}

export interface RestockAlertEvent {
  productNumber: string;
  productName: string;
  subscribers: StockAlertSubscription[];
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class StockAlertService {
  private readonly storageKey = 'cal_sarda_stock_alerts';
  private readonly isBrowser: boolean;

  readonly subscriptions = signal<StockAlertSubscription[]>([]);
  readonly activeAlertProduct = signal<StoreProduct | null>(null);
  readonly lastRestockAlert = signal<RestockAlertEvent | null>(null);

  private readonly notificationService = inject(NotificationService, { optional: true });

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.loadFromStorage();
  }

  openAlertModal(product: StoreProduct): void {
    this.activeAlertProduct.set(product);
  }

  closeAlertModal(): void {
    this.activeAlertProduct.set(null);
  }

  private normalizeContact(contact: string, channel: StockAlertChannel): string {
    const trimmed = contact.trim();
    if (channel === 'email') {
      return trimmed.toLowerCase();
    }
    return trimmed.replace(/[\s-]/g, '');
  }

  validateContact(contact: string, channel: StockAlertChannel): boolean {
    const normalized = this.normalizeContact(contact, channel);
    if (!normalized) return false;

    if (channel === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    } else {
      const digitsOnly = normalized.replace(/\D/g, '');
      return digitsOnly.length >= 8 && digitsOnly.length <= 15;
    }
  }

  subscribe(params: SubscribeStockAlertParams): SubscribeStockAlertResult {
    const { productNumber, productName, channel, customerName } = params;
    const contact = this.normalizeContact(params.contact, channel);

    if (!this.validateContact(contact, channel)) {
      return {
        success: false,
        isDuplicate: false,
        error: 'invalid_contact',
      };
    }

    const current = this.subscriptions();
    const existing = current.find(
      (s) =>
        s.productNumber === productNumber &&
        s.channel === channel &&
        this.normalizeContact(s.contact, channel) === contact &&
        s.status === 'pending',
    );

    if (existing) {
      return {
        success: true,
        isDuplicate: true,
        subscription: existing,
      };
    }

    const newSubscription: StockAlertSubscription = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productNumber,
      productName,
      contact,
      channel,
      customerName: customerName?.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updated = [newSubscription, ...current];
    this.subscriptions.set(updated);
    this.persistToStorage(updated);

    return {
      success: true,
      isDuplicate: false,
      subscription: newSubscription,
    };
  }

  getWaitingCount(productNumber: string): number {
    return this.subscriptions().filter(
      (s) => s.productNumber === productNumber && s.status === 'pending',
    ).length;
  }

  getPendingAlerts(productNumber: string): StockAlertSubscription[] {
    return this.subscriptions().filter(
      (s) => s.productNumber === productNumber && s.status === 'pending',
    );
  }

  getAllPendingAlerts(): StockAlertSubscription[] {
    return this.subscriptions().filter((s) => s.status === 'pending');
  }

  async notifyRestock(
    productNumber: string,
    productName?: string,
  ): Promise<RestockNotificationResult> {
    const current = this.subscriptions();
    const pendingList = current.filter(
      (s) => s.productNumber === productNumber && s.status === 'pending',
    );

    if (pendingList.length === 0) {
      return {
        notifiedCount: 0,
        subscribers: [],
      };
    }

    const timestamp = new Date().toISOString();
    const updated = current.map((s) => {
      if (s.productNumber === productNumber && s.status === 'pending') {
        return {
          ...s,
          status: 'notified' as const,
          notifiedAt: timestamp,
          productName: productName || s.productName,
        };
      }
      return s;
    });

    this.subscriptions.set(updated);
    this.persistToStorage(updated);

    const alertEvent: RestockAlertEvent = {
      productNumber,
      productName: productName || pendingList[0].productName,
      subscribers: pendingList,
      timestamp,
    };
    this.lastRestockAlert.set(alertEvent);

    return {
      notifiedCount: pendingList.length,
      subscribers: pendingList,
    };
  }

  removeSubscription(id: string): void {
    const updated = this.subscriptions().filter((s) => s.id !== id);
    this.subscriptions.set(updated);
    this.persistToStorage(updated);
  }

  clearSubscriptions(): void {
    this.subscriptions.set([]);
    if (this.isBrowser) {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {
        // Ignorar fallos de acceso
      }
    }
  }

  private loadFromStorage(): void {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.subscriptions.set(parsed);
        }
      }
    } catch {
      this.subscriptions.set([]);
    }
  }

  private persistToStorage(items: StockAlertSubscription[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {
      // Ignorar quota exceeded u otros errores de almacenamiento
    }
  }
}
