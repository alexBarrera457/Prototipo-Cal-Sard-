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
    expect(addToCartSpy).toHaveBeenCalledWith('Fuet artesano', 5.5, 3);
    expect(component.addedToCartMessage).toBe('3 unidades añadidas a la cesta.');
  });
});
