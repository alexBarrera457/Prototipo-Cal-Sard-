import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { HomePage } from './home-page';
import { SeoService } from '../../services/seo';
import { I18nService } from '../../services/i18n';
import { ProductsService, StoreProduct } from '../../services/products';
import { CartService } from '../../services/cart';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let productsService: ProductsService;
  let cartService: CartService;

  const mockFeaturedProducts: StoreProduct[] = [
    {
      number: '01',
      slug: 'cafe-sarda-origen',
      name: 'Café Sardà Origen 1930',
      category: 'CAFÉ GOURMET',
      description: 'Café tostado artesanal',
      shortDescription: 'Mezcla artesanal tostada a fuego lento',
      price: 6.5,
      priceLabel: '250 g',
      featured: true,
      image: '/images/products/cafe.jpg',
    },
    {
      number: '02',
      slug: 'ventresca-bonito',
      name: 'Ventresca de Bonito del Norte',
      category: 'CONSERVAS DE MAR',
      description: 'En aceite de oliva virgen',
      shortDescription: 'Lomos seleccionados en aceite de oliva virgen extra',
      price: 9.8,
      featured: true,
      image: '/images/products/conservas.png',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), SeoService, I18nService, ProductsService, CartService],
    }).compileComponents();

    productsService = TestBed.inject(ProductsService);
    cartService = TestBed.inject(CartService);
    vi.spyOn(productsService, 'getFeaturedProducts').mockResolvedValue(mockFeaturedProducts);

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    await component.loadFeatured();
    fixture.detectChanges();
  });

  it('creates the home page component and defines featured categories', () => {
    expect(component).toBeTruthy();
    expect(component.categories.length).toBe(4);
    expect(component.categories[0].search).toBe('CAFÉ GOURMET');
  });

  it('renders the featured categories in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const categoryCards = compiled.querySelectorAll('.home-category-card');
    expect(categoryCards.length).toBe(4);

    const firstCard = categoryCards[0];
    expect(firstCard.textContent).toContain('Café Sardà');
  });

  it('loads and renders featured products', async () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const featuredSection = compiled.querySelector('.home-featured-section');
    expect(featuredSection).toBeTruthy();

    const cards = compiled.querySelectorAll('.featured-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Café Sardà Origen 1930');
    expect(cards[0].textContent).toContain('⭐ Selección');
  });

  it('adds product to cart when clicking the add button', () => {
    const addToCartSpy = vi.spyOn(cartService, 'addToCart');
    const compiled = fixture.nativeElement as HTMLElement;
    const addBtn = compiled.querySelector('.btn-featured-add') as HTMLButtonElement;
    expect(addBtn).toBeTruthy();

    addBtn.click();
    expect(addToCartSpy).toHaveBeenCalledWith(
      'Café Sardà Origen 1930',
      6.5,
      1,
      '01',
      '/images/products/cafe.jpg',
    );
    expect(component.toastMessage()).toContain('Café Sardà Origen 1930');
  });

  it('hides featured section when no featured products are returned', async () => {
    vi.spyOn(productsService, 'getFeaturedProducts').mockResolvedValue([]);
    await component.loadFeatured();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const featuredSection = compiled.querySelector('.home-featured-section');
    expect(featuredSection).toBeNull();
  });
});
