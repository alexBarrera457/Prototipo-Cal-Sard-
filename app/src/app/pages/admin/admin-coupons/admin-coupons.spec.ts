import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { AdminCoupons } from './admin-coupons';
import { CouponsService } from '../../../services/coupons';
import { I18nService } from '../../../services/i18n';

describe('AdminCoupons', () => {
  let component: AdminCoupons;
  let fixture: ComponentFixture<AdminCoupons>;
  let couponsService: CouponsService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminCoupons],
      providers: [CouponsService, I18nService, { provide: PLATFORM_ID, useValue: 'browser' }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCoupons);
    component = fixture.componentInstance;
    couponsService = TestBed.inject(CouponsService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates the component and renders initial coupons', () => {
    expect(component).toBeTruthy();
    expect(component.filteredCoupons().length).toBeGreaterThan(0);
    expect(component.totalActive()).toBeGreaterThan(0);
  });

  it('filters coupons by search query and status filter', () => {
    component.onSearchChange('BENVINGUTS');
    expect(component.filteredCoupons().length).toBe(1);
    expect(component.filteredCoupons()[0].code).toBe('BENVINGUTS10');

    component.clearSearch();
    expect(component.filteredCoupons().length).toBe(couponsService.coupons().length);

    component.setStatusFilter('inactivos');
    const inactiveCount = couponsService.coupons().filter((c) => !c.isActive).length;
    expect(component.filteredCoupons().length).toBe(inactiveCount);
  });

  it('opens and closes create coupon modal', () => {
    component.openCreateModal();
    expect(component.modalOpen()).toBe(true);
    expect(component.editingCoupon()).toBeNull();

    component.closeModal();
    expect(component.modalOpen()).toBe(false);
  });

  it('creates a new coupon successfully', () => {
    component.openCreateModal();
    component.formCode = 'FIESTA20';
    component.formDescription = '20% por fiestas de barrio';
    component.formDiscountType = 'percentage';
    component.formDiscountValue = 20;
    component.formMinPurchase = 30;

    component.saveCoupon();

    expect(component.modalOpen()).toBe(false);
    expect(couponsService.getCouponByCode('FIESTA20')).toBeDefined();
    expect(component.toastMessage()).toContain('FIESTA20 creado');
  });

  it('edits an existing coupon', () => {
    const existing = couponsService.getCouponByCode('BENVINGUTS10')!;
    component.openEditModal(existing);
    expect(component.editingCoupon()?.id).toBe(existing.id);

    component.formDiscountValue = 12;
    component.saveCoupon();

    expect(couponsService.getCouponByCode('BENVINGUTS10')?.discountValue).toBe(12);
  });

  it('toggles coupon active status', () => {
    const coupon = couponsService.getCouponByCode('BENVINGUTS10')!;
    const previousState = coupon.isActive;

    component.toggleStatus(coupon);

    const updated = couponsService.getCouponByCode('BENVINGUTS10')!;
    expect(updated.isActive).toBe(!previousState);
  });

  it('deletes coupon after confirmation', () => {
    const coupon = couponsService.getCouponByCode('COLMADO5')!;
    component.openDeleteConfirm(coupon);
    expect(component.deletingCoupon()?.code).toBe('COLMADO5');

    component.executeDelete();

    expect(couponsService.getCouponByCode('COLMADO5')).toBeUndefined();
    expect(component.deletingCoupon()).toBeNull();
  });
});
