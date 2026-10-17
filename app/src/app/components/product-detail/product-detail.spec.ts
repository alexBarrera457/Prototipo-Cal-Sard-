import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductDetail } from './product-detail';
import { CartService } from '../../services/cart';
import { AuthService, InMemoryAuthAdapter, AUTH_ADAPTER } from '../../services/auth';
import { StockAlertService } from '../../services/stock-alerts';

describe('ProductDetail', () => {
  let component: ProductDetail;
  let fixture: ComponentFixture<ProductDetail>;
  let authService: AuthService;
  let stockAlertService: StockAlertService;

  beforeEach(async () => {
    localStorage.clear();
    const mockAuthAdapter = new InMemoryAuthAdapter();
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        AuthService,
        StockAlertService,
        { provide: AUTH_ADAPTER, useValue: mockAuthAdapter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    stockAlertService = TestBed.inject(StockAlertService);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('adds selected quantity in a single call to CartService', () => {
    const cartService = TestBed.inject(CartService);
    const addToCartSpy = vi.spyOn(cartService, 'addToCart');

    component.product = {
      number: '01',
      name: 'Fuet artesano',
      price: 5.5,
      category: 'EMBUTIDOS',
      image: 'fuet.jpg',
      shortDescription: 'Fuet curado',
      description: 'Fuet artesanal',
    };

    component.increaseQuantity();
    component.increaseQuantity();
    expect(component.quantity).toBe(3);

    component.addToCart();

    expect(addToCartSpy).toHaveBeenCalledTimes(1);
    expect(addToCartSpy).toHaveBeenCalledWith('Fuet artesano', 5.5, 3, '01', 'fuet.jpg');
    expect(component.addedToCartMessage).toBe('3 unidades añadidas a la cesta.');
  });

  it('determines if product is gluten-free or lactose-free based on allergens', () => {
    component.product = {
      number: 'Q1',
      name: 'Queso Curado',
      price: 12,
      category: 'QUESOS',
      image: 'queso.jpg',
      description: 'Queso curado artesano',
      shortDescription: 'Pieza 250 g',
      allergens: ['Lácteos', 'Lactosa'],
    };

    expect(component.isGlutenFree).toBe(true);
    expect(component.isLactoseFree).toBe(false);

    component.product = {
      number: 'G1',
      name: 'Galletas de Espelta',
      price: 4,
      category: 'DULCES',
      image: 'galletas.jpg',
      description: 'Galletas artesanas crujientes',
      shortDescription: 'Caja 200 g',
      allergens: ['Gluten'],
    };

    expect(component.isGlutenFree).toBe(false);
    expect(component.isLactoseFree).toBe(true);

    component.product = {
      number: 'A1',
      name: 'Aceite de Oliva Virgen Extra',
      price: 15,
      category: 'ACEITES',
      image: 'aceite.jpg',
      description: 'Aceite de oliva virgen extra arbequina',
      shortDescription: 'Botella 500 ml',
    };

    expect(component.isGlutenFree).toBe(true);
    expect(component.isLactoseFree).toBe(true);
  });

  it('detects user allergen conflicts based on authenticated customer preferences', () => {
    authService.currentUser.set({
      id: 'cust-1',
      name: 'Maria',
      email: 'maria@test.cat',
      role: 'customer',
      preferences: {
        allergens: ['Gluten', 'Frutos de cáscara'],
      },
    });

    component.product = {
      number: 'P-01',
      name: 'Pa Artesanal',
      price: 2.5,
      category: 'OBRADOR',
      image: 'pan.jpg',
      description: 'Pa de pagès artesanal',
      shortDescription: 'Peça de 500g',
      allergens: ['Gluten', 'Sésamo'],
    };

    expect(component.userAllergenConflict).toEqual(['Gluten']);

    // When product doesn't contain user allergens
    component.product = {
      number: 'P-02',
      name: 'Pernil Ibèric',
      price: 18.0,
      category: 'EMBUTIDOS',
      image: 'pernil.jpg',
      description: 'Pernil de gla 100% ibèric',
      shortDescription: 'Sobre de 100g',
      allergens: [],
    };

    expect(component.userAllergenConflict).toEqual([]);
  });

  it('toggles product favorite status via FavoritesService', async () => {
    component.product = {
      number: '01',
      name: 'Jamón Bellota',
      price: 18.0,
      category: 'EMBUTIDOS',
      image: 'jamon.jpg',
      description: 'Jamón 100% ibérico',
      shortDescription: '100g',
    };

    expect(component.favoritesService.isFavorite('01')).toBe(false);
    await component.toggleFavorite();
    expect(component.favoritesService.isFavorite('01')).toBe(true);

    await component.toggleFavorite();
    expect(component.favoritesService.isFavorite('01')).toBe(false);
  });

  it('opens stock alert modal when product is out-of-stock', () => {
    const openModalSpy = vi.spyOn(stockAlertService, 'openAlertModal');

    const outOfStockProd = {
      number: '99',
      name: 'Miel de Romero de Temporada',
      price: 8.5,
      category: 'VÍVERES GOURMET',
      image: '/images/products/miel.jpg',
      inStock: false,
      shortDescription: 'Partida agotada',
      description: 'Miel artesanal del obrador',
    };

    fixture.componentRef.setInput('product', outOfStockProd);
    fixture.detectChanges();

    const alertBtn = fixture.nativeElement.querySelector('.product-detail-alert-button');
    expect(alertBtn).toBeTruthy();
    alertBtn.click();

    expect(openModalSpy).toHaveBeenCalledWith(outOfStockProd);
  });
});
