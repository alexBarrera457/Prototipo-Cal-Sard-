import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { FavoritesService } from './favorites';
import { AuthService, InMemoryAuthAdapter, AUTH_ADAPTER } from './auth';
import { ProductsService, ProductsRepository, PRODUCTS_REPOSITORY, StoreProduct } from './products';
import { CartService, InMemoryCartAdapter, CART_STORAGE_ADAPTER } from './cart';

class MockProductsRepository implements ProductsRepository {
  constructor(private products: StoreProduct[]) {}
  async getProducts(): Promise<StoreProduct[]> {
    return [...this.products];
  }
  async getProductByNumber(num: string): Promise<StoreProduct | null> {
    return this.products.find((p) => p.number === num) ?? null;
  }
}

describe('FavoritesService', () => {
  let service: FavoritesService;
  let authService: AuthService;
  let cartService: CartService;
  let productsService: ProductsService;

  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }

    const mockAuthAdapter = new InMemoryAuthAdapter();
    const mockProductsRepo = new MockProductsRepository([
      {
        number: '01',
        name: 'Jamón Ibérico de Bellota',
        price: 18.5,
        category: 'EMBUTIDOS',
        description: 'Jamón curado de bellota',
        shortDescription: 'Sobre 100g cortado fino',
        image: '/images/products/jamon.webp',
        inStock: true,
      },
      {
        number: '02',
        name: 'Secallona de Vic',
        price: 6.8,
        category: 'EMBUTIDOS',
        description: 'Secallona tradicional',
        shortDescription: 'Pieza 180g',
        image: '/images/products/secallona.webp',
        inStock: true,
      },
      {
        number: '03',
        name: 'Queso Manchego Curado',
        price: 12.0,
        category: 'QUESOS',
        description: 'Queso curado artesano',
        shortDescription: 'Cuña 250g',
        image: '/images/products/manchego.webp',
        inStock: false, // Agotado para probar filtrado
      },
    ]);
    const mockCartAdapter = new InMemoryCartAdapter();

    TestBed.configureTestingModule({
      providers: [
        FavoritesService,
        AuthService,
        { provide: AUTH_ADAPTER, useValue: mockAuthAdapter },
        ProductsService,
        { provide: PRODUCTS_REPOSITORY, useValue: mockProductsRepo },
        CartService,
        { provide: CART_STORAGE_ADAPTER, useValue: mockCartAdapter },
      ],
    });

    service = TestBed.inject(FavoritesService);
    authService = TestBed.inject(AuthService);
    cartService = TestBed.inject(CartService);
    productsService = TestBed.inject(ProductsService);

    await authService.signOut();
  });

  it('starts with empty or local favorites for guests', () => {
    expect(service.favorites()).toEqual([]);
    expect(service.favoritesCount()).toBe(0);
    expect(service.isFavorite('01')).toBe(false);
  });

  it('toggles favorite status on and off', async () => {
    const isNowFav = await service.toggleFavorite('01');
    expect(isNowFav).toBe(true);
    expect(service.isFavorite('01')).toBe(true);
    expect(service.favoritesCount()).toBe(1);

    // Toggle off
    const isNowFavOff = await service.toggleFavorite('01');
    expect(isNowFavOff).toBe(false);
    expect(service.isFavorite('01')).toBe(false);
    expect(service.favoritesCount()).toBe(0);
  });

  it('adds and removes favorites idempotently', async () => {
    await service.addFavorite('01');
    await service.addFavorite('01'); // duplicate call
    expect(service.favorites()).toEqual(['01']);

    await service.addFavorite('02');
    expect(service.favorites()).toEqual(['01', '02']);

    await service.removeFavorite('01');
    expect(service.favorites()).toEqual(['02']);
  });

  it('resolves favorite products with up to date catalog details', async () => {
    await service.addFavorite('01');
    await service.addFavorite('03');

    const products = await service.getFavoriteProducts();
    expect(products.length).toBe(2);
    expect(products[0].name).toBe('Jamón Ibérico de Bellota');
    expect(products[1].name).toBe('Queso Manchego Curado');
  });

  it('adds all available favorites to cart and reports out of stock items', async () => {
    await service.addFavorite('01'); // in stock
    await service.addFavorite('02'); // in stock
    await service.addFavorite('03'); // out of stock

    const result = await service.addAllFavoritesToCart();
    expect(result.addedCount).toBe(2);
    expect(result.outOfStockCount).toBe(1);

    const cartItems = cartService.products();
    expect(cartItems.length).toBe(2);
    expect(cartItems.some((item) => item.productNumber === '01')).toBe(true);
    expect(cartItems.some((item) => item.productNumber === '02')).toBe(true);
    expect(cartItems.some((item) => item.productNumber === '03')).toBe(false);
  });

  it('syncs with authenticated user profile favorites', async () => {
    await authService.signIn({
      email: 'cliente@calsarda.com',
      password: 'cliente1930',
    });

    // cliente@calsarda.com mock has favorites: ['01', '03']
    expect(service.favorites()).toEqual(['01', '03']);
    expect(service.isFavorite('01')).toBe(true);
    expect(service.isFavorite('03')).toBe(true);

    // Adding new favorite syncs to profile
    await service.addFavorite('02');
    expect(authService.currentUser()?.favorites).toContain('02');

    // Removing favorite syncs to profile
    await service.removeFavorite('03');
    expect(authService.currentUser()?.favorites).not.toContain('03');
  });
});
