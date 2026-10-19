import { Inject, Injectable, InjectionToken, Optional, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Coupon, CouponDiscountType } from '@cal-sarda/domain';
import { SUPABASE_CLIENT, type SupabaseClient } from './supabase';

export type { Coupon, CouponDiscountType };

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  error?: string;
}

export const COUPONS_REPOSITORY = new InjectionToken<CouponsRepository>('COUPONS_REPOSITORY');

export interface CouponsRepository {
  getAll(): Promise<Coupon[]>;
  save(coupon: Coupon): Promise<Coupon>;
  update(id: string, updates: Partial<Coupon>): Promise<Coupon | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryCouponsRepository implements CouponsRepository {
  private coupons: Coupon[];

  constructor(initialCoupons: Coupon[] = INITIAL_COUPONS) {
    this.coupons = initialCoupons.map((c) => ({ ...c }));
  }

  async getAll(): Promise<Coupon[]> {
    return [...this.coupons];
  }

  async save(coupon: Coupon): Promise<Coupon> {
    const idx = this.coupons.findIndex((c) => c.id === coupon.id || c.code === coupon.code);
    if (idx >= 0) {
      this.coupons[idx] = { ...coupon };
    } else {
      this.coupons.unshift({ ...coupon });
    }
    return { ...coupon };
  }

  async update(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    const idx = this.coupons.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.coupons[idx] = { ...this.coupons[idx], ...updates };
    return { ...this.coupons[idx] };
  }

  async delete(id: string): Promise<boolean> {
    const prev = this.coupons.length;
    this.coupons = this.coupons.filter((c) => c.id !== id);
    return this.coupons.length !== prev;
  }
}

export class SupabaseCouponsRepository implements CouponsRepository {
  private readonly fallbackRepo: CouponsRepository;

  constructor(
    private readonly supabase?: SupabaseClient | null,
    fallbackRepo?: CouponsRepository,
  ) {
    this.fallbackRepo = fallbackRepo ?? new InMemoryCouponsRepository();
  }

  async getAll(): Promise<Coupon[]> {
    if (!this.supabase) return this.fallbackRepo.getAll();
    try {
      const { data, error } = await this.supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return this.fallbackRepo.getAll();
      return data.map((d: any) => ({
        id: d.id,
        code: d.code,
        description: d.description,
        discountType: d.discount_type as CouponDiscountType,
        discountValue: Number(d.discount_value),
        minPurchase: Number(d.min_purchase),
        expiresAt: d.expires_at ?? undefined,
        isActive: d.is_active,
        usageCount: Number(d.usage_count),
        createdAt: d.created_at,
      }));
    } catch {
      return this.fallbackRepo.getAll();
    }
  }

  async save(coupon: Coupon): Promise<Coupon> {
    if (!this.supabase) return this.fallbackRepo.save(coupon);
    try {
      const payload: Record<string, any> = {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        min_purchase: coupon.minPurchase,
        expires_at: coupon.expiresAt ?? null,
        is_active: coupon.isActive,
        usage_count: coupon.usageCount,
        created_at: coupon.createdAt,
      };
      const { error } = await this.supabase.from('coupons').upsert(payload);
      if (error) return this.fallbackRepo.save(coupon);
      await this.fallbackRepo.save(coupon);
      return coupon;
    } catch {
      return this.fallbackRepo.save(coupon);
    }
  }

  async update(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    if (!this.supabase) return this.fallbackRepo.update(id, updates);
    try {
      const payload: Record<string, any> = {};
      if (updates.code !== undefined) payload['code'] = updates.code;
      if (updates.description !== undefined) payload['description'] = updates.description;
      if (updates.discountType !== undefined) payload['discount_type'] = updates.discountType;
      if (updates.discountValue !== undefined) payload['discount_value'] = updates.discountValue;
      if (updates.minPurchase !== undefined) payload['min_purchase'] = updates.minPurchase;
      if (updates.expiresAt !== undefined) payload['expires_at'] = updates.expiresAt;
      if (updates.isActive !== undefined) payload['is_active'] = updates.isActive;
      if (updates.usageCount !== undefined) payload['usage_count'] = updates.usageCount;

      const { data, error } = await this.supabase
        .from('coupons')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) return this.fallbackRepo.update(id, updates);
      await this.fallbackRepo.update(id, updates);
      return {
        id: data.id,
        code: data.code,
        description: data.description,
        discountType: data.discount_type as CouponDiscountType,
        discountValue: Number(data.discount_value),
        minPurchase: Number(data.min_purchase),
        expiresAt: data.expires_at ?? undefined,
        isActive: data.is_active,
        usageCount: Number(data.usage_count),
        createdAt: data.created_at,
      };
    } catch {
      return this.fallbackRepo.update(id, updates);
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.supabase) return this.fallbackRepo.delete(id);
    try {
      const { error } = await this.supabase.from('coupons').delete().eq('id', id);
      if (error) return this.fallbackRepo.delete(id);
      await this.fallbackRepo.delete(id);
      return true;
    } catch {
      return this.fallbackRepo.delete(id);
    }
  }
}

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'BENVINGUTS10',
    description: '10% de benvinguda al colmado Cal Sardà',
    discountType: 'percentage',
    discountValue: 10,
    minPurchase: 20,
    expiresAt: '2027-12-31',
    isActive: true,
    usageCount: 14,
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'coupon-2',
    code: 'NADAL2026',
    description: '15% de descompte campanya de festes de Nadal',
    discountType: 'percentage',
    discountValue: 15,
    minPurchase: 50,
    expiresAt: '2026-12-31',
    isActive: true,
    usageCount: 28,
    createdAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'coupon-3',
    code: 'COLMADO5',
    description: '5 € de descompte directe en compres a partir de 35 €',
    discountType: 'fixed',
    discountValue: 5,
    minPurchase: 35,
    expiresAt: '2027-06-30',
    isActive: true,
    usageCount: 8,
    createdAt: '2026-03-05T10:00:00.000Z',
  },
  {
    id: 'coupon-4',
    code: 'SAGRADA20',
    description: '20% especial veïns de la Sagrada Família',
    discountType: 'percentage',
    discountValue: 20,
    minPurchase: 60,
    expiresAt: '2027-04-30',
    isActive: true,
    usageCount: 5,
    createdAt: '2026-03-12T10:00:00.000Z',
  },
  {
    id: 'coupon-5',
    code: 'EXPIRED20',
    description: 'Cupó de prova caducat',
    discountType: 'percentage',
    discountValue: 20,
    minPurchase: 30,
    expiresAt: '2024-01-01',
    isActive: true,
    usageCount: 3,
    createdAt: '2023-10-01T10:00:00.000Z',
  },
];

const STORAGE_KEY = 'cal_sarda_coupons';

@Injectable({
  providedIn: 'root',
})
export class CouponsService {
  private readonly repository: CouponsRepository;
  private readonly isBrowser: boolean;
  readonly coupons = signal<Coupon[]>([]);

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    @Optional() @Inject(COUPONS_REPOSITORY) repository?: CouponsRepository,
    @Optional() @Inject(SUPABASE_CLIENT) supabaseClient?: SupabaseClient | null,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    let initialCoupons = INITIAL_COUPONS;
    if (this.isBrowser) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Coupon[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialCoupons = parsed;
          }
        }
      } catch {
        // Fallback en caso de error en localStorage
      }
    }

    if (repository) {
      this.repository = repository;
    } else if (supabaseClient) {
      this.repository = new SupabaseCouponsRepository(
        supabaseClient,
        new InMemoryCouponsRepository(initialCoupons),
      );
    } else {
      this.repository = new InMemoryCouponsRepository(initialCoupons);
    }

    this.coupons.set(initialCoupons.map((c) => ({ ...c })));
    this.syncFromRepository();
  }

  private async syncFromRepository(): Promise<void> {
    try {
      const remote = await this.repository.getAll();
      if (remote && remote.length > 0) {
        this.coupons.set(remote);
        this.persist();
      }
    } catch {
      // Usar estado actual
    }
  }

  getRepository(): CouponsRepository {
    return this.repository;
  }

  private loadCoupons(): void {
    this.syncFromRepository();
  }

  private persist(): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.coupons()));
      } catch {
        // Ignorar fallo de almacenamiento
      }
    }
  }

  getCoupons(): Coupon[] {
    return this.coupons();
  }

  getCouponByCode(code: string): Coupon | undefined {
    const clean = code.trim().toUpperCase();
    return this.coupons().find((c) => c.code.toUpperCase() === clean);
  }

  validateCoupon(code: string, subtotal: number): CouponValidationResult {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'Introduce un código de cupón.',
      };
    }

    const coupon = this.getCouponByCode(clean);
    if (!coupon) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'El cupón introducido no es válido o no existe.',
      };
    }

    if (!coupon.isActive) {
      return {
        valid: false,
        coupon,
        discountAmount: 0,
        error: 'Este cupón se encuentra inactivo actualmente.',
      };
    }

    if (coupon.expiresAt) {
      const expiry = new Date(coupon.expiresAt);
      // Validar si la fecha está en el pasado (al final del día de expiración)
      expiry.setHours(23, 59, 59, 999);
      if (expiry.getTime() < Date.now()) {
        return {
          valid: false,
          coupon,
          discountAmount: 0,
          error: 'Este cupón promocional ha caducado.',
        };
      }
    }

    if (coupon.minPurchase > 0 && subtotal < coupon.minPurchase) {
      return {
        valid: false,
        coupon,
        discountAmount: 0,
        error: `Este cupón requiere una compra mínima de ${coupon.minPurchase.toFixed(2)} € (subtotal actual: ${subtotal.toFixed(2)} €).`,
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round(((subtotal * coupon.discountValue) / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(subtotal, coupon.discountValue);
    }

    return {
      valid: true,
      coupon,
      discountAmount,
    };
  }

  createCoupon(
    input: Omit<Coupon, 'id' | 'usageCount' | 'createdAt'> & { id?: string; usageCount?: number },
  ): Coupon {
    const newCoupon: Coupon = {
      id: input.id || `coupon-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: input.code.trim().toUpperCase(),
      description: input.description?.trim() || '',
      discountType: input.discountType,
      discountValue: Math.max(0, Number(input.discountValue)),
      minPurchase: Math.max(0, Number(input.minPurchase || 0)),
      expiresAt: input.expiresAt || undefined,
      isActive: input.isActive ?? true,
      usageCount: input.usageCount ?? 0,
      createdAt: new Date().toISOString(),
    };

    this.coupons.update((current) => [newCoupon, ...current]);
    this.persist();
    this.repository.save(newCoupon).catch(() => {});
    return newCoupon;
  }

  updateCoupon(id: string, updates: Partial<Coupon>): Coupon | undefined {
    let updatedCoupon: Coupon | undefined;

    this.coupons.update((current) =>
      current.map((c) => {
        if (c.id === id) {
          updatedCoupon = {
            ...c,
            ...updates,
            code: updates.code ? updates.code.trim().toUpperCase() : c.code,
            discountValue:
              updates.discountValue !== undefined
                ? Math.max(0, Number(updates.discountValue))
                : c.discountValue,
            minPurchase:
              updates.minPurchase !== undefined
                ? Math.max(0, Number(updates.minPurchase))
                : c.minPurchase,
          };
          return updatedCoupon;
        }
        return c;
      }),
    );

    if (updatedCoupon) {
      this.persist();
      this.repository.update(id, updates).catch(() => {});
    }
    return updatedCoupon;
  }

  deleteCoupon(id: string): boolean {
    const prevLen = this.coupons().length;
    this.coupons.update((current) => current.filter((c) => c.id !== id));
    const changed = this.coupons().length !== prevLen;
    if (changed) {
      this.persist();
      this.repository.delete(id).catch(() => {});
    }
    return changed;
  }

  toggleStatus(id: string): void {
    this.coupons.update((current) =>
      current.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)),
    );
    this.persist();
    const target = this.coupons().find((c) => c.id === id);
    if (target) {
      this.repository.update(id, { isActive: target.isActive }).catch(() => {});
    }
  }

  incrementUsage(code: string): void {
    const clean = code.trim().toUpperCase();
    this.coupons.update((current) =>
      current.map((c) =>
        c.code.toUpperCase() === clean ? { ...c, usageCount: c.usageCount + 1 } : c,
      ),
    );
    this.persist();
    const target = this.getCouponByCode(clean);
    if (target) {
      this.repository.update(target.id, { usageCount: target.usageCount }).catch(() => {});
    }
  }

  resetToDefaults(): void {
    this.coupons.set(INITIAL_COUPONS.map((c) => ({ ...c })));
    this.persist();
    for (const c of INITIAL_COUPONS) {
      this.repository.save(c).catch(() => {});
    }
  }
}
