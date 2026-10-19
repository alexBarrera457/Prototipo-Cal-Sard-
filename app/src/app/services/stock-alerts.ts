import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, InjectionToken, Optional, PLATFORM_ID, signal } from '@angular/core';
import type { StoreProduct } from './products';
import { NotificationService } from './notifications';
import { SUPABASE_CLIENT, type SupabaseClient } from './supabase';

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

export const STOCK_ALERTS_REPOSITORY = new InjectionToken<StockAlertsRepository>(
  'STOCK_ALERTS_REPOSITORY',
);

export interface StockAlertsRepository {
  getAll(): Promise<StockAlertSubscription[]>;
  save(subscription: StockAlertSubscription): Promise<StockAlertSubscription>;
  update(
    id: string,
    updates: Partial<StockAlertSubscription>,
  ): Promise<StockAlertSubscription | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryStockAlertsRepository implements StockAlertsRepository {
  private subscriptions: StockAlertSubscription[] = [];

  constructor(initial: StockAlertSubscription[] = []) {
    this.subscriptions = [...initial];
  }

  async getAll(): Promise<StockAlertSubscription[]> {
    return [...this.subscriptions];
  }

  async save(sub: StockAlertSubscription): Promise<StockAlertSubscription> {
    const idx = this.subscriptions.findIndex((s) => s.id === sub.id);
    if (idx >= 0) {
      this.subscriptions[idx] = { ...sub };
    } else {
      this.subscriptions.unshift({ ...sub });
    }
    return { ...sub };
  }

  async update(
    id: string,
    updates: Partial<StockAlertSubscription>,
  ): Promise<StockAlertSubscription | null> {
    const idx = this.subscriptions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.subscriptions[idx] = { ...this.subscriptions[idx], ...updates };
    return { ...this.subscriptions[idx] };
  }

  async delete(id: string): Promise<boolean> {
    const prev = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
    return this.subscriptions.length !== prev;
  }
}

export class SupabaseStockAlertsRepository implements StockAlertsRepository {
  private readonly fallbackRepo: StockAlertsRepository;

  constructor(
    private readonly supabase?: SupabaseClient | null,
    fallbackRepo?: StockAlertsRepository,
  ) {
    this.fallbackRepo = fallbackRepo ?? new InMemoryStockAlertsRepository();
  }

  async getAll(): Promise<StockAlertSubscription[]> {
    if (!this.supabase) return this.fallbackRepo.getAll();
    try {
      const { data, error } = await this.supabase
        .from('stock_alerts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return this.fallbackRepo.getAll();
      return data.map((d: any) => ({
        id: d.id,
        productNumber: d.product_number,
        productName: d.product_name,
        contact: d.contact,
        channel: d.channel as StockAlertChannel,
        customerName: d.customer_name ?? undefined,
        status: d.status as 'pending' | 'notified',
        createdAt: d.created_at,
        notifiedAt: d.notified_at ?? undefined,
      }));
    } catch {
      return this.fallbackRepo.getAll();
    }
  }

  async save(sub: StockAlertSubscription): Promise<StockAlertSubscription> {
    if (!this.supabase) return this.fallbackRepo.save(sub);
    try {
      const payload: Record<string, any> = {
        id: sub.id,
        product_number: sub.productNumber,
        product_name: sub.productName,
        contact: sub.contact,
        channel: sub.channel,
        customer_name: sub.customerName ?? null,
        status: sub.status,
        created_at: sub.createdAt,
        notified_at: sub.notifiedAt ?? null,
      };
      const { error } = await this.supabase.from('stock_alerts').upsert(payload);
      if (error) return this.fallbackRepo.save(sub);
      await this.fallbackRepo.save(sub);
      return sub;
    } catch {
      return this.fallbackRepo.save(sub);
    }
  }

  async update(
    id: string,
    updates: Partial<StockAlertSubscription>,
  ): Promise<StockAlertSubscription | null> {
    if (!this.supabase) return this.fallbackRepo.update(id, updates);
    try {
      const payload: Record<string, any> = {};
      if (updates.status !== undefined) payload['status'] = updates.status;
      if (updates.notifiedAt !== undefined) payload['notified_at'] = updates.notifiedAt;
      if (updates.productName !== undefined) payload['product_name'] = updates.productName;

      const { data, error } = await this.supabase
        .from('stock_alerts')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) return this.fallbackRepo.update(id, updates);
      await this.fallbackRepo.update(id, updates);
      return {
        id: data.id,
        productNumber: data.product_number,
        productName: data.product_name,
        contact: data.contact,
        channel: data.channel as StockAlertChannel,
        customerName: data.customer_name ?? undefined,
        status: data.status as 'pending' | 'notified',
        createdAt: data.created_at,
        notifiedAt: data.notified_at ?? undefined,
      };
    } catch {
      return this.fallbackRepo.update(id, updates);
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.supabase) return this.fallbackRepo.delete(id);
    try {
      const { error } = await this.supabase.from('stock_alerts').delete().eq('id', id);
      if (error) return this.fallbackRepo.delete(id);
      await this.fallbackRepo.delete(id);
      return true;
    } catch {
      return this.fallbackRepo.delete(id);
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class StockAlertService {
  private readonly repository: StockAlertsRepository;
  private readonly storageKey = 'cal_sarda_stock_alerts';
  private readonly isBrowser: boolean;

  readonly subscriptions = signal<StockAlertSubscription[]>([]);
  readonly activeAlertProduct = signal<StoreProduct | null>(null);
  readonly lastRestockAlert = signal<RestockAlertEvent | null>(null);

  private readonly notificationService?: NotificationService;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    @Optional() @Inject(STOCK_ALERTS_REPOSITORY) repository?: StockAlertsRepository,
    @Optional() @Inject(SUPABASE_CLIENT) supabaseClient?: SupabaseClient | null,
    @Optional() notificationService?: NotificationService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.notificationService = notificationService ?? undefined;

    let initialSubs: StockAlertSubscription[] = [];
    if (this.isBrowser) {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            initialSubs = parsed;
          }
        }
      } catch {
        // Fallback
      }
    }

    if (repository) {
      this.repository = repository;
    } else if (supabaseClient) {
      this.repository = new SupabaseStockAlertsRepository(
        supabaseClient,
        new InMemoryStockAlertsRepository(initialSubs),
      );
    } else {
      this.repository = new InMemoryStockAlertsRepository(initialSubs);
    }

    this.subscriptions.set(initialSubs);
    this.syncFromRepository();
  }

  private async syncFromRepository(): Promise<void> {
    try {
      const fromRepo = await this.repository.getAll();
      if (fromRepo && fromRepo.length > 0) {
        this.subscriptions.set(fromRepo);
        this.persistToStorage(fromRepo);
      }
    } catch {
      // Ignorar fallo
    }
  }

  getRepository(): StockAlertsRepository {
    return this.repository;
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
    this.repository.save(newSubscription).catch(() => {});

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

    for (const sub of pendingList) {
      this.repository
        .update(sub.id, {
          status: 'notified',
          notifiedAt: timestamp,
          productName: productName || sub.productName,
        })
        .catch(() => {});
    }

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
    this.repository.delete(id).catch(() => {});
  }

  clearSubscriptions(): void {
    const toDelete = [...this.subscriptions()];
    this.subscriptions.set([]);
    if (this.isBrowser) {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {
        // Ignorar fallos de acceso
      }
    }
    for (const sub of toDelete) {
      this.repository.delete(sub.id).catch(() => {});
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
