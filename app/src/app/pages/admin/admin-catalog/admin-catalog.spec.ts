import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AdminCatalog } from './admin-catalog';
import {
  ProductsService,
  PRODUCTS_REPOSITORY,
  type ProductsRepository,
  type StoreProduct,
} from '../../../services/products';
import { I18nService } from '../../../services/i18n';

describe('AdminCatalog', () => {
  let component: AdminCatalog;
  let productsService: ProductsService;
  let mockProducts: StoreProduct[];
  let mockRepo: ProductsRepository;

  beforeEach(async () => {
    mockProducts = [
      {
        number: '01',
        name: 'Café 100% Robusta Natural',
        category: 'CAFÉ GOURMET',
        description: 'Tostado artesanal intenso.',
        shortDescription: 'Cuerpo denso y crema avellana.',
        price: 8.5,
        image: '/images/cafe-robusta.jpg',
        inStock: true,
        featured: false,
        allergens: [],
      },
      {
        number: '02',
        name: 'Bonito del Norte en Aceite de Oliva',
        category: 'CONSERVAS DE MAR',
        description: 'Lomos seleccionados de costera.',
        shortDescription: 'Capturado en el Cantábrico.',
        price: 14.2,
        image: '/images/bonito.jpg',
        inStock: false,
        featured: true,
        allergens: ['Pescado'],
      },
      {
        number: '03',
        name: 'Turrón Blando de Almendra',
        category: 'DULCES DE FIESTAS',
        description: 'Elaboración tradicional con almendra marcona.',
        shortDescription: 'Tradición navideña.',
        price: 11.0,
        image: '/images/turron.jpg',
        inStock: true,
        featured: true,
        allergens: ['Frutos de cáscara', 'Huevo'],
      },
    ];

    mockRepo = {
      getProducts: vi.fn().mockResolvedValue([...mockProducts]),
      getProductByNumber: vi
        .fn()
        .mockImplementation(
          async (num: string) => mockProducts.find((p) => p.number === num) ?? null,
        ),
      updateProduct: vi
        .fn()
        .mockImplementation(async (num: string, updates: Partial<StoreProduct>) => {
          const idx = mockProducts.findIndex((p) => p.number === num);
          if (idx === -1) return null;
          mockProducts[idx] = { ...mockProducts[idx], ...updates };
          return mockProducts[idx];
        }),
      createProduct: vi.fn().mockImplementation(async (prod: StoreProduct) => {
        mockProducts.unshift(prod);
        return prod;
      }),
      deleteProduct: vi.fn().mockImplementation(async (num: string) => {
        const idx = mockProducts.findIndex((p) => p.number === num);
        if (idx === -1) return false;
        mockProducts.splice(idx, 1);
        return true;
      }),
    };

    await TestBed.configureTestingModule({
      imports: [AdminCatalog],
      providers: [
        provideRouter([]),
        ProductsService,
        I18nService,
        { provide: PRODUCTS_REPOSITORY, useValue: mockRepo },
      ],
    }).compileComponents();

    productsService = TestBed.inject(ProductsService);
    const fixture = TestBed.createComponent(AdminCatalog);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  });

  it('creates the component and loads initial products', () => {
    expect(component).toBeTruthy();
    expect(component.allProducts().length).toBe(3);
    expect(component.catalogStats().total).toBe(3);
    expect(component.catalogStats().inStock).toBe(2);
    expect(component.catalogStats().outOfStock).toBe(1);
    expect(component.catalogStats().featured).toBe(2);
  });

  it('filters products by text search', () => {
    component.onSearchInput('Robusta');
    expect(component.filteredProducts().length).toBe(1);
    expect(component.filteredProducts()[0].number).toBe('01');

    component.onSearchInput('02');
    expect(component.filteredProducts().length).toBe(1);
    expect(component.filteredProducts()[0].name).toContain('Bonito');

    component.clearSearch();
    expect(component.filteredProducts().length).toBe(3);
  });

  it('filters products by category', () => {
    component.setCategoryFilter('CONSERVAS DE MAR');
    expect(component.filteredProducts().length).toBe(1);
    expect(component.filteredProducts()[0].category).toBe('CONSERVAS DE MAR');

    component.setCategoryFilter('todos');
    expect(component.filteredProducts().length).toBe(3);
  });

  it('filters products by stock availability', () => {
    component.setStockFilter('out_of_stock');
    expect(component.filteredProducts().length).toBe(1);
    expect(component.filteredProducts()[0].number).toBe('02');

    component.setStockFilter('in_stock');
    expect(component.filteredProducts().length).toBe(2);
    expect(component.filteredProducts().every((p) => p.inStock !== false)).toBe(true);
  });

  it('filters products by featured status', () => {
    component.toggleFeaturedFilter();
    expect(component.featuredFilter()).toBe(true);
    expect(component.filteredProducts().length).toBe(2);
    expect(component.filteredProducts().every((p) => p.featured)).toBe(true);
  });

  it('toggles product inStock state directly', async () => {
    const product = component.allProducts()[0]; // number: '01', inStock: true
    expect(product.inStock).toBe(true);

    await component.toggleStock(product);
    expect(mockRepo.updateProduct).toHaveBeenCalledWith('01', { inStock: false });
    const updated = component.allProducts().find((p) => p.number === '01');
    expect(updated?.inStock).toBe(false);
  });

  it('toggles product featured state directly', async () => {
    const product = component.allProducts()[0]; // number: '01', featured: false
    expect(product.featured).toBe(false);

    await component.toggleFeatured(product);
    expect(mockRepo.updateProduct).toHaveBeenCalledWith('01', { featured: true, featuredOrder: 3 });
    const updated = component.allProducts().find((p) => p.number === '01');
    expect(updated?.featured).toBe(true);
    expect(updated?.featuredOrder).toBe(3);
  });

  it('provides status recommendation for featured products count', () => {
    // Inicialmente 2 productos destacados en mockProducts -> < 4 es warning
    expect(component.featuredStatus().type).toBe('warning');
    expect(component.featuredStatus().message).toContain('2');
  });

  it('reorders featured products and updates priority', async () => {
    component.toggleFeaturedFilter();
    const product2 = component.filteredProducts()[0]; // number '02'

    await component.reorderFeatured(product2, 'down');
    expect(mockRepo.updateProduct).toHaveBeenCalledWith('02', { featuredOrder: 2 });
    expect(mockRepo.updateProduct).toHaveBeenCalledWith('03', { featuredOrder: 1 });
  });

  it('opens edit modal and populates form', () => {
    const product = component.allProducts()[1]; // Bonito del Norte
    component.openEditModal(product);

    expect(component.editingProduct()).toBe(product);
    expect(component.editForm.number).toBe('02');
    expect(component.editForm.name).toBe('Bonito del Norte en Aceite de Oliva');
    expect(component.editForm.price).toBe(14.2);
    expect(component.editForm.allergensText).toBe('Pescado');
    expect(component.editForm.inStock).toBe(false);
    expect(component.editForm.featured).toBe(true);

    component.closeEditModal();
    expect(component.editingProduct()).toBeNull();
  });

  it('saves product modifications from modal', async () => {
    const product = component.allProducts()[0];
    component.openEditModal(product);

    component.editForm.name = 'Café 100% Robusta Gran Selección';
    component.editForm.price = 9.95;
    component.editForm.shortDescription = 'Nueva fórmula mejorada';
    component.editForm.allergensText = 'Trazas de frutos secos';
    component.editForm.featured = true;

    await component.saveProduct();

    expect(mockRepo.updateProduct).toHaveBeenCalledWith(
      '01',
      expect.objectContaining({
        name: 'Café 100% Robusta Gran Selección',
        price: 9.95,
        shortDescription: 'Nueva fórmula mejorada',
        allergens: ['Trazas de frutos secos'],
        featured: true,
      }),
    );
    expect(component.editingProduct()).toBeNull();

    const inList = component.allProducts().find((p) => p.number === '01');
    expect(inList?.name).toBe('Café 100% Robusta Gran Selección');
    expect(inList?.price).toBe(9.95);
  });

  it('formats currency correctly', () => {
    const formatted = component.formatCurrency(14.5);
    expect(formatted).toContain('14,50');
    expect(formatted).toContain('€');

    expect(component.formatCurrency(undefined)).toBe('0,00 €');
  });

  it('opens and closes the create product modal with next available number', () => {
    component.openCreateModal();
    expect(component.isCreatingProduct()).toBe(true);
    expect(component.createForm.number).toBe('04');

    component.closeCreateModal();
    expect(component.isCreatingProduct()).toBe(false);
  });

  it('creates a new product and prepends it to the catalog', async () => {
    component.openCreateModal();
    component.createForm.number = '04';
    component.createForm.name = 'Pa de Pagès Tradicional de Fusta';
    component.createForm.category = 'Víveres gourmet';
    component.createForm.price = 4.2;
    component.createForm.shortDescription = 'Pan tradicional de 1kg fermentado 24h';
    component.createForm.allergensText = 'Gluten';
    component.createForm.inStock = true;
    component.createForm.featured = true;

    await component.createProduct();

    expect(mockRepo.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        number: '04',
        name: 'Pa de Pagès Tradicional de Fusta',
        price: 4.2,
        allergens: ['Gluten'],
        inStock: true,
        featured: true,
      }),
    );
    expect(component.isCreatingProduct()).toBe(false);
    expect(component.allProducts().length).toBe(4);
    expect(component.allProducts()[0].name).toBe('Pa de Pagès Tradicional de Fusta');
  });

  it('opens delete confirmation and deletes product from catalog', async () => {
    const target = component.allProducts().find((p) => p.number === '02')!;
    component.openDeleteConfirm(target);
    expect(component.deletingProduct()).toBe(target);

    await component.confirmDeleteProduct();

    expect(mockRepo.deleteProduct).toHaveBeenCalledWith('02');
    expect(component.deletingProduct()).toBeNull();
    expect(component.allProducts().length).toBe(2);
    expect(component.allProducts().find((p) => p.number === '02')).toBeUndefined();
  });

  it('toggles allergens correctly in editForm and createForm', () => {
    const glutenDef = component.officialAllergens.find((a) => a.id === 'gluten')!;
    const lacteosDef = component.officialAllergens.find((a) => a.id === 'lacteos')!;

    // Initial state in editForm
    component.editForm.allergensText = 'Gluten';
    expect(component.isAllergenSelected(glutenDef, false)).toBe(true);
    expect(component.isAllergenSelected(lacteosDef, false)).toBe(false);

    // Toggle lacteos on in editForm
    component.toggleAllergen(lacteosDef, false);
    expect(component.editForm.allergensText).toContain('Lácteos');
    expect(component.isAllergenSelected(lacteosDef, false)).toBe(true);

    // Toggle gluten off in editForm
    component.toggleAllergen(glutenDef, false);
    expect(component.editForm.allergensText).not.toContain('Gluten');
    expect(component.isAllergenSelected(glutenDef, false)).toBe(false);

    // Toggle in createForm
    component.createForm.allergensText = '';
    component.toggleAllergen(glutenDef, true);
    expect(component.createForm.allergensText).toContain('Gluten');
    expect(component.isAllergenSelected(glutenDef, true)).toBe(true);
  });
});
