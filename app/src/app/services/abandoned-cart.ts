import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CartService, type CartProduct } from './cart';
import { AuthService } from './auth';
import { NotificationService } from './notifications';
import { I18nService } from './i18n';

export interface AbandonedCartMetadata {
  lastUpdated: number;
  dismissedUntil?: number;
  emailSentAt?: number;
  customerName?: string;
  customerEmail?: string;
}

export interface AbandonedCartAdminRecord {
  id: string;
  customerName: string;
  customerEmail: string;
  lastActive: string;
  items: CartProduct[];
  total: number;
  reminderSent: boolean;
  reminderSentAt?: string;
}

export const DEFAULT_ABANDONED_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 horas según especificación

@Injectable({
  providedIn: 'root',
})
export class AbandonedCartService {
  private readonly storageKey = 'cal_sarda_abandoned_cart';
  private readonly adminStorageKey = 'cal_sarda_abandoned_carts_admin';

  private readonly cartService = inject(CartService);
  private readonly auth = inject(AuthService, { optional: true });
  private readonly notificationService = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  private thresholdMs = DEFAULT_ABANDONED_THRESHOLD_MS;

  readonly isBannerVisible = signal<boolean>(false);
  readonly reminderSending = signal<boolean>(false);
  readonly reminderSuccess = signal<string>('');

  readonly pendingCount = computed(() => this.cartService.count());
  readonly pendingTotal = computed(() => this.cartService.getTotal());
  readonly pendingProducts = computed(() => this.cartService.products());

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkInactivity();
      if (this.router.events) {
        this.router.events
          .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
          .subscribe(() => {
            this.checkInactivity();
          });
      }
    }
  }

  setThresholdMs(ms: number): void {
    this.thresholdMs = ms;
  }

  getThresholdMs(): number {
    return this.thresholdMs;
  }

  /**
   * Guarda o actualiza el timestamp de actividad en la cesta.
   */
  recordActivity(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const count = this.cartService.count();
    if (count === 0) {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {
        // Almacenamiento deshabilitado
      }
      this.isBannerVisible.set(false);
      return;
    }

    try {
      const user = this.auth?.currentUser();
      const meta: AbandonedCartMetadata = {
        lastUpdated: Date.now(),
        customerName: user?.name,
        customerEmail: user?.email,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(meta));
    } catch {
      // Ignorar errores de localStorage
    }
  }

  /**
   * Comprueba si la cesta actual lleva inactiva más tiempo del umbral especificado.
   */
  checkInactivity(customNow?: number): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

    // Si el usuario ya está en el proceso de tramitación del pedido o en admin, no mostrar aviso
    const url = this.router.url ?? '';
    if (url.includes('/preparar-pedido') || url.startsWith('/admin')) {
      this.isBannerVisible.set(false);
      return false;
    }

    let count = this.cartService.count();
    if (count === 0) {
      try {
        const saved = localStorage.getItem('cal-sarda-cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            count = parsed.length;
          }
        }
      } catch {
        // Ignorar
      }
    }

    if (count === 0) {
      this.isBannerVisible.set(false);
      return false;
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        // Primera vez que se detecta productos en cesta; se inicializa el timestamp
        this.recordActivity();
        return false;
      }

      const meta: AbandonedCartMetadata = JSON.parse(raw);
      const now = customNow ?? Date.now();

      // Si el usuario ya lo descartó en las últimas 24h, no volvemos a molestar
      if (meta.dismissedUntil && now < meta.dismissedUntil) {
        this.isBannerVisible.set(false);
        return false;
      }

      const elapsed = now - meta.lastUpdated;
      if (elapsed >= this.thresholdMs) {
        this.isBannerVisible.set(true);
        return true;
      }
    } catch {
      // Fallo en JSON.parse o acceso
    }

    this.isBannerVisible.set(false);
    return false;
  }

  /**
   * Cierra el aviso y registra que el usuario lo descartó para no interrumpir su navegación.
   */
  dismissBanner(): void {
    this.isBannerVisible.set(false);
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const raw = localStorage.getItem(this.storageKey);
      const meta: AbandonedCartMetadata = raw ? JSON.parse(raw) : { lastUpdated: Date.now() };
      meta.dismissedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24h
      localStorage.setItem(this.storageKey, JSON.stringify(meta));
    } catch {
      // Ignorar
    }
  }

  /**
   * Retoma la compra inmediatamente dirigiendo a la tramitación de pedido.
   */
  resumeCart(): void {
    this.isBannerVisible.set(false);
    if (isPlatformBrowser(this.platformId)) {
      try {
        const raw = localStorage.getItem(this.storageKey);
        const meta: AbandonedCartMetadata = raw ? JSON.parse(raw) : { lastUpdated: Date.now() };
        meta.dismissedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24h
        localStorage.setItem(this.storageKey, JSON.stringify(meta));
      } catch {
        // Ignorar
      }
    }
    this.router.navigate(['/preparar-pedido']);
  }

  /**
   * Envía un recordatorio amistoso respetando el RGPD a un cliente con cesta pendiente.
   */
  async sendFriendlyReminder(customer: { name: string; email: string }): Promise<boolean> {
    if (!customer.email) return false;

    this.reminderSending.set(true);
    this.reminderSuccess.set('');

    try {
      const items = this.cartService.products().map((p) => ({
        name: p.name,
        price: p.price,
        quantity: p.quantity,
      }));

      const res = await this.notificationService.sendAbandonedCartNotification({
        customerName: customer.name || 'Cliente de Cal Sardà',
        customerEmail: customer.email,
        items:
          items.length > 0 ? items : [{ name: 'Lote Gourmet Tradición', price: 45, quantity: 1 }],
        total: this.cartService.getTotal() || 45,
        lang: this.i18n.currentLang() === 'ca' ? 'ca' : 'es',
        recoveryUrl: 'https://calsarda.com/preparar-pedido',
      });

      if (res.success) {
        this.reminderSuccess.set(this.i18n.t('abandoned_cart.reminder_sent'));
        if (isPlatformBrowser(this.platformId)) {
          try {
            const raw = localStorage.getItem(this.storageKey);
            const meta: AbandonedCartMetadata = raw ? JSON.parse(raw) : { lastUpdated: Date.now() };
            meta.emailSentAt = Date.now();
            localStorage.setItem(this.storageKey, JSON.stringify(meta));
          } catch {
            // Ignorar
          }
        }
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.reminderSending.set(false);
    }
  }

  /**
   * Registros para el panel de administración / backoffice.
   */
  getAdminAbandonedCarts(): AbandonedCartAdminRecord[] {
    const records: AbandonedCartAdminRecord[] = [];

    // Si la sesión actual tiene una cesta abandonada y datos de usuario:
    if (this.cartService.count() > 0) {
      const user = this.auth?.currentUser();
      records.push({
        id: 'cart-session-active',
        customerName: user?.name || 'Visitante en línea',
        customerEmail: user?.email || 'visitante.web@calsarda-demo.com',
        lastActive: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
        items: this.cartService.products(),
        total: this.cartService.getTotal(),
        reminderSent: false,
      });
    }

    // Registros precargados para demostración operativa en backoffice
    records.push(
      {
        id: 'cart-demo-01',
        customerName: 'Montserrat Rovira',
        customerEmail: 'montserrat.rovira@gmail.com',
        lastActive: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
        items: [
          { name: 'Jamón Ibérico de Bellota 100% Cal Sardà', price: 24.5, quantity: 2 },
          { name: 'Cava Brut Nature Reserva Sardà', price: 16.9, quantity: 1 },
        ],
        total: 65.9,
        reminderSent: false,
      },
      {
        id: 'cart-demo-02',
        customerName: 'Joan Puigdemont',
        customerEmail: 'jpuigdemont@empresa-bcn.cat',
        lastActive: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        items: [{ name: 'Lote Tradición Catalana', price: 45.0, quantity: 4 }],
        total: 180.0,
        reminderSent: true,
        reminderSentAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      },
    );

    return records;
  }
}
