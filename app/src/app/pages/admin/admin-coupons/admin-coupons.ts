import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CouponsService, type Coupon, type CouponDiscountType } from '../../../services/coupons';
import { I18nService } from '../../../services/i18n';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin-coupons.html',
  styleUrl: './admin-coupons.css',
})
export class AdminCoupons {
  readonly couponsService = inject(CouponsService);
  readonly i18n = inject(I18nService);

  readonly searchQuery = signal<string>('');
  searchQueryModel = '';
  readonly statusFilter = signal<'todos' | 'activos' | 'inactivos'>('todos');
  readonly modalOpen = signal<boolean>(false);
  readonly editingCoupon = signal<Coupon | null>(null);
  readonly deletingCoupon = signal<Coupon | null>(null);
  readonly toastMessage = signal<string | null>(null);

  // Campos del formulario modal
  formCode = '';
  formDescription = '';
  formDiscountType: CouponDiscountType = 'percentage';
  formDiscountValue = 10;
  formMinPurchase = 0;
  formExpiresAt = '';
  formIsActive = true;
  formError = '';

  readonly filteredCoupons = computed(() => {
    const list = this.couponsService.coupons();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return list.filter((c) => {
      if (status === 'activos' && !c.isActive) return false;
      if (status === 'inactivos' && c.isActive) return false;

      if (query) {
        const matchesCode = c.code.toLowerCase().includes(query);
        const matchesDesc = (c.description || '').toLowerCase().includes(query);
        if (!matchesCode && !matchesDesc) return false;
      }

      return true;
    });
  });

  readonly totalActive = computed(() => {
    return this.couponsService.coupons().filter((c) => c.isActive).length;
  });

  readonly totalUsages = computed(() => {
    return this.couponsService.coupons().reduce((sum, c) => sum + (c.usageCount || 0), 0);
  });

  readonly mostUsedCoupon = computed(() => {
    const list = [...this.couponsService.coupons()];
    if (list.length === 0) return null;
    list.sort((a, b) => b.usageCount - a.usageCount);
    return list[0].usageCount > 0 ? list[0] : null;
  });

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }

  clearSearch(): void {
    this.searchQueryModel = '';
    this.searchQuery.set('');
  }

  setStatusFilter(filter: 'todos' | 'activos' | 'inactivos'): void {
    this.statusFilter.set(filter);
  }

  openCreateModal(): void {
    this.editingCoupon.set(null);
    this.formCode = '';
    this.formDescription = '';
    this.formDiscountType = 'percentage';
    this.formDiscountValue = 10;
    this.formMinPurchase = 0;
    this.formExpiresAt = '';
    this.formIsActive = true;
    this.formError = '';
    this.modalOpen.set(true);
  }

  openEditModal(coupon: Coupon): void {
    this.editingCoupon.set(coupon);
    this.formCode = coupon.code;
    this.formDescription = coupon.description || '';
    this.formDiscountType = coupon.discountType;
    this.formDiscountValue = coupon.discountValue;
    this.formMinPurchase = coupon.minPurchase || 0;
    this.formExpiresAt = coupon.expiresAt || '';
    this.formIsActive = coupon.isActive;
    this.formError = '';
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingCoupon.set(null);
    this.formError = '';
  }

  saveCoupon(): void {
    const code = this.formCode.trim().toUpperCase();
    if (!code) {
      this.formError = 'El código del cupón es obligatorio.';
      return;
    }

    if (this.formDiscountValue <= 0) {
      this.formError = 'El valor del descuento debe ser superior a 0.';
      return;
    }

    if (this.formDiscountType === 'percentage' && this.formDiscountValue > 100) {
      this.formError = 'El porcentaje de descuento no puede ser superior al 100%.';
      return;
    }

    const editing = this.editingCoupon();
    if (editing) {
      this.couponsService.updateCoupon(editing.id, {
        code,
        description: this.formDescription.trim(),
        discountType: this.formDiscountType,
        discountValue: this.formDiscountValue,
        minPurchase: this.formMinPurchase,
        expiresAt: this.formExpiresAt || undefined,
        isActive: this.formIsActive,
      });
      this.showToast(`Cupón ${code} actualizado con éxito.`);
    } else {
      // Validar duplicado de código
      const exists = this.couponsService.getCouponByCode(code);
      if (exists) {
        this.formError = `Ya existe un cupón con el código ${code}.`;
        return;
      }

      this.couponsService.createCoupon({
        code,
        description: this.formDescription.trim(),
        discountType: this.formDiscountType,
        discountValue: this.formDiscountValue,
        minPurchase: this.formMinPurchase,
        expiresAt: this.formExpiresAt || undefined,
        isActive: this.formIsActive,
      });
      this.showToast(`Cupón ${code} creado correctamente.`);
    }

    this.closeModal();
  }

  toggleStatus(coupon: Coupon): void {
    this.couponsService.toggleStatus(coupon.id);
    const updated = this.couponsService.coupons().find((c) => c.id === coupon.id);
    this.showToast(`Cupón ${coupon.code} ${updated?.isActive ? 'activado' : 'desactivado'}.`);
  }

  openDeleteConfirm(coupon: Coupon): void {
    this.deletingCoupon.set(coupon);
  }

  closeDeleteConfirm(): void {
    this.deletingCoupon.set(null);
  }

  executeDelete(): void {
    const target = this.deletingCoupon();
    if (target) {
      this.couponsService.deleteCoupon(target.id);
      this.showToast(`Cupón ${target.code} eliminado correctamente.`);
      this.closeDeleteConfirm();
    }
  }

  resetDefaults(): void {
    if (confirm('¿Restablecer los cupones a los valores de ejemplo de Cal Sardà?')) {
      this.couponsService.resetToDefaults();
      this.showToast('Cupones restablecidos a la configuración inicial.');
    }
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 3000);
  }

  isExpired(dateStr?: string): boolean {
    if (!dateStr) return false;
    const exp = new Date(dateStr);
    exp.setHours(23, 59, 59, 999);
    return exp.getTime() < Date.now();
  }
}
