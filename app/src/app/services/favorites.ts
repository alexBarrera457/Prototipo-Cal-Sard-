import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth';
import { ProductsService, type StoreProduct } from './products';
import { CartService } from './cart';

const FAVORITES_STORAGE_KEY = 'cal_sarda_favorites';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly auth = inject(AuthService);
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);

  private readonly guestFavorites = signal<string[]>([]);

  readonly favorites = computed<string[]>(() => {
    const user = this.auth.currentUser();
    if (user) {
      return user.favorites && Array.isArray(user.favorites) ? user.favorites : [];
    }
    return this.guestFavorites();
  });

  readonly favoritesCount = computed(() => this.favorites().length);

  constructor() {
    this.restoreGuestFavorites();
  }

  private restoreGuestFavorites(): void {
    const list = this.loadFromLocalStorage();
    this.guestFavorites.set(list);
  }

  private loadFromLocalStorage(): string[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Ignorar excepciones
    }
    return [];
  }

  private persistToLocalStorage(list: string[]): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignorar excepciones
    }
  }

  isFavorite(productNumber: string): boolean {
    if (!productNumber) return false;
    return this.favorites().includes(productNumber);
  }

  async toggleFavorite(productNumber: string): Promise<boolean> {
    if (!productNumber) return false;
    const current = this.favorites();
    const exists = current.includes(productNumber);
    const updated = exists
      ? current.filter((num) => num !== productNumber)
      : [...current, productNumber];

    this.persistToLocalStorage(updated);

    if (this.auth.isAuthenticated()) {
      await this.auth.updateProfile({ favorites: updated });
    } else {
      this.guestFavorites.set(updated);
    }

    return !exists;
  }

  async addFavorite(productNumber: string): Promise<void> {
    if (!productNumber || this.isFavorite(productNumber)) return;
    const updated = [...this.favorites(), productNumber];
    this.persistToLocalStorage(updated);

    if (this.auth.isAuthenticated()) {
      await this.auth.updateProfile({ favorites: updated });
    } else {
      this.guestFavorites.set(updated);
    }
  }

  async removeFavorite(productNumber: string): Promise<void> {
    if (!productNumber || !this.isFavorite(productNumber)) return;
    const updated = this.favorites().filter((num) => num !== productNumber);
    this.persistToLocalStorage(updated);

    if (this.auth.isAuthenticated()) {
      await this.auth.updateProfile({ favorites: updated });
    } else {
      this.guestFavorites.set(updated);
    }
  }

  async getFavoriteProducts(): Promise<StoreProduct[]> {
    const favoriteIds = this.favorites();
    if (favoriteIds.length === 0) return [];

    const allProducts = await this.productsService.getProducts();
    const map = new Map<string, StoreProduct>();
    for (const p of allProducts) {
      map.set(p.number, p);
    }

    const result: StoreProduct[] = [];
    for (const id of favoriteIds) {
      const found = map.get(id);
      if (found) {
        result.push(found);
      }
    }
    return result;
  }

  async addAllFavoritesToCart(): Promise<{ addedCount: number; outOfStockCount: number }> {
    const favoriteProducts = await this.getFavoriteProducts();
    let addedCount = 0;
    let outOfStockCount = 0;

    for (const product of favoriteProducts) {
      if (product.inStock === false) {
        outOfStockCount++;
      } else {
        this.cartService.addToCart(product.name, product.price, 1, product.number, product.image);
        addedCount++;
      }
    }

    return { addedCount, outOfStockCount };
  }
}
