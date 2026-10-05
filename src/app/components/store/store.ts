import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  imports: [RouterLink],
  templateUrl: './store.html',
  styleUrl: './store.css',
})
export class Store implements AfterViewInit, OnDestroy {
  products = signal<StoreProduct[]>([]);
  catalogLoading = signal(true);
  catalogError = signal(false);
  readonly categoryFilters: { label: string; value: string }[];
  selectedCategory = 'TODOS';
  sortOrder: StoreSortOrder = 'featured';
  currentPage = 1;
  readonly pageSize = 24;
  addedProductNumber: string | null = null;
  addedProductMessage = '';
  private currentSearchTerm = '';
  private catalogRequested = false;
  private catalogObserver?: IntersectionObserver;

  @Input()
  set searchTerm(value: string) {
    this.currentSearchTerm = value;
    this.currentPage = 1;
  }

  get searchTerm(): string {
    return this.currentSearchTerm;
  }

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

  get filteredProducts(): StoreProduct[] {
    return this.productsService.filterAndSort(this.products(), {
      searchTerm: this.searchTerm,
      category: this.selectedCategory,
      sortOrder: this.sortOrder,
    });
  }

  get pagination(): PaginatedResult<StoreProduct> {
    return this.productsService.paginate(this.filteredProducts, this.currentPage, this.pageSize);
  }

  get pageCount(): number {
    return this.pagination.pageCount;
  }

  get visibleProducts(): StoreProduct[] {
    return this.pagination.items;
  }

  get firstVisibleProduct(): number {
    return this.pagination.firstItemIndex;
  }

  get lastVisibleProduct(): number {
    return this.pagination.lastItemIndex;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pageCount) {
      this.currentPage = page;
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
      this.sortOrder = value;
      this.currentPage = 1;
    }
  }

  addToCart(product: StoreProduct): void {
    this.cartService.addToCart(product.name, product.price);
    const quantity =
      this.cartService.products().find((item) => item.name === product.name)?.quantity ?? 1;
    this.addedProductNumber = product.number;
    this.addedProductMessage = `${product.name} añadido al carrito. Cantidad: ${quantity}.`;
  }

  showProduct(product: StoreProduct): void {
    this.productSelected.emit(product);
  }
}
