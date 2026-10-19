import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { CouponsService, INITIAL_COUPONS } from './coupons';

describe('CouponsService', () => {
  let service: CouponsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [CouponsService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(CouponsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be initialized with default coupons', () => {
    const list = service.getCoupons();
    expect(list.length).toBeGreaterThan(0);
    expect(service.getCouponByCode('BENVINGUTS10')).toBeDefined();
    expect(service.getCouponByCode('benvinguts10')).toBeDefined(); // case insensitive
  });

  it('should validate an active valid percentage coupon correctly', () => {
    const res = service.validateCoupon('BENVINGUTS10', 40);
    expect(res.valid).toBe(true);
    expect(res.coupon?.code).toBe('BENVINGUTS10');
    expect(res.discountAmount).toBe(4); // 10% of 40 = 4.00€
    expect(res.error).toBeUndefined();
  });

  it('should validate an active valid fixed amount coupon correctly', () => {
    const res = service.validateCoupon('COLMADO5', 40);
    expect(res.valid).toBe(true);
    expect(res.coupon?.code).toBe('COLMADO5');
    expect(res.discountAmount).toBe(5); // 5€ fixed
  });

  it('should reject coupon when minPurchase is not met', () => {
    const res = service.validateCoupon('BENVINGUTS10', 10); // min is 20
    expect(res.valid).toBe(false);
    expect(res.error).toContain('compra mínima');
    expect(res.discountAmount).toBe(0);
  });

  it('should reject expired coupons', () => {
    const res = service.validateCoupon('EXPIRED20', 100);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('caducado');
  });

  it('should reject inactive coupons', () => {
    const coupon = service.getCouponByCode('BENVINGUTS10');
    service.toggleStatus(coupon!.id);

    const res = service.validateCoupon('BENVINGUTS10', 50);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('inactivo');
  });

  it('should reject non-existent or blank coupon codes', () => {
    const blank = service.validateCoupon('   ', 50);
    expect(blank.valid).toBe(false);

    const nonExistent = service.validateCoupon('INVENTADO99', 50);
    expect(nonExistent.valid).toBe(false);
    expect(nonExistent.error).toContain('no es válido o no existe');
  });

  it('should create, update, toggle and delete coupons', () => {
    const created = service.createCoupon({
      code: 'TEST25',
      description: 'Cupón de test 25%',
      discountType: 'percentage',
      discountValue: 25,
      minPurchase: 10,
      isActive: true,
    });

    expect(created.code).toBe('TEST25');
    expect(service.getCouponByCode('TEST25')).toBeDefined();

    service.updateCoupon(created.id, { discountValue: 30 });
    expect(service.getCouponByCode('TEST25')?.discountValue).toBe(30);

    service.toggleStatus(created.id);
    expect(service.getCouponByCode('TEST25')?.isActive).toBe(false);

    service.deleteCoupon(created.id);
    expect(service.getCouponByCode('TEST25')).toBeUndefined();
  });

  it('should increment usage count', () => {
    const initialUsage = service.getCouponByCode('COLMADO5')?.usageCount || 0;
    service.incrementUsage('COLMADO5');
    expect(service.getCouponByCode('COLMADO5')?.usageCount).toBe(initialUsage + 1);
  });
});

describe('SupabaseCouponsRepository', () => {
  it('reads and saves coupons to Supabase table and falls back on error', async () => {
    const couponsDb: any[] = [];
    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          order: async () => ({
            data: couponsDb,
            error: null,
          }),
        }),
        upsert: async (payload: any) => {
          couponsDb.push(payload);
          return { error: null };
        },
        update: (payload: any) => ({
          eq: (col: string, val: any) => ({
            select: () => ({
              single: async () => {
                const found = couponsDb.find((c) => c[col] === val);
                if (found) Object.assign(found, payload);
                return { data: found, error: null };
              },
            }),
          }),
        }),
        delete: () => ({
          eq: async (_col: string, val: any) => {
            const idx = couponsDb.findIndex((c) => c.id === val);
            if (idx >= 0) couponsDb.splice(idx, 1);
            return { error: null };
          },
        }),
      }),
    };

    const repo = new (await import('./coupons')).SupabaseCouponsRepository(mockSupabase as any);

    const saved = await repo.save({
      id: 'coupon-remote-1',
      code: 'REMOTE15',
      description: 'Cupón remoto 15%',
      discountType: 'percentage',
      discountValue: 15,
      minPurchase: 30,
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    });

    expect(saved.code).toBe('REMOTE15');
    expect(couponsDb.length).toBe(1);

    const all = await repo.getAll();
    expect(all.length).toBe(1);
    expect(all[0].code).toBe('REMOTE15');

    const updated = await repo.update('coupon-remote-1', { discountValue: 20 });
    expect(updated?.discountValue).toBe(20);

    const deleted = await repo.delete('coupon-remote-1');
    expect(deleted).toBe(true);
    expect(couponsDb.length).toBe(0);
  });
});
