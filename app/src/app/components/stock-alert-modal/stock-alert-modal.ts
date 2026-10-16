import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../services/i18n';
import { AuthService } from '../../services/auth';
import { StockAlertChannel, StockAlertService } from '../../services/stock-alerts';
import type { StoreProduct } from '../../services/products';

@Component({
  selector: 'app-stock-alert-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-alert-modal.html',
  styleUrl: './stock-alert-modal.css',
})
export class StockAlertModalComponent {
  readonly i18n = inject(I18nService);
  readonly stockAlertService = inject(StockAlertService);
  readonly auth = inject(AuthService, { optional: true });

  readonly selectedChannel = signal<StockAlertChannel>('whatsapp');
  contactValue = '';
  customerName = '';
  readonly isSubmitting = signal<boolean>(false);
  readonly submissionState = signal<'idle' | 'success' | 'duplicate' | 'error'>('idle');
  readonly errorMessage = signal<string>('');

  constructor() {
    effect(() => {
      const active = this.stockAlertService.activeAlertProduct();
      if (active) {
        this.resetForm(active);
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.stockAlertService.activeAlertProduct()) {
      this.closeModal();
    }
  }

  private resetForm(_product: StoreProduct): void {
    this.submissionState.set('idle');
    this.errorMessage.set('');
    this.isSubmitting.set(false);

    const user = this.auth?.currentUser();
    if (user) {
      this.customerName = user.name || '';
      const prefChannel = user.preferences?.preferredChannel;
      if (prefChannel === 'email') {
        this.selectedChannel.set('email');
        this.contactValue = user.email || '';
      } else {
        this.selectedChannel.set('whatsapp');
        this.contactValue = user.phone || '';
      }
    } else {
      this.customerName = '';
      this.contactValue = '';
      this.selectedChannel.set('whatsapp');
    }
  }

  setChannel(channel: StockAlertChannel): void {
    this.selectedChannel.set(channel);
    this.errorMessage.set('');

    const user = this.auth?.currentUser();
    if (user) {
      if (channel === 'email' && user.email) {
        this.contactValue = user.email;
      } else if (channel === 'whatsapp' && user.phone) {
        this.contactValue = user.phone;
      }
    }
  }

  closeModal(): void {
    this.stockAlertService.closeAlertModal();
    this.submissionState.set('idle');
  }

  async submitAlert(): Promise<void> {
    const product = this.stockAlertService.activeAlertProduct();
    if (!product) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const channel = this.selectedChannel();
    const contact = this.contactValue.trim();

    if (!this.stockAlertService.validateContact(contact, channel)) {
      this.isSubmitting.set(false);
      this.submissionState.set('error');
      this.errorMessage.set(this.i18n.t('stock_alert.error_invalid_contact'));
      return;
    }

    const res = this.stockAlertService.subscribe({
      productNumber: product.number,
      productName: product.name,
      contact,
      channel,
      customerName: this.customerName.trim() || undefined,
    });

    this.isSubmitting.set(false);

    if (res.isDuplicate) {
      this.submissionState.set('duplicate');
    } else if (res.success) {
      this.submissionState.set('success');
    } else {
      this.submissionState.set('error');
      this.errorMessage.set(this.i18n.t('stock_alert.error_invalid_contact'));
    }
  }

  getSuccessMessage(): string {
    const channelName =
      this.selectedChannel() === 'whatsapp'
        ? this.i18n.t('stock_alert.channel_whatsapp')
        : this.i18n.t('stock_alert.channel_email');
    return this.i18n.t('stock_alert.success_msg').replace('{channel}', channelName);
  }
}
