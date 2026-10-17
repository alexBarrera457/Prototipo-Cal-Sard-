import { TestBed } from '@angular/core/testing';
import {
  isGlutenFree,
  isLactoseFree,
  mapDatabaseProductToProduct,
  PRODUCTS_REPOSITORY,
  ProductsRepository,
  ProductsService,
  StaticProductsAdapter,
  StoreProduct,
  SupabaseProductsAdapter,
} from './products';
import { SUPABASE_CLIENT } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

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

  it('generates semantic slugs and retrieves products by slug or number', async () => {
    const productByNumber = await service.getProductBySlugOrNumber('01');
    expect(productByNumber).not.toBeNull();
    expect(productByNumber?.number).toBe('01');

    const productBySlug = await service.getProductBySlugOrNumber('cafe-100-robusta');
    expect(productBySlug).not.toBeNull();
    expect(productBySlug?.number).toBe('01');

    const notFound = await service.getProductBySlugOrNumber('producto-que-no-existe-xyz');
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

      // Sort by featured prioritizing featured products and respecting featuredOrder
      const productsWithFeatured: StoreProduct[] = [
        { ...mockProducts[0], number: 'P1', featured: false },
        { ...mockProducts[1], number: 'P2', featured: true, featuredOrder: 2 },
        { ...mockProducts[2], number: 'P3', featured: true, featuredOrder: 1 },
      ];
      const featuredSorted = service.filterAndSort(productsWithFeatured, { sortOrder: 'featured' });
      expect(featuredSorted.map((p) => p.number)).toEqual(['P3', 'P2', 'P1']);
    });

    it('filters by gluten-free and lactose-free requirements', () => {
      const dietaryProducts: StoreProduct[] = [
        {
          number: 'D1',
          name: 'Fuet Tradicional',
          category: 'EMBUTIDOS',
          description: 'Fuet artesanal curado lentamente',
          shortDescription: 'Pieza 180 g',
          price: 6,
          image: '/fuet.jpg',
          allergens: ['Lactosa'],
        },
        {
          number: 'D2',
          name: 'Pan de Cristal',
          category: 'PANES',
          description: 'Pan artesano de alta hidratación',
          shortDescription: 'Pack 4 unidades',
          price: 3,
          image: '/pan.jpg',
          allergens: ['Gluten', 'Trigo'],
        },
        {
          number: 'D3',
          name: 'Jamón Ibérico 100% Bellota',
          category: 'IBÉRICOS',
          description: 'Jamón de bellota 100% ibérico cortado a mano',
          shortDescription: 'Sobre 100 g',
          price: 18,
          image: '/jamon.jpg',
          allergens: [],
        },
      ];

      expect(isGlutenFree(dietaryProducts[0])).toBe(true);
      expect(isGlutenFree(dietaryProducts[1])).toBe(false);
      expect(isGlutenFree(dietaryProducts[2])).toBe(true);

      expect(isLactoseFree(dietaryProducts[0])).toBe(false);
      expect(isLactoseFree(dietaryProducts[1])).toBe(true);
      expect(isLactoseFree(dietaryProducts[2])).toBe(true);

      const glutenFreeOnly = service.filterAndSort(dietaryProducts, { glutenFreeOnly: true });
      expect(glutenFreeOnly.map((p) => p.number)).toEqual(['D1', 'D3']);

      const lactoseFreeOnly = service.filterAndSort(dietaryProducts, { lactoseFreeOnly: true });
      expect(lactoseFreeOnly.map((p) => p.number)).toEqual(['D2', 'D3']);

      const both = service.filterAndSort(dietaryProducts, {
        glutenFreeOnly: true,
        lactoseFreeOnly: true,
      });
      expect(both.map((p) => p.number)).toEqual(['D3']);
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

  describe('paginate', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('slices page items correctly', () => {
      const page1 = service.paginate(list, 1, 4);
      expect(page1.items).toEqual([1, 2, 3, 4]);
      expect(page1.page).toBe(1);
      expect(page1.pageCount).toBe(3);
      expect(page1.firstItemIndex).toBe(1);
      expect(page1.lastItemIndex).toBe(4);

      const page2 = service.paginate(list, 2, 4);
      expect(page2.items).toEqual([5, 6, 7, 8]);
      expect(page2.firstItemIndex).toBe(5);
      expect(page2.lastItemIndex).toBe(8);

      const page3 = service.paginate(list, 3, 4);
      expect(page3.items).toEqual([9, 10]);
      expect(page3.firstItemIndex).toBe(9);
      expect(page3.lastItemIndex).toBe(10);
    });

    it('clamps page numbers to valid bounds', () => {
      const pageLow = service.paginate(list, 0, 4);
      expect(pageLow.page).toBe(1);

      const pageHigh = service.paginate(list, 999, 4);
      expect(pageHigh.page).toBe(3);
      expect(pageHigh.items).toEqual([9, 10]);
    });

    it('handles empty lists gracefully', () => {
      const empty = service.paginate([], 1, 10);
      expect(empty.items).toEqual([]);
      expect(empty.pageCount).toBe(1);
      expect(empty.firstItemIndex).toBe(0);
      expect(empty.lastItemIndex).toBe(0);
    });
  });

  describe('mapDatabaseProductToProduct', () => {
    it('maps database record columns to Product domain interface', () => {
      const dbRow = {
        number: '10',
        name: 'Formatge d’Oveja Curat',
        category_name: 'EMBUTIDOS',
        description: 'Formatge artesanal madurat 12 mesos',
        short_description: '250 g',
        price: '12.50',
        price_label: '12,50 €',
        image: '/img/formatge.jpg',
        images: ['/img/formatge-1.jpg', '/img/formatge-2.jpg'],
        image_fit: 'cover',
        source_url: 'https://calsarda.com/formatge',
        is_active: true,
      };

      const mapped = mapDatabaseProductToProduct(dbRow);

      expect(mapped.number).toBe('10');
      expect(mapped.name).toBe('Formatge d’Oveja Curat');
      expect(mapped.category).toBe('EMBUTIDOS');
      expect(mapped.price).toBe(12.5);
      expect(mapped.priceLabel).toBe('12,50 €');
      expect(mapped.image).toBe('/img/formatge.jpg');
      expect(mapped.images).toEqual(['/img/formatge-1.jpg', '/img/formatge-2.jpg']);
      expect(mapped.imageFit).toBe('cover');
      expect(mapped.sourceUrl).toBe('https://calsarda.com/formatge');
      expect(mapped.slug).toBeTruthy();
    });

    it('handles fallbacks for missing optional columns', () => {
      const minimalRow = {
        number: '99',
        name: 'Producte Minimal',
        image: '/img/minimal.jpg',
      };

      const mapped = mapDatabaseProductToProduct(minimalRow);

      expect(mapped.number).toBe('99');
      expect(mapped.price).toBe(0);
      expect(mapped.images).toEqual(['/img/minimal.jpg']);
      expect(mapped.imageFit).toBe('contain');
      expect(mapped.priceLabel).toBeUndefined();
      expect(mapped.sourceUrl).toBeUndefined();
    });
  });

  describe('StaticProductsAdapter', () => {
    afterEach(() => {
      StaticProductsAdapter.resetCatalog(true);
    });

    it('retrieves products from static catalog in memory with initial featured products', async () => {
      const adapter = new StaticProductsAdapter();
      const products = await adapter.getProducts();

      expect(products.length).toBeGreaterThan(0);
      expect(products[0].number).toBe('01');
      const featured = products.filter((p) => p.featured);
      expect(featured.length).toBe(6);
    });

    it('retrieves single product by number or returns null', async () => {
      const adapter = new StaticProductsAdapter();
      const product = await adapter.getProductByNumber('01');

      expect(product).toBeTruthy();
      expect(product?.number).toBe('01');

      const missing = await adapter.getProductByNumber('non-existent-xyz');
      expect(missing).toBeNull();
    });

    it('persists product updates across adapter calls using localStorage', async () => {
      const adapter = new StaticProductsAdapter();
      await adapter.updateProduct('01', { price: 9.99, featured: true });

      // Reset in-memory cache to simulate fresh page load
      StaticProductsAdapter.resetCatalog(false);
      const reloaded = await adapter.getProductByNumber('01');
      expect(reloaded?.price).toBe(9.99);
      expect(reloaded?.featured).toBe(true);
    });
  });

  describe('SupabaseProductsAdapter', () => {
    const mockDbProducts = [
      {
        number: '01',
        name: 'Café Robusta Supabase',
        category_name: 'CAFÉ GOURMET',
        description: 'Café de Supabase',
        short_description: '250 g',
        price: 5.25,
        image: '/cafe.jpg',
        images: ['/cafe.jpg'],
        image_fit: 'contain',
        is_active: true,
      },
      {
        number: '02',
        name: 'Secallona Supabase',
        category_name: 'EMBUTIDOS',
        description: 'Secallona de Vic',
        short_description: '180 g',
        price: 6.8,
        image: '/secallona.jpg',
        images: ['/secallona.jpg'],
        image_fit: 'contain',
        is_active: true,
      },
    ];

    function createMockSupabase(records: any[] = mockDbProducts) {
      return {
        from: (table: string) => ({
          select: () => {
            let filtered = [...records];
            const builder: any = {
              eq: (field: string, value: any) => {
                filtered = filtered.filter((r) => r[field] === value);
                return builder;
              },
              order: (field: string, { ascending }: { ascending: boolean }) => {
                filtered.sort((a: any, b: any) => {
                  const valA = a[field];
                  const valB = b[field];
                  return ascending ? (valA > valB ? 1 : -1) : valA > valB ? -1 : 1;
                });
                return builder;
              },
              maybeSingle: async () => ({
                data: filtered[0] ?? null,
                error: null,
              }),
              then: (resolve: any, reject: any) =>
                Promise.resolve({ data: filtered, error: null }).then(resolve, reject),
            };
            return builder;
          },
        }),
      } as unknown as SupabaseClient;
    }

    it('loads active products from Supabase table', async () => {
      const mockSupabase = createMockSupabase();
      const adapter = new SupabaseProductsAdapter(mockSupabase);

      const products = await adapter.getProducts();

      expect(products.length).toBe(2);
      expect(products[0].name).toBe('Café Robusta Supabase');
      expect(products[1].name).toBe('Secallona Supabase');
    });

    it('loads single product by number from Supabase table', async () => {
      const mockSupabase = createMockSupabase();
      const adapter = new SupabaseProductsAdapter(mockSupabase);

      const product = await adapter.getProductByNumber('02');

      expect(product).toBeTruthy();
      expect(product?.name).toBe('Secallona Supabase');
      expect(product?.category).toBe('EMBUTIDOS');
    });

    it('falls back to static adapter when Supabase client is null', async () => {
      const customFallback: ProductsRepository = {
        getProducts: async () => [
          {
            number: 'FB-1',
            name: 'Fallback Product',
            category: 'EMBUTIDOS',
            description: '',
            shortDescription: '',
            price: 10,
            image: '/fb.jpg',
          },
        ],
        getProductByNumber: async (num) =>
          num === 'FB-1'
            ? {
                number: 'FB-1',
                name: 'Fallback Product',
                category: 'EMBUTIDOS',
                description: '',
                shortDescription: '',
                price: 10,
                image: '/fb.jpg',
              }
            : null,
      };

      const adapter = new SupabaseProductsAdapter(null, customFallback);
      const products = await adapter.getProducts();

      expect(products.length).toBe(1);
      expect(products[0].number).toBe('FB-1');

      const single = await adapter.getProductByNumber('FB-1');
      expect(single?.name).toBe('Fallback Product');
    });

    it('falls back gracefully when Supabase query returns error or empty array', async () => {
      const failingSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({ data: null, error: { message: 'Query error' } }),
              maybeSingle: async () => ({ data: null, error: { message: 'Query error' } }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const fallbackAdapter: ProductsRepository = {
        getProducts: async () => [
          {
            number: 'OFFLINE-1',
            name: 'Offline Catalog Item',
            category: 'CAFÉ GOURMET',
            description: '',
            shortDescription: '',
            price: 5,
            image: '/offline.jpg',
          },
        ],
        getProductByNumber: async (num) =>
          num === 'OFFLINE-1'
            ? {
                number: 'OFFLINE-1',
                name: 'Offline Catalog Item',
                category: 'CAFÉ GOURMET',
                description: '',
                shortDescription: '',
                price: 5,
                image: '/offline.jpg',
              }
            : null,
      };

      const adapter = new SupabaseProductsAdapter(failingSupabase, fallbackAdapter);
      const products = await adapter.getProducts();

      expect(products.length).toBe(1);
      expect(products[0].number).toBe('OFFLINE-1');

      const single = await adapter.getProductByNumber('OFFLINE-1');
      expect(single?.number).toBe('OFFLINE-1');
    });
  });

  describe('ProductsService DI Seams and Tokens', () => {
    it('accepts custom repository via PRODUCTS_REPOSITORY token', async () => {
      const customRepo: ProductsRepository = {
        getProducts: async () => [
          {
            number: 'CUSTOM-1',
            name: 'Custom Product',
            category: 'BODEGA GOURMET',
            description: '',
            shortDescription: '',
            price: 25,
            image: '/custom.jpg',
          },
        ],
        getProductByNumber: async (num) =>
          num === 'CUSTOM-1'
            ? {
                number: 'CUSTOM-1',
                name: 'Custom Product',
                category: 'BODEGA GOURMET',
                description: '',
                shortDescription: '',
                price: 25,
                image: '/custom.jpg',
              }
            : null,
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ProductsService, { provide: PRODUCTS_REPOSITORY, useValue: customRepo }],
      });

      const customService = TestBed.inject(ProductsService);
      const products = await customService.getProducts();

      expect(products.length).toBe(1);
      expect(products[0].number).toBe('CUSTOM-1');

      const product = await customService.getProductByNumber('CUSTOM-1');
      expect(product?.name).toBe('Custom Product');
    });

    it('automatically uses SupabaseProductsAdapter when SUPABASE_CLIENT is provided', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => {
            const builder: any = {
              eq: () => builder,
              order: () => builder,
              maybeSingle: async () => ({
                data: {
                  number: 'SB-01',
                  name: 'Supabase Injected Product',
                  category_name: 'BODEGA GOURMET',
                  price: 30,
                  image: '/sb.jpg',
                  is_active: true,
                },
                error: null,
              }),
              then: (resolve: any, reject: any) =>
                Promise.resolve({
                  data: [
                    {
                      number: 'SB-01',
                      name: 'Supabase Injected Product',
                      category_name: 'BODEGA GOURMET',
                      price: 30,
                      image: '/sb.jpg',
                      is_active: true,
                    },
                  ],
                  error: null,
                }).then(resolve, reject),
            };
            return builder;
          },
        }),
      } as unknown as SupabaseClient;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ProductsService, { provide: SUPABASE_CLIENT, useValue: mockSupabase }],
      });

      const supabaseService = TestBed.inject(ProductsService);
      const products = await supabaseService.getProducts();

      expect(products.length).toBe(1);
      expect(products[0].number).toBe('SB-01');
      expect(products[0].name).toBe('Supabase Injected Product');
    });

    it('updates product attributes via updateProduct', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ProductsService],
      });
      const staticService = TestBed.inject(ProductsService);

      const updated = await staticService.updateProduct('01', {
        inStock: false,
        featured: true,
        price: 19.99,
        allergens: ['Gluten', 'Soja'],
      });

      expect(updated).not.toBeNull();
      expect(updated?.number).toBe('01');
      expect(updated?.inStock).toBe(false);
      expect(updated?.featured).toBe(true);
      expect(updated?.price).toBe(19.99);
      expect(updated?.allergens).toEqual(['Gluten', 'Soja']);

      const retrieved = await staticService.getProductByNumber('01');
      expect(retrieved?.inStock).toBe(false);
      expect(retrieved?.featured).toBe(true);
    });

    it('returns null when updating a non-existent product', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ProductsService],
      });
      const staticService = TestBed.inject(ProductsService);

      const result = await staticService.updateProduct('XYZ-NON-EXISTENT', { inStock: false });
      expect(result).toBeNull();
    });

    it('mapDatabaseProductToProduct maps stock, featured and allergens correctly', () => {
      const dbRow = {
        number: 'TEST-01',
        name: 'Turrón de Agramunt',
        category_name: 'DULCES DE FIESTAS',
        price: '12.50',
        in_stock: false,
        featured: true,
        allergens: ['Frutos secos', 'Huevo'],
      };

      const product = mapDatabaseProductToProduct(dbRow);
      expect(product.number).toBe('TEST-01');
      expect(product.inStock).toBe(false);
      expect(product.featured).toBe(true);
      expect(product.allergens).toEqual(['Frutos secos', 'Huevo']);
    });
  });
});
