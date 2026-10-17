import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store } from './store';
import { loadStoreProducts } from '../../services/products';
import { StockAlertService } from '../../services/stock-alerts';

describe('Store', () => {
  let component: Store;
  let fixture: ComponentFixture<Store>;

  beforeEach(async () => {
    await loadStoreProducts();

    await TestBed.configureTestingModule({
      imports: [Store],
      providers: [provideRouter([])],
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

    expect(component.filteredProducts().map((product) => product.name)).toEqual([
      'Café 100% Robusta',
      'Café natural 100% arábiga',
      'Café Sarà descafeinado',
      'Pack degustación de café',
    ]);
  });

  it('sorts the catalog by ascending price', () => {
    component.sortOrder.set('price-asc');

    const prices = component.filteredProducts().map((product) => product.price);

    expect(prices[0]).toBe(Math.min(...prices));
    expect(prices).toEqual([...prices].sort((first, second) => first - second));
  });

  it('filters the catalog by search term signal', () => {
    component.searchTerm.set('jamón');

    expect(component.filteredProducts().length).toBeGreaterThan(0);
    expect(
      component
        .filteredProducts()
        .every(
          (product) =>
            product.name.toLowerCase().includes('jam') ||
            product.description.toLowerCase().includes('jam') ||
            product.category.toLowerCase().includes('jam') ||
            product.shortDescription.toLowerCase().includes('jam'),
        ),
    ).toBe(true);
  });

  it('navigates pages and computes pagination signals', () => {
    expect(component.currentPage()).toBe(1);
    expect(component.pageCount()).toBeGreaterThan(1);
    expect(component.visibleProducts().length).toBe(component.pageSize);

    component.goToPage(2);
    expect(component.currentPage()).toBe(2);
    expect(component.firstVisibleProduct()).toBe(component.pageSize + 1);
  });

  it('filters catalog when gluten-free and lactose-free filters are toggled', () => {
    expect(component.glutenFreeFilter()).toBe(false);
    expect(component.lactoseFreeFilter()).toBe(false);

    const totalInitial = component.filteredProducts().length;

    // Toggle gluten free
    component.toggleGlutenFree();
    expect(component.glutenFreeFilter()).toBe(true);
    expect(component.currentPage()).toBe(1);

    const glutenFreeCount = component.filteredProducts().length;
    expect(glutenFreeCount).toBeGreaterThan(0);
    expect(glutenFreeCount).toBeLessThanOrEqual(totalInitial);
    expect(component.filteredProducts().every((p) => component.isGlutenFree(p))).toBe(true);

    // Toggle lactose free as well
    component.toggleLactoseFree();
    expect(component.lactoseFreeFilter()).toBe(true);
    expect(
      component
        .filteredProducts()
        .every((p) => component.isGlutenFree(p) && component.isLactoseFree(p)),
    ).toBe(true);

    // Untoggle
    component.toggleGlutenFree();
    expect(component.glutenFreeFilter()).toBe(false);
    expect(component.filteredProducts().every((p) => component.isLactoseFree(p))).toBe(true);

    component.toggleLactoseFree();
    expect(component.lactoseFreeFilter()).toBe(false);
    expect(component.filteredProducts().length).toBe(totalInitial);
  });

  it('toggles product favorite status when clicking heart button', async () => {
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as Event;

    expect(component.favoritesService.isFavorite('01')).toBe(false);
    await component.toggleFavorite('01', mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(component.favoritesService.isFavorite('01')).toBe(true);

    await component.toggleFavorite('01', mockEvent);
    expect(component.favoritesService.isFavorite('01')).toBe(false);
  });

  it('opens stock alert modal when clicking stock alert button on out-of-stock product', () => {
    const stockAlertService = TestBed.inject(StockAlertService);
    const openModalSpy = vi.spyOn(stockAlertService, 'openAlertModal');

    component.products.update((items) =>
      items.map((p) => (p.number === '01' ? { ...p, inStock: false } : p)),
    );
    fixture.detectChanges();

    const alertBtn = fixture.nativeElement.querySelector('.store-alert-button');
    expect(alertBtn).toBeTruthy();
    alertBtn.click();

    expect(openModalSpy).toHaveBeenCalled();
  });

  it('resets all active filters and search terms', () => {
    component.selectCategory('CAFÉ GOURMET');
    component.glutenFreeFilter.set(true);
    component.lactoseFreeFilter.set(true);
    component.searchTerm.set('arábiga');

    expect(component.selectedCategory()).toBe('CAFÉ GOURMET');
    expect(component.glutenFreeFilter()).toBe(true);

    component.resetFilters();

    expect(component.selectedCategory()).toBe('TODOS');
    expect(component.glutenFreeFilter()).toBe(false);
    expect(component.lactoseFreeFilter()).toBe(false);
    expect(component.searchTerm()).toBe('');
    expect(component.currentPage()).toBe(1);
  });
});
