import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  OnDestroy,
  Output,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  model,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart';
import { I18nService } from '../../services/i18n';
import {
  getProductSlug,
  isGlutenFree,
  isLactoseFree,
  PaginatedResult,
  ProductsService,
  StoreProduct,
  StoreSortOrder,
} from '../../services/products';
import { AuthService } from '../../services/auth';
import { FavoritesService } from '../../services/favorites';
import { StockAlertService } from '../../services/stock-alerts';

@Component({
  selector: 'app-store',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './store.html',
  styleUrl: './store.css',
})
export class Store implements AfterViewInit, OnDestroy {
  public readonly i18n = inject(I18nService);
  public readonly auth = inject(AuthService, { optional: true });
  public readonly favoritesService = inject(FavoritesService);
  public readonly stockAlertService = inject(StockAlertService);
  searchTerm = model<string>('');
  products = signal<StoreProduct[]>([]);
  catalogLoading = signal(true);
  catalogError = signal(false);
  readonly categoryFilters: { label: string; value: string }[];
  selectedCategory = signal('TODOS');
  glutenFreeFilter = signal(false);
  lactoseFreeFilter = signal(false);
  sortOrder = signal<StoreSortOrder>('featured');
  currentPage = signal(1);
  readonly pageSize = 24;
  addedProductNumber: string | null = null;
  addedProductMessage = '';
  private catalogRequested = false;
  private catalogObserver?: IntersectionObserver;

  readonly filteredProducts = computed<StoreProduct[]>(() => {
    return this.productsService.filterAndSort(this.products(), {
      searchTerm: this.searchTerm(),
      category: this.selectedCategory(),
      sortOrder: this.sortOrder(),
      glutenFreeOnly: this.glutenFreeFilter(),
      lactoseFreeOnly: this.lactoseFreeFilter(),
    });
  });

  readonly pagination = computed<PaginatedResult<StoreProduct>>(() => {
    return this.productsService.paginate(
      this.filteredProducts(),
      this.currentPage(),
      this.pageSize,
    );
  });

  readonly pageCount = computed<number>(() => this.pagination().pageCount);
  readonly visibleProducts = computed<StoreProduct[]>(() => this.pagination().items);
  readonly firstVisibleProduct = computed<number>(() => this.pagination().firstItemIndex);
  readonly lastVisibleProduct = computed<number>(() => this.pagination().lastItemIndex);

  @Output() productSelected = new EventEmitter<StoreProduct>();

  constructor(
    private cartService: CartService,
    private productsService: ProductsService,
    private elementRef: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    this.categoryFilters = [
      { label: 'Todos los productos', value: 'TODOS' },
      ...this.productsService.categories,
    ];

    effect(() => {
      // Track searchTerm changes and reset page to 1
      this.searchTerm();
      untracked(() => this.currentPage.set(1));
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.loadCatalog();
      return;
    }

    this.catalogObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.catalogObserver?.disconnect();
          this.loadCatalog();
        }
      },
      { rootMargin: '420px 0px' },
    );
    this.catalogObserver.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.catalogObserver?.disconnect();
  }

  private loadCatalog(): void {
    if (this.catalogRequested) {
      return;
    }

    this.catalogRequested = true;
    void this.productsService
      .getProducts()
      .then((products) => this.products.set(products))
      .catch(() => this.catalogError.set(true))
      .finally(() => this.catalogLoading.set(false));
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
  }

  toggleGlutenFree(): void {
    this.glutenFreeFilter.update((v) => !v);
    this.currentPage.set(1);
  }

  toggleLactoseFree(): void {
    this.lactoseFreeFilter.update((v) => !v);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.selectedCategory.set('TODOS');
    this.glutenFreeFilter.set(false);
    this.lactoseFreeFilter.set(false);
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  isGlutenFree(product: StoreProduct): boolean {
    return isGlutenFree(product);
  }

  isLactoseFree(product: StoreProduct): boolean {
    return isLactoseFree(product);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pageCount()) {
      this.currentPage.set(page);
    }
  }

  formatProductPrice(product: StoreProduct): string {
    return product.priceLabel ?? this.productsService.formatPrice(product.price);
  }

  hideUnavailableProductImage(event: Event): void {
    (event.currentTarget as HTMLImageElement).hidden = true;
  }

  updateSortOrder(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (
      value === 'featured' ||
      value === 'name-asc' ||
      value === 'price-asc' ||
      value === 'price-desc'
    ) {
      this.sortOrder.set(value);
      this.currentPage.set(1);
    }
  }

  getUserAllergenConflicts(product: StoreProduct): string[] {
    const user = this.auth?.currentUser();
    const userAllergens = user?.preferences?.allergens;
    if (
      !userAllergens ||
      userAllergens.length === 0 ||
      !product.allergens ||
      product.allergens.length === 0
    ) {
      return [];
    }
    return product.allergens.filter((pa) =>
      userAllergens.some(
        (ua) =>
          pa.toLowerCase().includes(ua.toLowerCase()) ||
          ua.toLowerCase().includes(pa.toLowerCase()),
      ),
    );
  }

  addToCart(product: StoreProduct): void {
    this.cartService.addToCart(product.name, product.price, 1, product.number, product.image);
    const quantity =
      this.cartService.products().find((item) => item.name === product.name)?.quantity ?? 1;
    this.addedProductNumber = product.number;
    const conflicts = this.getUserAllergenConflicts(product);
    const isCa = this.i18n.currentLang() === 'ca';
    if (conflicts.length > 0) {
      this.addedProductMessage = isCa
        ? `⚠️ Atenció: ${product.name} conté ${conflicts.join(', ')} (al·lèrgen marcat). Afegit a la cistella (${quantity}).`
        : `⚠️ Atención: ${product.name} contiene ${conflicts.join(', ')} (alérgeno registrado). Añadido a la cesta (${quantity}).`;
    } else {
      this.addedProductMessage = isCa
        ? `${product.name} afegit a la cistella. Quantitat: ${quantity}.`
        : `${product.name} añadido a la cesta. Cantidad: ${quantity}.`;
    }
  }

  getProductSlug(product: StoreProduct): string {
    return getProductSlug(product);
  }

  async toggleFavorite(productNumber: string, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    await this.favoritesService.toggleFavorite(productNumber);
  }

  showProduct(product: StoreProduct): void {
    this.productSelected.emit(product);
  }
}
