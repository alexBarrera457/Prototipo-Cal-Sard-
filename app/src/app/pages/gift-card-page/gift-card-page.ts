import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GiftCardsService, type GiftCardRecord } from '../../services/gift-cards';
import { I18nService } from '../../services/i18n';

@Component({
  selector: 'app-gift-card-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './gift-card-page.html',
  styleUrl: './gift-card-page.css',
})
export class GiftCardPage {
  readonly giftCardsService = inject(GiftCardsService);
  readonly i18n = inject(I18nService);

  readonly activeTab = signal<'buy' | 'check'>('buy');

  // Valores predefinidos de saldo
  readonly presetAmounts = [25, 50, 75, 100];
  readonly selectedAmount = signal<number>(50);
  readonly customAmountInput = signal<string>('');

  // Formulario
  senderName = '';
  senderEmail = '';
  recipientName = '';
  recipientEmail = '';
  deliveryDate = '';
  dedication = '';

  // Estado de compra
  readonly isPurchased = signal<boolean>(false);
  readonly createdCard = signal<GiftCardRecord | null>(null);

  // Consulta de saldo
  checkCodeInput = '';
  readonly balanceCheckResult = signal<{
    checked: boolean;
    valid: boolean;
    balance: number;
    message?: string;
    card?: GiftCardRecord;
  }>({
    checked: false,
    valid: false,
    balance: 0,
  });

  readonly toastMessage = signal<string | null>(null);

  readonly currentAmount = computed<number>(() => {
    const custom = parseFloat(this.customAmountInput());
    if (!isNaN(custom) && custom >= 10) {
      return custom;
    }
    return this.selectedAmount();
  });

  selectPreset(amount: number): void {
    this.selectedAmount.set(amount);
    this.customAmountInput.set('');
  }

  onCustomAmountChange(val: string): void {
    this.customAmountInput.set(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 10) {
      this.selectedAmount.set(num);
    }
  }

  setTab(tab: 'buy' | 'check'): void {
    this.activeTab.set(tab);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  showToast(text: string): void {
    this.toastMessage.set(text);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  copyCode(code: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    this.showToast(this.i18n.t('gift_card.copied_toast'));
  }

  printCard(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  submitPurchase(): void {
    if (!this.recipientName.trim() || !this.recipientEmail.trim() || !this.senderName.trim()) {
      this.showToast('Por favor, completa los campos obligatorios (*).');
      return;
    }

    const card = this.giftCardsService.createGiftCard({
      amount: this.currentAmount(),
      senderName: this.senderName,
      senderEmail: this.senderEmail || undefined,
      recipientName: this.recipientName,
      recipientEmail: this.recipientEmail,
      dedication: this.dedication || undefined,
      deliveryDate: this.deliveryDate || undefined,
    });

    this.createdCard.set(card);
    this.isPurchased.set(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetPurchase(): void {
    this.isPurchased.set(false);
    this.createdCard.set(null);
    this.recipientName = '';
    this.recipientEmail = '';
    this.dedication = '';
  }

  checkBalance(): void {
    const code = this.checkCodeInput.trim().toUpperCase();
    if (!code) {
      this.balanceCheckResult.set({
        checked: true,
        valid: false,
        balance: 0,
        message: 'Introduce un código de tarjeta regalo.',
      });
      return;
    }

    const res = this.giftCardsService.checkBalance(code);
    this.balanceCheckResult.set({
      checked: true,
      valid: res.valid,
      balance: res.balance,
      message: res.message,
      card: res.card,
    });
  }
}
