import { TestBed } from '@angular/core/testing';
import { ProductsService, StoreProduct } from './products';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductsService],
    });
    service = TestBed.inject(ProductsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.categories.length).toBeGreaterThan(0);
  });

  it('loads products and caches the promise', async () => {
    const p1 = service.getProducts();
    const p2 = service.getProducts();

    expect(p1).toBe(p2); // Same cached promise instance
    const products = await p1;
    expect(products.length).toBeGreaterThan(0);
  });

  it('finds product by number', async () => {
    const product = await service.getProductByNumber('01');
    expect(product).not.toBeNull();
    expect(product?.number).toBe('01');
    expect(product?.name).toContain('Robusta');

    const notFound = await service.getProductByNumber('non-existent-999');
    expect(notFound).toBeNull();
  });

  describe('search and normalization', () => {
    const mockProducts: StoreProduct[] = [
      {
        number: 'P1',
        name: 'Café gourmet arábica',
        category: 'CAFÉ GOURMET',
        description: 'Un café excelente de tostado natural.',
        shortDescription: '250 g',
        price: 5.5,
        image: '/img1.jpg',
      },
      {
        number: 'P2',
        name: 'Conservas de atún',
        category: 'CONSERVAS DE MAR',
        description: 'Atún claro en aceite de oliva virgen extra.',
        shortDescription: 'Lata 120 g',
        price: 3.2,
        image: '/img2.jpg',
      },
      {
        number: 'P3',
        name: 'Galletas artesanas con chocolate',
        category: 'GALLETAS Y PASTAS',
        description: 'Galletas crujientes y dulces con pepitas.',
        shortDescription: 'Caja 200 g',
        price: 4.8,
        image: '/img3.jpg',
      },
    ];

    it('returns empty array when query is empty or whitespace', () => {
      expect(service.searchInList('', mockProducts)).toEqual([]);
      expect(service.searchInList('   ', mockProducts)).toEqual([]);
    });

    it('matches terms accent-insensitively and case-insensitively', () => {
      // Searching "cafe" matches "Café"
      const results = service.searchInList('cafe', mockProducts);
      expect(results.length).toBe(1);
      expect(results[0].number).toBe('P1');
    });

    it('matches multiple terms across name, category, and descriptions', () => {
      const results = service.searchInList('atun virgen', mockProducts);
      expect(results.length).toBe(1);
      expect(results[0].number).toBe('P2');
    });

    it('filters and sorts correctly', () => {
      // Filter by category
      const cafeOnly = service.filterAndSort(mockProducts, { category: 'CAFÉ GOURMET' });
      expect(cafeOnly.length).toBe(1);
      expect(cafeOnly[0].number).toBe('P1');

      // Sort by price ascending
      const priceAsc = service.filterAndSort(mockProducts, { sortOrder: 'price-asc' });
      expect(priceAsc.map((p) => p.price)).toEqual([3.2, 4.8, 5.5]);

      // Sort by price descending
      const priceDesc = service.filterAndSort(mockProducts, { sortOrder: 'price-desc' });
      expect(priceDesc.map((p) => p.price)).toEqual([5.5, 4.8, 3.2]);

      // Sort by name ascending
      const nameAsc = service.filterAndSort(mockProducts, { sortOrder: 'name-asc' });
      expect(nameAsc[0].number).toBe('P1'); // Café...
      expect(nameAsc[1].number).toBe('P2'); // Conservas...
      expect(nameAsc[2].number).toBe('P3'); // Galletas...
    });

    it('supports search with limit', async () => {
      const results = await service.search('cafe', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('formatPrice', () => {
    it('formats price in EUR currency for es-ES', () => {
      const formatted = service.formatPrice(10.5);
      expect(formatted).toContain('10,50');
      expect(formatted).toContain('€');
    });
  });
});
