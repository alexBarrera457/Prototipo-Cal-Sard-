import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbandonedCartBannerComponent } from './abandoned-cart-banner';
import { AbandonedCartService } from '../../services/abandoned-cart';
import { I18nService } from '../../services/i18n';
import { CartService } from '../../services/cart';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

describe('AbandonedCartBannerComponent', () => {
  let component: AbandonedCartBannerComponent;
  let fixture: ComponentFixture<AbandonedCartBannerComponent>;
  let abandonedCartService: AbandonedCartService;
  let cartService: CartService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AbandonedCartBannerComponent],
      providers: [
        AbandonedCartService,
        CartService,
        I18nService,
        {
          provide: AuthService,
          useValue: { currentUser: () => null },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AbandonedCartBannerComponent);
    component = fixture.componentInstance;
    abandonedCartService = TestBed.inject(AbandonedCartService);
    cartService = TestBed.inject(CartService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('no debe renderizar el banner si isBannerVisible es false', () => {
    abandonedCartService.isBannerVisible.set(false);
    fixture.detectChanges();

    const bannerEl = fixture.nativeElement.querySelector('.abandoned-cart-banner');
    expect(bannerEl).toBeNull();
  });

  it('renderiza el banner cuando hay productos y el aviso está activo', () => {
    cartService.addToCart('Fuet Artesano Cal Sardà', 8.5, 2);
    abandonedCartService.isBannerVisible.set(true);
    fixture.detectChanges();

    const bannerEl = fixture.nativeElement.querySelector('.abandoned-cart-banner');
    expect(bannerEl).not.toBeNull();
    expect(bannerEl.textContent).toContain('17,00');
  });

  it('llama a resumeCart() al pulsar el botón de retomar compra', () => {
    cartService.addToCart('Fuet Artesano Cal Sardà', 8.5, 1);
    abandonedCartService.isBannerVisible.set(true);
    fixture.detectChanges();

    const resumeSpy = vi.spyOn(abandonedCartService, 'resumeCart');
    const resumeBtn = fixture.nativeElement.querySelector('.btn-resume-cart');
    expect(resumeBtn).not.toBeNull();

    resumeBtn.click();
    expect(resumeSpy).toHaveBeenCalled();
  });

  it('llama a dismissBanner() al pulsar el botón de descartar', () => {
    cartService.addToCart('Fuet Artesano Cal Sardà', 8.5, 1);
    abandonedCartService.isBannerVisible.set(true);
    fixture.detectChanges();

    const dismissSpy = vi.spyOn(abandonedCartService, 'dismissBanner');
    const dismissBtn = fixture.nativeElement.querySelector('.btn-dismiss-cart');
    expect(dismissBtn).not.toBeNull();

    dismissBtn.click();
    expect(dismissSpy).toHaveBeenCalled();
  });
});
