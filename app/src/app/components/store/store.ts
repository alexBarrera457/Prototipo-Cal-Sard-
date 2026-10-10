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
  model,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart';
import {
  PaginatedResult,
  ProductsService,
  StoreProduct,
  StoreSortOrder,
} from '../../services/products';

@Component({
  selector: 'app-store',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './store.html',
  styleUrl: './store.css',
})
export class Store implements AfterViewInit, OnDestroy {
  searchTerm = model<string>('');
  products = signal<StoreProduct[]>([]);
  catalogLoading = signal(true);
  catalogError = signal(false);
  readonly categoryFilters: { label: string; value: string }[];
  selectedCategory = signal('TODOS');
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

  addToCart(product: StoreProduct): void {
    this.cartService.addToCart(product.name, product.price, 1, product.number, product.image);
    const quantity =
      this.cartService.products().find((item) => item.name === product.name)?.quantity ?? 1;
    this.addedProductNumber = product.number;
    this.addedProductMessage = `${product.name} añadido a la cesta. Cantidad: ${quantity}.`;
  }

  showProduct(product: StoreProduct): void {
    this.productSelected.emit(product);
  }
}
