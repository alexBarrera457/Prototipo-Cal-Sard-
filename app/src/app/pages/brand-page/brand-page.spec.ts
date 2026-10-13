import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { BrandPage } from './brand-page';
import { CartService } from '../../services/cart';

describe('BrandPage', () => {
  let component: BrandPage;
  let fixture: ComponentFixture<BrandPage>;
  let metaService: Meta;
  let cartService: CartService;

  const setupTest = async (pageData: string) => {
    await TestBed.configureTestingModule({
      imports: [BrandPage],
      providers: [
        provideRouter([]),
        CartService,
        Meta,
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: pageData }),
            snapshot: { routeConfig: { path: pageData } },
          },
        },
      ],
    }).compileComponents();

    metaService = TestBed.inject(Meta);
    cartService = TestBed.inject(CartService);
    fixture = TestBed.createComponent(BrandPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('resolves historia content and updates meta description', async () => {
    await setupTest('historia');

    expect(component.page).toBeDefined();
    expect(component.page.eyebrow).toBe('Historia');
    expect(component.page.intro).toBe('Más de 90 años al servicio del barrio');

    const metaTag = metaService.getTag('name="description"');
    expect(metaTag?.content).toBe('Más de 90 años al servicio del barrio');
  });

  it('resolves faq content with questions and answers', async () => {
    await setupTest('faq');

    expect(component.page.eyebrow).toBe('Preguntas frecuentes');
    expect(component.page.faqItems).toBeDefined();
    expect(component.page.faqItems!.length).toBeGreaterThan(0);
  });

  it('adds gift lot to cart via CartService', async () => {
    await setupTest('lots-i-cistelles-gurmet');
    const addToCartSpy = vi.spyOn(cartService, 'addToCart');

    const giftLot = component.page.giftLots?.[0];
    if (giftLot) {
      component.addGiftLotToCart(giftLot);
      expect(addToCartSpy).toHaveBeenCalledWith(
        giftLot.name,
        giftLot.price,
        1,
        giftLot.slug,
        giftLot.image,
      );
      expect(component.lastAddedGiftLotSlug).toBe(giftLot.slug);
    }
  });
});
