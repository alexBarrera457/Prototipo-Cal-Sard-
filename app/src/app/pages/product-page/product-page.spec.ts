import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProductPage } from './product-page';
import { ProductsService, StoreProduct } from '../../services/products';

describe('ProductPage', () => {
  let component: ProductPage;
  let fixture: ComponentFixture<ProductPage>;
  let titleService: Title;
  let metaService: Meta;
  let router: Router;

  const mockProduct: StoreProduct = {
    number: '01',
    name: 'Café 100% Robusta',
    category: 'CAFÉ GOURMET',
    description: 'Cafè Sardà variedad Robusta (250 g)',
    shortDescription: '5,25 € (250 g)',
    price: 5.25,
    image: '/images/products/catalog/cafe-robusta.jpg',
  };

  const setupTest = async (slugParam: string | null, resolvedProduct: StoreProduct | null) => {
    const productsServiceMock = {
      getProductBySlugOrNumber: vi.fn().mockResolvedValue(resolvedProduct),
      formatPrice: vi.fn((price: number) => `${price.toFixed(2)} €`),
    };

    await TestBed.configureTestingModule({
      imports: [ProductPage],
      providers: [
        provideRouter([]),
        { provide: ProductsService, useValue: productsServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap(slugParam ? { slug: slugParam } : {})),
          },
        },
      ],
    }).compileComponents();

    titleService = TestBed.inject(Title);
    metaService = TestBed.inject(Meta);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ProductPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  it('loads product by slug and sets title and meta tags', async () => {
    await setupTest('cafe-100-robusta', mockProduct);

    expect(component.product()).toEqual(mockProduct);
    expect(component.notFound()).toBe(false);
    expect(component.loading()).toBe(false);

    expect(titleService.getTitle()).toBe('Café 100% Robusta | Cal Sardà');
    expect(metaService.getTag('name="description"')?.content).toBe('5,25 € (250 g)');
    expect(metaService.getTag('property="og:title"')?.content).toBe(
      'Café 100% Robusta | Cal Sardà',
    );
    expect(metaService.getTag('property="og:image"')?.content).toBe(
      'https://calsarda.com/images/products/catalog/cafe-robusta.jpg',
    );
    const jsonLd = document.getElementById('jsonld-product');
    expect(jsonLd).not.toBeNull();
    expect(jsonLd?.textContent).toContain('"@type": "Product"');
  });

  it('handles unknown product slugs with not-found state', async () => {
    await setupTest('producto-inexistente', null);

    expect(component.product()).toBeNull();
    expect(component.notFound()).toBe(true);
    expect(component.loading()).toBe(false);
    expect(titleService.getTitle()).toBe('Producto no encontrado | Cal Sardà');
  });

  it('navigates back to store when backToStore is called', async () => {
    await setupTest('cafe-100-robusta', mockProduct);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.backToStore();
    expect(navigateSpy).toHaveBeenCalledWith(['/tienda-online']);
  });
});
