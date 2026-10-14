import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { ProductsService } from '../../services/products';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('moves through search results with the arrow keys', async () => {
    await component.onSearchInput('a');

    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    component.onSearchKeydown(down);
    expect(down.defaultPrevented).toBe(true);
    expect(component.activeSearchResultIndex).toBe(0);

    component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(component.activeSearchResultIndex).toBe(1);

    component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }));
    expect(component.activeSearchResultIndex).toBe(0);
  });

  it('opens the active search result with Enter and closes on Escape', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.onSearchInput('cafe');
    component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));

    expect(navigate).toHaveBeenCalledWith(['/tienda-online/producto', 'pack-degustacion-de-cafe']);
    expect(component.searchOpen).toBe(false);

    await component.onSearchInput('chocolate');
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    component.onSearchKeydown(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(component.searchOpen).toBe(false);
  });

  it('debounces rapid search input calls and only searches for the last query', async () => {
    const productsService = TestBed.inject(ProductsService);
    const searchSpy = vi.spyOn(productsService, 'search');

    component.onSearchInput('c');
    component.onSearchInput('ca');
    const finalSearchPromise = component.onSearchInput('cafe');

    expect(searchSpy).not.toHaveBeenCalled();

    await finalSearchPromise;

    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(searchSpy).toHaveBeenCalledWith('cafe', 5);
  });

  it('switches dynamically to Catalan without warning messages', () => {
    const event = {
      target: { value: 'ca' },
    } as unknown as Event;

    component.onLanguageChange(event);

    expect(component.selectedLanguage).toBe('ca');
    expect(component.languageNotice).toBe('');
    expect(component.i18n.currentLang()).toBe('ca');
  });

  it('shows notice when selecting unsupported language and preserves current language', () => {
    component.i18n.setLanguage('es');
    const mockSelect = { value: 'en' } as HTMLSelectElement;
    const event = { target: mockSelect } as unknown as Event;

    component.onLanguageChange(event);

    expect(component.languageNotice).toContain('inglés');
    expect(component.selectedLanguage).toBe('es');
    expect(mockSelect.value).toBe('es');
  });

  it('traps focus inside the cart panel and restores focus to the trigger on close', () => {
    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    component.openCart(triggerBtn);
    expect(component.cartOpen).toBe(true);

    const cartPanel = fixture.nativeElement.querySelector('#cart-panel') as HTMLElement;
    expect(cartPanel).toBeTruthy();

    const focusables = cartPanel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    expect(focusables.length).toBeGreaterThan(0);
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    // Shift+Tab from first element wraps to last
    firstFocusable.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      cancelable: true,
    });
    component.onDocumentKeydown(shiftTabEvent);
    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(lastFocusable);

    // Tab from last element wraps to first
    lastFocusable.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      cancelable: true,
    });
    component.onDocumentKeydown(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(firstFocusable);

    // Closing cart restores focus to trigger
    const focusSpy = vi.spyOn(triggerBtn, 'focus');
    component.closeCart();
    expect(component.cartOpen).toBe(false);
    expect(focusSpy).toHaveBeenCalled();

    triggerBtn.remove();
  });

  it('traps focus inside mobile menu and restores focus to the menu trigger on close', () => {
    const menuBtn = document.createElement('button');
    document.body.appendChild(menuBtn);
    menuBtn.focus();

    component.openMobileMenu(menuBtn);
    expect(component.mobileMenuOpen).toBe(true);

    const siteMenu = fixture.nativeElement.querySelector('#site-menu') as HTMLElement;
    expect(siteMenu).toBeTruthy();

    const focusables = siteMenu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    expect(focusables.length).toBeGreaterThan(0);
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    // Shift+Tab on first element wraps to last
    firstFocusable.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      cancelable: true,
    });
    component.onDocumentKeydown(shiftTabEvent);
    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(lastFocusable);

    // Tab on last element wraps to first
    lastFocusable.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      cancelable: true,
    });
    component.onDocumentKeydown(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(firstFocusable);

    // Closing menu restores focus to trigger
    const focusSpy = vi.spyOn(menuBtn, 'focus');
    component.closeMobileMenu();
    expect(component.mobileMenuOpen).toBe(false);
    expect(focusSpy).toHaveBeenCalled();

    menuBtn.remove();
  });

  it('restores focus when Escape closes the cart or mobile menu', () => {
    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();

    const focusSpy = vi.spyOn(triggerBtn, 'focus');

    // Test with cart open
    component.openCart(triggerBtn);
    expect(component.cartOpen).toBe(true);
    component.onEscape();
    expect(component.cartOpen).toBe(false);
    expect(focusSpy).toHaveBeenCalledTimes(1);

    // Test with mobile menu open
    component.openMobileMenu(triggerBtn);
    expect(component.mobileMenuOpen).toBe(true);
    component.onEscape();
    expect(component.mobileMenuOpen).toBe(false);
    expect(focusSpy).toHaveBeenCalledTimes(2);

    triggerBtn.remove();
  });

  it('updates cartLiveMessage when adjusting or deleting cart items', () => {
    component.increaseCartItem('Llonganissa de Vic', 8.5, 1, 'LL-01', '/images/llonganissa.jpg');
    expect(component.cartLiveMessage()).toContain('Llonganissa de Vic');
    expect(component.cartLiveMessage()).toContain('Total: 2');

    component.decreaseCartItem('Llonganissa de Vic', 2);
    expect(component.cartLiveMessage()).toContain('Llonganissa de Vic');
    expect(component.cartLiveMessage()).toContain('Total: 1');

    component.deleteCartItem('Llonganissa de Vic');
    expect(component.cartLiveMessage()).toContain('eliminado de la cesta');
  });
});
