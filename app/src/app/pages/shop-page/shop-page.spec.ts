import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ShopPage } from './shop-page';
import { ProductsService, StoreProduct } from '../../services/products';
import { I18nService } from '../../services/i18n';

describe('ShopPage', () => {
  let component: ShopPage;
  let fixture: ComponentFixture<ShopPage>;
  let router: Router;
  let productsService: ProductsService;

  const mockProduct: StoreProduct = {
    number: '01',
    name: 'Café 100% Robusta',
    category: 'CAFÉ GOURMET',
    description: 'Cafè Sardà variedad Robusta (250 g)',
    shortDescription: '5,25 € (250 g)',
    price: 5.25,
    image: '/images/products/catalog/cafe-robusta.jpg',
  };

  const setupTest = async (queryParams: Record<string, string> = {}) => {
    await TestBed.configureTestingModule({
      imports: [ShopPage],
      providers: [
        provideRouter([]),
        I18nService,
        ProductsService,
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap(queryParams)),
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    productsService = TestBed.inject(ProductsService);
    vi.spyOn(productsService, 'getProductByNumber').mockResolvedValue(mockProduct);

    fixture = TestBed.createComponent(ShopPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('reads searchTerm from query params', async () => {
    await setupTest({ buscar: 'turrón' });
    expect(component.searchTerm).toBe('turrón');
  });

  it('navigates to product slug route when showProduct is called', async () => {
    await setupTest();
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.showProduct(mockProduct);
    expect(navigateSpy).toHaveBeenCalledWith(['/tienda-online/producto', 'cafe-100-robusta']);
  });

  it('redirects legacy query param ?producto=01 to product slug URL', async () => {
    const navigateSpy = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
    await setupTest({ producto: '01' });

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/tienda-online/producto', 'cafe-100-robusta'],
      expect.objectContaining({ replaceUrl: true }),
    );
  });
});
