import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbandonedCartService } from '../../services/abandoned-cart';
import { I18nService } from '../../services/i18n';

@Component({
  selector: 'app-abandoned-cart-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './abandoned-cart-banner.html',
  styleUrl: './abandoned-cart-banner.css',
})
export class AbandonedCartBannerComponent {
  readonly abandonedCart = inject(AbandonedCartService);
  readonly i18n = inject(I18nService);

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  }
}
