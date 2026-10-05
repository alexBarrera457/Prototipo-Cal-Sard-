import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store } from './store';
import { loadStoreProducts } from '../../services/products';

describe('Store', () => {
  let component: Store;
  let fixture: ComponentFixture<Store>;

  beforeEach(async () => {
    await loadStoreProducts();

    await TestBed.configureTestingModule({
      imports: [Store],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Store);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters the catalog by category', () => {
    component.selectCategory('CAFÉ GOURMET');

    expect(component.filteredProducts.map(product => product.name)).toEqual([
      'Café 100% Robusta',
      'Café natural 100% arábiga',
      'Café Sarà descafeinado',
      'Pack degustación de café'
    ]);
  });

  it('sorts the catalog by ascending price', () => {
    component.sortOrder = 'price-asc';

    const prices = component.filteredProducts.map(product => product.price);

    expect(prices[0]).toBe(Math.min(...prices));
    expect(prices).toEqual([...prices].sort((first, second) => first - second));
  });
});
