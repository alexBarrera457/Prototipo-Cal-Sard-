import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductDetail } from './product-detail';
import { CartService } from '../../services/cart';

describe('ProductDetail', () => {
  let component: ProductDetail;
  let fixture: ComponentFixture<ProductDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
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
});
