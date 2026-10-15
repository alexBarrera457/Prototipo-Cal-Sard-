import { Component, DestroyRef, ElementRef, inject, HostListener, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { CartService } from '../../services/cart';
import { AuthService } from '../../services/auth';
import { I18nService } from '../../services/i18n';
import { getProductSlug, ProductsService, StoreProduct } from '../../services/products';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, NgOptimizedImage],
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
  private readonly searchSubject$ = new Subject<string>();
  private pendingSearchResolvers: Array<() => void> = [];
  private searchRequest = 0;
  private loadedSearchQuery = '';
  languageNotice = '';
  private cartTriggerElement: HTMLElement | null = null;
  private menuTriggerElement: HTMLElement | null = null;
  public readonly cartLiveMessage = signal<string>('');

  public readonly auth = inject(AuthService);
  public readonly i18n = inject(I18nService);

  get selectedLanguage(): string {
    return this.i18n.currentLang();
  }

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

    this.searchSubject$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap(async (query) => {
          try {
            await this.refreshSearchResults(query);
          } finally {
            const resolvers = this.pendingSearchResolvers;
            this.pendingSearchResolvers = [];
            resolvers.forEach((resolve) => resolve());
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  get searchResults(): StoreProduct[] {
    return this.searchResultProducts();
  }

  getProductSlug(product: StoreProduct): string {
    return getProductSlug(product);
  }

  get activeSearchResultId(): string | null {
    const activeProduct = this.searchResults[this.activeSearchResultIndex];
    return activeProduct ? `header-search-result-${activeProduct.number}` : null;
  }

  async onSearchInput(value: string): Promise<void> {
    this.searchTerm = value;
    this.searchOpen = Boolean(value.trim());
    this.activeSearchResultIndex = -1;

    if (!value.trim()) {
      await this.refreshSearchResults('');
      return;
    }

    return new Promise<void>((resolve) => {
      this.pendingSearchResolvers.push(resolve);
      this.searchSubject$.next(value.trim());
    });
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
    const resolvers = this.pendingSearchResolvers;
    this.pendingSearchResolvers = [];
    resolvers.forEach((resolve) => resolve());

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
        void this.router.navigate(['/tienda-online/producto', getProductSlug(product)]);
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
    const requestedLanguage = select.value as 'ca' | 'es' | 'en' | 'fr';

    if (requestedLanguage === 'ca' || requestedLanguage === 'es') {
      this.i18n.setLanguage(requestedLanguage);
      this.languageNotice = '';
      return;
    }

    const isCa = this.i18n.currentLang() === 'ca';
    const languageNames: Record<string, string> = {
      en: isCa ? 'anglès' : 'inglés',
      fr: isCa ? 'francès' : 'francés',
    };
    this.languageNotice = isCa
      ? `La versió en ${languageNames[requestedLanguage] ?? 'aquest idioma'} encara no està disponible. Mantenim el web en català.`
      : `La versión en ${languageNames[requestedLanguage] ?? 'ese idioma'} todavía no está traducida. Mantenemos la web en español.`;
    select.value = this.i18n.currentLang();
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

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    if (this.cartOpen) {
      this.trapFocus(event, '#cart-panel');
    } else if (this.mobileMenuOpen) {
      this.trapFocus(event, '#site-menu');
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
    if (this.cartOpen) {
      this.closeCart();
    } else {
      this.openCart();
    }
  }

  openCart(trigger?: HTMLElement): void {
    this.cartTriggerElement =
      trigger ?? (typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null);
    this.cartOpen = true;
    this.mobileMenuOpen = false;
    this.lockBodyScroll(true);
    this.focusInitialElement('#cart-panel');
  }

  closeCart(): void {
    if (!this.cartOpen) {
      return;
    }
    this.cartOpen = false;
    this.lockBodyScroll(false);
    this.restoreFocus(this.cartTriggerElement);
    this.cartTriggerElement = null;
  }

  toggleMobileMenu(): void {
    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  openMobileMenu(trigger?: HTMLElement): void {
    this.menuTriggerElement =
      trigger ?? (typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null);
    this.mobileMenuOpen = true;
    this.cartOpen = false;
    this.lockBodyScroll(true);
    this.focusInitialElement('#site-menu');
  }

  closeMobileMenu(): void {
    if (!this.mobileMenuOpen) {
      return;
    }
    this.mobileMenuOpen = false;
    this.lockBodyScroll(false);
    this.restoreFocus(this.menuTriggerElement);
    this.menuTriggerElement = null;
  }

  increaseCartItem(
    name: string,
    price: number,
    currentQuantity: number,
    productNumber?: string,
    image?: string,
  ): void {
    this.cartService.addToCart(name, price, 1, productNumber, image);
    this.cartLiveMessage.set(`${name}: una unidad añadida. Total: ${currentQuantity + 1}.`);
  }

  decreaseCartItem(name: string, currentQuantity: number): void {
    this.cartService.removeFromCart(name);
    if (currentQuantity > 1) {
      this.cartLiveMessage.set(`${name}: una unidad restada. Total: ${currentQuantity - 1}.`);
    } else {
      this.cartLiveMessage.set(`${name} eliminado de la cesta.`);
    }
  }

  deleteCartItem(name: string): void {
    this.cartService.deleteProduct(name);
    this.cartLiveMessage.set(`${name} eliminado de la cesta.`);
  }

  private focusInitialElement(containerSelector: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = this.elementRef?.nativeElement ?? document;
    const container = root.querySelector(containerSelector) as HTMLElement | null;
    if (!container) return;

    const focusables = this.getFocusableElements(container);
    if (focusables.length > 0) {
      focusables[0].focus();
    }
  }

  private restoreFocus(element: HTMLElement | null): void {
    if (!element || typeof element.focus !== 'function') {
      return;
    }
    element.focus();
  }

  private trapFocus(event: KeyboardEvent, containerSelector: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = this.elementRef?.nativeElement ?? document;
    const container = root.querySelector(containerSelector) as HTMLElement | null;
    if (!container) {
      return;
    }

    const focusables = this.getFocusableElements(container);
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (!active || active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (!active || active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
    return items.filter((el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      return el.tabIndex !== -1;
    });
  }

  private lockBodyScroll(shouldLock: boolean): void {
    const body = document.body;

    if (!body) {
      return;
    }

    body.style.overflow = shouldLock ? 'hidden' : '';
  }
}
