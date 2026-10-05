import { Component, DestroyRef, ElementRef, inject, HostListener, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from '../../services/cart';
import { ProductsService, StoreProduct } from '../../services/products';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css', './navbar-menu.css', './navbar-cart.css', './navbar-search.css'],
})
export class Navbar {
  scrolled = false;
  transparentSection = false;
  cartOpen = false;
  mobileMenuOpen = false;
  searchTerm = '';
  searchOpen = false;
  activeSearchResultIndex = -1;
  searchLoading = signal(false);
  private readonly searchResultProducts = signal<StoreProduct[]>([]);
  private searchRequest = 0;
  private loadedSearchQuery = '';
  selectedLanguage = 'es';
  languageNotice = '';

  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productsService = inject(ProductsService);

  constructor(
    public cartService: CartService,
    private router: Router,
    private elementRef: ElementRef<HTMLElement>,
  ) {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.searchTerm = params.get('buscar') ?? '';
      void this.refreshSearchResults(this.searchTerm);
    });
  }

  get searchResults(): StoreProduct[] {
    return this.searchResultProducts();
  }

  get activeSearchResultId(): string | null {
    const activeProduct = this.searchResults[this.activeSearchResultIndex];
    return activeProduct ? `header-search-result-${activeProduct.number}` : null;
  }

  async onSearchInput(value: string): Promise<void> {
    this.searchTerm = value;
    this.searchOpen = Boolean(value.trim());
    this.activeSearchResultIndex = -1;
    await this.refreshSearchResults(value);
  }

  openSearch(): void {
    this.searchOpen = Boolean(this.searchTerm.trim());
    void this.refreshSearchResults(this.searchTerm);
  }

  closeSearch(): void {
    this.searchOpen = false;
    this.activeSearchResultIndex = -1;
  }

  clearSearch(input: HTMLInputElement): void {
    this.searchTerm = '';
    this.searchRequest++;
    this.loadedSearchQuery = '';
    this.searchResultProducts.set([]);
    this.searchLoading.set(false);
    this.closeSearch();
    input.focus();
    void this.router.navigate([], {
      queryParams: { buscar: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const results = this.searchResults;

    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      this.searchOpen = true;
      this.activeSearchResultIndex = (this.activeSearchResultIndex + 1) % results.length;
      this.scrollActiveSearchResultIntoView();
      return;
    }

    if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      this.searchOpen = true;
      this.activeSearchResultIndex =
        this.activeSearchResultIndex < 0
          ? results.length - 1
          : (this.activeSearchResultIndex - 1 + results.length) % results.length;
      this.scrollActiveSearchResultIntoView();
      return;
    }

    if (event.key === 'Enter' && this.searchOpen && this.activeSearchResultIndex >= 0) {
      const product = results[this.activeSearchResultIndex];

      if (product) {
        event.preventDefault();
        this.closeSearch();
        void this.router.navigate(['/tienda-online'], {
          queryParams: { producto: product.number, buscar: this.searchTerm.trim() },
        });
      }

      return;
    }

    if (event.key === 'Escape' && this.searchOpen) {
      event.preventDefault();
      event.stopPropagation();
      this.closeSearch();
      return;
    }

    if (event.key === 'Tab') {
      this.closeSearch();
    }
  }

  setActiveSearchResult(index: number): void {
    this.activeSearchResultIndex = index;
  }

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const languageNames: Record<string, string> = {
      ca: 'catalán',
      en: 'inglés',
      fr: 'francés',
    };
    const requestedLanguage = select.value;

    if (requestedLanguage === 'es') {
      this.languageNotice = '';
      this.selectedLanguage = 'es';
      return;
    }

    this.languageNotice = `La versión en ${languageNames[requestedLanguage] ?? 'ese idioma'} todavía no está traducida. Mantenemos la web en español.`;
    this.selectedLanguage = 'es';
    select.value = 'es';
  }

  private scrollActiveSearchResultIntoView(): void {
    const activeResultId = this.activeSearchResultId;

    if (!activeResultId || typeof requestAnimationFrame === 'undefined') {
      return;
    }

    requestAnimationFrame(() => {
      const activeResult = document.getElementById(activeResultId);

      if (activeResult && typeof activeResult.scrollIntoView === 'function') {
        activeResult.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  submitSearch(event: Event): void {
    event.preventDefault();
    const query = this.searchTerm.trim();

    if (!query) {
      return;
    }

    this.closeSearch();
    void this.router.navigate(['/tienda-online'], { queryParams: { buscar: query } });
  }

  private async refreshSearchResults(query: string): Promise<void> {
    const normalizedQuery = query.trim();
    const request = ++this.searchRequest;

    if (!normalizedQuery) {
      this.loadedSearchQuery = '';
      this.searchResultProducts.set([]);
      this.searchLoading.set(false);
      return;
    }

    if (this.loadedSearchQuery === normalizedQuery) {
      return;
    }

    this.searchLoading.set(true);
    try {
      const results = await this.productsService.search(normalizedQuery, 5);
      if (request !== this.searchRequest) return;
      this.searchResultProducts.set(results);
      this.loadedSearchQuery = normalizedQuery;
    } catch {
      if (request === this.searchRequest) {
        this.searchResultProducts.set([]);
        this.loadedSearchQuery = normalizedQuery;
      }
    } finally {
      if (request === this.searchRequest) this.searchLoading.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const searchForm = this.elementRef.nativeElement.querySelector('.header-search-form');

    if (searchForm && !searchForm.contains(event.target as Node)) {
      this.closeSearch();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollPosition = window.scrollY;

    const categories = document.getElementById('categorias');

    this.scrolled = scrollPosition > 80;

    if (categories) {
      const rect = categories.getBoundingClientRect();

      this.transparentSection = rect.top <= 100 && rect.bottom >= 100;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSearch();

    if (this.cartOpen) {
      this.closeCart();
    }

    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  toggleCart(): void {
    this.cartOpen = !this.cartOpen;
    this.lockBodyScroll(this.cartOpen);

    if (this.cartOpen) {
      this.mobileMenuOpen = false;
      this.lockBodyScroll(true);
    }
  }

  closeCart(): void {
    this.cartOpen = false;
    this.lockBodyScroll(false);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;

    if (this.mobileMenuOpen) {
      this.cartOpen = false;
      this.lockBodyScroll(true);
    } else {
      this.lockBodyScroll(false);
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.lockBodyScroll(false);
  }

  private lockBodyScroll(shouldLock: boolean): void {
    const body = document.body;

    if (!body) {
      return;
    }

    body.style.overflow = shouldLock ? 'hidden' : '';
  }
}
