import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnDestroy, Output, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart';
import { formatStorePrice, loadStoreProducts, searchStoreProducts, StoreProduct, storeCategories } from '../../services/products';

type StoreSortOrder = 'featured' | 'name-asc' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-store',
  imports: [RouterLink],
  templateUrl: './store.html',
  styleUrl: './store.css'
})
export class Store implements AfterViewInit, OnDestroy {

  products = signal<StoreProduct[]>([]);
  catalogLoading = signal(true);
  catalogError = signal(false);
  readonly categoryFilters = [
    { label: 'Todos los productos', value: 'TODOS' },
    ...storeCategories
  ];
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
    private elementRef: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.loadCatalog();
      return;
    }

    this.catalogObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        this.catalogObserver?.disconnect();
        this.loadCatalog();
      }
    }, { rootMargin: '420px 0px' });
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
    void loadStoreProducts()
      .then((products) => this.products.set(products))
      .catch(() => this.catalogError.set(true))
      .finally(() => this.catalogLoading.set(false));
  }

  get filteredProducts(): StoreProduct[] {
    const products = this.products();
    let results = this.searchTerm.trim() ? searchStoreProducts(this.searchTerm, products) : products;

    if (this.selectedCategory !== 'TODOS') {
      results = results.filter(product => product.category === this.selectedCategory);
    }

    return [...results].sort((first, second) => {
      switch (this.sortOrder) {
        case 'name-asc':
          return first.name.localeCompare(second.name, 'es');
        case 'price-asc':
          return first.price - second.price;
        case 'price-desc':
          return second.price - first.price;
        default:
          return products.indexOf(first) - products.indexOf(second);
      }
    });
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
  }

  get visibleProducts(): StoreProduct[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  get firstVisibleProduct(): number {
    return this.filteredProducts.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get lastVisibleProduct(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredProducts.length);
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
    return product.priceLabel ?? formatStorePrice(product.price);
  }

  hideUnavailableProductImage(event: Event): void {
    (event.currentTarget as HTMLImageElement).hidden = true;
  }

  updateSortOrder(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === 'featured' || value === 'name-asc' || value === 'price-asc' || value === 'price-desc') {
      this.sortOrder = value;
      this.currentPage = 1;
    }
  }

  addToCart(product: StoreProduct): void {
    this.cartService.addToCart(product.name, product.price);
    const quantity = this.cartService.products().find(item => item.name === product.name)?.quantity ?? 1;
    this.addedProductNumber = product.number;
    this.addedProductMessage = `${product.name} añadido al carrito. Cantidad: ${quantity}.`;
  }

  showProduct(product: StoreProduct): void {
    this.productSelected.emit(product);
  }

}
