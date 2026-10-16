import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Coupon, CouponDiscountType } from '@cal-sarda/domain';

export type { Coupon, CouponDiscountType };

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  error?: string;
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
  private readonly isBrowser: boolean;
  readonly coupons = signal<Coupon[]>([]);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.loadCoupons();
  }

  private loadCoupons(): void {
    if (this.isBrowser) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Coupon[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.coupons.set(parsed);
            return;
          }
        }
      } catch {
        // Fallback en caso de error en localStorage
      }
    }
    this.coupons.set(INITIAL_COUPONS.map((c) => ({ ...c })));
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
    }
    return updatedCoupon;
  }

  deleteCoupon(id: string): boolean {
    const prevLen = this.coupons().length;
    this.coupons.update((current) => current.filter((c) => c.id !== id));
    const changed = this.coupons().length !== prevLen;
    if (changed) {
      this.persist();
    }
    return changed;
  }

  toggleStatus(id: string): void {
    this.coupons.update((current) =>
      current.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)),
    );
    this.persist();
  }

  incrementUsage(code: string): void {
    const clean = code.trim().toUpperCase();
    this.coupons.update((current) =>
      current.map((c) =>
        c.code.toUpperCase() === clean ? { ...c, usageCount: c.usageCount + 1 } : c,
      ),
    );
    this.persist();
  }

  resetToDefaults(): void {
    this.coupons.set(INITIAL_COUPONS.map((c) => ({ ...c })));
    this.persist();
  }
}
