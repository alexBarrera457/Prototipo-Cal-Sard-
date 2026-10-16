import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CustomLotsPage, LOT_PACKAGING_OPTIONS } from './custom-lots-page';
import { ProductsService, type StoreProduct } from '../../services/products';
import { CartService } from '../../services/cart';
import { I18nService } from '../../services/i18n';

describe('CustomLotsPage («Fes el teu Lot» #63)', () => {
  let component: CustomLotsPage;
  let fixture: ComponentFixture<CustomLotsPage>;
  let cartService: CartService;
  let productsService: ProductsService;

  const mockProducts: StoreProduct[] = [
    {
      number: 'P01',
      name: 'Jamón Ibérico de Bellota 100g',
      price: 18.5,
      category: 'EMBUTIDOS',
      inStock: true,
      description: 'Cortado a mano',
      shortDescription: 'Jamón ibérico artesano',
      image: '/images/jamon.jpg',
    },
    {
      number: 'P02',
      name: 'Formatge Garrotxa semicurat',
      price: 14.0,
      category: 'VÍVERES GOURMET',
      inStock: true,
      description: 'Queso artesano de pastor',
      shortDescription: 'Queso de cabra artesano',
      image: '/images/formatge.jpg',
    },
    {
      number: 'P03',
      name: 'Vi Negre Selecció Priorat 75cl',
      price: 19.5,
      category: 'BODEGA GOURMET',
      inStock: true,
      description: 'Vino tinto crianza',
      shortDescription: 'Vino tinto D.O.Q. Priorat',
      image: '/images/vino.jpg',
    },
    {
      number: 'P04',
      name: 'Turrón de Jijona Artesano',
      price: 9.8,
      category: 'DULCES DE FIESTAS',
      inStock: true,
      description: 'Dulce navideño',
      shortDescription: 'Turrón blando tradicional',
      image: '/images/turron.jpg',
    },
    {
      number: 'P05',
      name: 'Ventresca de Bonito del Norte en Aceite de Oliva',
      price: 11.2,
      category: 'CONSERVAS DE MAR',
      inStock: true,
      description: 'Conserva selecta',
      shortDescription: 'Ventresca selecta en aceite',
      image: '/images/ventresca.jpg',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomLotsPage],
      providers: [
        provideRouter([]),
        CartService,
        I18nService,
        {
          provide: ProductsService,
          useValue: {
            getProducts: vi.fn().mockResolvedValue([...mockProducts]),
          },
        },
      ],
    }).compileComponents();

    cartService = TestBed.inject(CartService);
    productsService = TestBed.inject(ProductsService);

    fixture = TestBed.createComponent(CustomLotsPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  });

  it('creates the component and initializes packaging options and catalog', () => {
    expect(component).toBeTruthy();
    expect(component.packagingOptions.length).toBe(LOT_PACKAGING_OPTIONS.length);
    expect(component.currentStep()).toBe(1);
    expect(component.selectedPackagingId()).toBe('caja-madera');
    expect(component.selectedPackaging().price).toBe(8.5);
    expect(component.catalog().length).toBe(5);
  });

  it('selects a different packaging option and updates selectedPackaging and totalPrice', () => {
    // Cambiar a Cesta de mimbre (12.00 €)
    component.selectPackaging('cesta-mimbre');
    expect(component.selectedPackaging().id).toBe('cesta-mimbre');
    expect(component.selectedPackaging().price).toBe(12.0);
    expect(component.totalPrice()).toBe(12.0);

    // Cambiar a Estuche kraft (4.50 €)
    component.selectPackaging('estuche-kraft');
    expect(component.selectedPackaging().id).toBe('estuche-kraft');
    expect(component.totalPrice()).toBe(4.5);
  });

  it('navigates through steps validating prerequisites', () => {
    // Paso 1 -> Paso 2 (permitido porque hay estuche seleccionado)
    component.goToStep(2);
    expect(component.currentStep()).toBe(2);

    // Intentar ir a Paso 3 sin productos añadidos (debe bloquearse en paso 2)
    component.goToStep(3);
    expect(component.currentStep()).toBe(2);

    // Añadir producto y ahora sí permitir avanzar a Paso 3
    component.addProduct(mockProducts[0]);
    expect(component.itemsCount()).toBe(1);

    component.goToStep(3);
    expect(component.currentStep()).toBe(3);

    // Volver a paso 2
    component.goToStep(2);
    expect(component.currentStep()).toBe(2);
  });

  it('adds and removes products, updating reactive counters and total price', () => {
    // Inicialmente 0 productos, precio = precio del estuche seleccionado (8.50 €)
    expect(component.itemsCount()).toBe(0);
    expect(component.itemsPrice()).toBe(0);
    expect(component.totalPrice()).toBe(8.5);

    // Añadir 1 jamón (18.50 €) y 2 quesos (14.00 € x 2 = 28.00 €)
    component.addProduct(mockProducts[0]);
    component.addProduct(mockProducts[1]);
    component.addProduct(mockProducts[1]);

    expect(component.getItemQuantity(mockProducts[0])).toBe(1);
    expect(component.getItemQuantity(mockProducts[1])).toBe(2);
    expect(component.itemsCount()).toBe(3);

    // Subtotal productos = 18.50 + 28.00 = 46.50 €
    expect(component.itemsPrice()).toBe(46.5);
    // Total = 8.50 (estuche) + 46.50 = 55.00 €
    expect(component.totalPrice()).toBe(55.0);

    // Reducir un queso
    component.removeProduct(mockProducts[1]);
    expect(component.getItemQuantity(mockProducts[1])).toBe(1);
    expect(component.itemsCount()).toBe(2);
    expect(component.totalPrice()).toBe(41.0); // 8.50 + 18.50 + 14.00 = 41.00 €
  });

  it('filters catalog products by section chips', () => {
    component.setSection('embutidos');
    let filtered = component.filteredProducts();
    expect(filtered.some((p) => p.name.includes('Jamón'))).toBe(true);

    component.setSection('quesos');
    filtered = component.filteredProducts();
    expect(filtered.every((p) => p.name.includes('Formatge') || p.name.includes('Queso'))).toBe(
      true,
    );

    component.setSection('bodega');
    filtered = component.filteredProducts();
    expect(filtered.every((p) => p.category === 'BODEGA GOURMET' || p.name.includes('Vi'))).toBe(
      true,
    );

    component.setSection('todas');
    filtered = component.filteredProducts();
    expect(filtered.length).toBe(mockProducts.length);
  });

  it('adds custom lot to cart with full packaging and dedication metadata, navigating to checkout', () => {
    const addToCartSpy = vi.spyOn(cartService, 'addToCart');
    const navigateSpy = vi.spyOn(component.router, 'navigate');

    // Configurar lote
    component.selectPackaging('caja-madera');
    component.addProduct(mockProducts[0]); // Jamón 18.50
    component.addProduct(mockProducts[2]); // Vino 19.50

    // Dedicatoria
    component.senderName.set('Àlex');
    component.recipientName.set('Núria');
    component.dedication.set('Feliç aniversari, que gaudeixis d’aquest lot artesà de Cal Sardà!');

    // Añadir a la cesta
    component.addCustomLotToCart();

    expect(addToCartSpy).toHaveBeenCalledWith(
      expect.stringContaining('Lote a medida Cal Sardà'),
      46.5, // 8.50 + 18.50 + 19.50 = 46.50
      1,
      'CUSTOM-LOT',
      expect.any(String),
      expect.objectContaining({
        packagingName: 'Caja de madera serigrafiada Cal Sardà',
        packagingPrice: 8.5,
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Jamón Ibérico de Bellota 100g', quantity: 1 }),
          expect.objectContaining({ name: 'Vi Negre Selecció Priorat 75cl', quantity: 1 }),
        ]),
        senderName: 'Àlex',
        recipientName: 'Núria',
        dedication: 'Feliç aniversari, que gaudeixis d’aquest lot artesà de Cal Sardà!',
      }),
    );

    expect(component.toastMessage()).toBeTruthy();
    expect(navigateSpy).toHaveBeenCalledWith(['/preparar-pedido']);
  });
});
