import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AbandonedCartService, DEFAULT_ABANDONED_THRESHOLD_MS } from './abandoned-cart';
import { CartService } from './cart';
import { NotificationService } from './notifications';
import { I18nService } from './i18n';
import { AuthService } from './auth';

describe('AbandonedCartService', () => {
  let service: AbandonedCartService;
  let cartService: CartService;
  let notificationService: NotificationService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AbandonedCartService,
        CartService,
        NotificationService,
        I18nService,
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ name: 'Test User', email: 'test@calsarda.cat' }),
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(AbandonedCartService);
    cartService = TestBed.inject(CartService);
    notificationService = TestBed.inject(NotificationService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe crearse correctamente con el umbral por defecto de 2 horas', () => {
    expect(service).toBeTruthy();
    expect(service.getThresholdMs()).toBe(DEFAULT_ABANDONED_THRESHOLD_MS);
    expect(service.isBannerVisible()).toBe(false);
  });

  it('permite personalizar el umbral de inactividad', () => {
    service.setThresholdMs(5000);
    expect(service.getThresholdMs()).toBe(5000);
  });

  it('no muestra aviso si la cesta está vacía', () => {
    cartService.clearCart();
    const result = service.checkInactivity();
    expect(result).toBe(false);
    expect(service.isBannerVisible()).toBe(false);
  });

  it('detecta inactividad cuando transcurre el tiempo límite con productos en la cesta', () => {
    cartService.addToCart('Queso de Pastor Cal Sardà', 15.5, 2);

    const now = Date.now();
    // Simulamos que la cesta se guardó hace 2.5 horas
    const past = now - 2.5 * 3600 * 1000;
    localStorage.setItem('cal_sarda_abandoned_cart', JSON.stringify({ lastUpdated: past }));

    const result = service.checkInactivity(now);
    expect(result).toBe(true);
    expect(service.isBannerVisible()).toBe(true);
  });

  it('no muestra el aviso si el usuario lo descartó previamente en el periodo de 24h', () => {
    cartService.addToCart('Queso de Pastor Cal Sardà', 15.5, 2);

    const now = Date.now();
    const past = now - 3 * 3600 * 1000;
    const dismissedUntil = now + 12 * 3600 * 1000; // descartado hace poco, aún vigente

    localStorage.setItem(
      'cal_sarda_abandoned_cart',
      JSON.stringify({ lastUpdated: past, dismissedUntil }),
    );

    const result = service.checkInactivity(now);
    expect(result).toBe(false);
    expect(service.isBannerVisible()).toBe(false);
  });

  it('dismissBanner oculta el banner y guarda el timestamp de descarte', () => {
    service.isBannerVisible.set(true);
    service.dismissBanner();

    expect(service.isBannerVisible()).toBe(false);
    const raw = localStorage.getItem('cal_sarda_abandoned_cart');
    expect(raw).toBeTruthy();
    const meta = JSON.parse(raw!);
    expect(meta.dismissedUntil).toBeGreaterThan(Date.now());
  });

  it('resumeCart oculta el banner y navega a la tramitación de pedido', () => {
    service.isBannerVisible.set(true);
    service.resumeCart();

    expect(service.isBannerVisible()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/preparar-pedido']);
  });

  it('sendFriendlyReminder despacha el email mediante NotificationService y registra el éxito', async () => {
    cartService.addToCart('Jamón Ibérico', 25.0, 1);
    const sendSpy = vi
      .spyOn(notificationService, 'sendAbandonedCartNotification')
      .mockResolvedValue({
        success: true,
        messageId: 'test-msg-123',
      });

    const success = await service.sendFriendlyReminder({
      name: 'Maria Valls',
      email: 'maria@example.com',
    });

    expect(success).toBe(true);
    expect(sendSpy).toHaveBeenCalled();
    expect(service.reminderSuccess()).toBeTruthy();
  });

  it('devuelve registros para la vista del panel de administración', () => {
    cartService.addToCart('Vino Priorat', 30.0, 1);
    const adminRecords = service.getAdminAbandonedCarts();

    expect(adminRecords.length).toBeGreaterThan(0);
    const sessionRecord = adminRecords.find((r) => r.id === 'cart-session-active');
    expect(sessionRecord).toBeDefined();
    expect(sessionRecord?.total).toBe(30.0);
  });
});
