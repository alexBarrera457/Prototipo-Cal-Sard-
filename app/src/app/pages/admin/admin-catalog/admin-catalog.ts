import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService, type StoreProduct, type StoreCategory } from '../../../services/products';
import { I18nService } from '../../../services/i18n';

export interface ProductEditForm {
  number: string;
  name: string;
  category: string;
  price: number;
  shortDescription: string;
  description: string;
  allergensText: string;
  inStock: boolean;
  featured: boolean;
}

@Component({
  selector: 'app-admin-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-catalog.html',
  styleUrl: './admin-catalog.css',
})
export class AdminCatalog implements OnInit {
  readonly productsService = inject(ProductsService);
  readonly i18n = inject(I18nService);

  readonly allProducts = signal<StoreProduct[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly categoryFilter = signal<string>('todos');
  readonly stockFilter = signal<string>('todos'); // 'todos' | 'in_stock' | 'out_of_stock'
  readonly featuredFilter = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  searchQueryModel = '';

  // Paginación
  readonly currentPage = signal<number>(1);
  readonly pageSize = 12;

  // Estado del modal de edición
  readonly editingProduct = signal<StoreProduct | null>(null);
  editForm: ProductEditForm = {
    number: '',
    name: '',
    category: '',
    price: 0,
    shortDescription: '',
    description: '',
    allergensText: '',
    inStock: true,
    featured: false,
  };
  readonly isSaving = signal<boolean>(false);
  readonly feedbackMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly updatingProductNumber = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadCatalog();
  }

  async loadCatalog(): Promise<void> {
    this.isLoading.set(true);
    try {
      const items = await this.productsService.getProducts();
      this.allProducts.set([...items]);
    } finally {
      this.isLoading.set(false);
    }
  }

  readonly categories = computed<StoreCategory[]>(() => this.productsService.categories);

  // Estadísticas operacionales del catálogo
  readonly catalogStats = computed(() => {
    const products = this.allProducts();
    const total = products.length;
    const inStock = products.filter((p) => p.inStock !== false).length;
    const outOfStock = total - inStock;
    const featured = products.filter((p) => Boolean(p.featured)).length;
    return { total, inStock, outOfStock, featured };
  });

  // Productos filtrados según búsqueda, categoría y disponibilidad
  readonly filteredProducts = computed(() => {
    const products = this.allProducts();
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.categoryFilter();
    const stock = this.stockFilter();
    const featuredOnly = this.featuredFilter();

    return products.filter((product) => {
      // 1. Categoría
      if (cat !== 'todos' && product.category !== cat) {
        return false;
      }

      // 2. Disponibilidad / Stock
      if (stock === 'in_stock' && product.inStock === false) {
        return false;
      }
      if (stock === 'out_of_stock' && product.inStock !== false) {
        return false;
      }

      // 3. Destacados
      if (featuredOnly && !product.featured) {
        return false;
      }

      // 4. Búsqueda de texto
      if (query) {
        const numMatch = product.number.toLowerCase().includes(query);
        const nameMatch = product.name.toLowerCase().includes(query);
        const catMatch = product.category.toLowerCase().includes(query);
        const descMatch = product.shortDescription?.toLowerCase().includes(query) ?? false;
        if (!numMatch && !nameMatch && !catMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });
  });

  readonly totalFiltered = computed(() => this.filteredProducts().length);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalFiltered() / this.pageSize)),
  );
  readonly firstItemIndex = computed(() =>
    this.totalFiltered() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1,
  );
  readonly lastItemIndex = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.totalFiltered()),
  );

  readonly paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredProducts().slice(start, start + this.pageSize);
  });

  onSearchInput(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchQueryModel = '';
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  setCategoryFilter(val: string): void {
    this.categoryFilter.set(val);
    this.currentPage.set(1);
  }

  setStockFilter(val: string): void {
    this.stockFilter.set(val);
    this.currentPage.set(1);
  }

  toggleFeaturedFilter(): void {
    this.featuredFilter.update((f) => !f);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // Toggle rápido de stock
  async toggleStock(product: StoreProduct): Promise<void> {
    const newStock = product.inStock === false;
    this.updatingProductNumber.set(product.number);

    // Actualización optimista local
    this.allProducts.update((items) =>
      items.map((p) => (p.number === product.number ? { ...p, inStock: newStock } : p)),
    );

    try {
      await this.productsService.updateProduct(product.number, { inStock: newStock });
      this.showToast(
        'success',
        `${product.name}: ${newStock ? this.i18n.t('admin.badge_in_stock') : this.i18n.t('admin.badge_out_of_stock')}`,
      );
    } catch {
      // Revertir
      this.allProducts.update((items) =>
        items.map((p) => (p.number === product.number ? { ...p, inStock: !newStock } : p)),
      );
      this.showToast('error', this.i18n.t('admin.save_error'));
    } finally {
      this.updatingProductNumber.set(null);
    }
  }

  // Toggle rápido de destacado
  async toggleFeatured(product: StoreProduct): Promise<void> {
    const newFeatured = !product.featured;
    this.updatingProductNumber.set(product.number);

    // Actualización optimista local
    this.allProducts.update((items) =>
      items.map((p) => (p.number === product.number ? { ...p, featured: newFeatured } : p)),
    );

    try {
      await this.productsService.updateProduct(product.number, { featured: newFeatured });
      this.showToast(
        'success',
        `${product.name}: ${newFeatured ? this.i18n.t('admin.badge_featured') : 'No destacado'}`,
      );
    } catch {
      // Revertir
      this.allProducts.update((items) =>
        items.map((p) => (p.number === product.number ? { ...p, featured: !newFeatured } : p)),
      );
      this.showToast('error', this.i18n.t('admin.save_error'));
    } finally {
      this.updatingProductNumber.set(null);
    }
  }

  // Abrir modal de edición
  openEditModal(product: StoreProduct): void {
    this.editingProduct.set(product);
    this.editForm = {
      number: product.number,
      name: product.name,
      category: product.category,
      price: product.price,
      shortDescription: product.shortDescription,
      description: product.description,
      allergensText: product.allergens?.join(', ') ?? '',
      inStock: product.inStock !== false,
      featured: Boolean(product.featured),
    };
  }

  closeEditModal(): void {
    this.editingProduct.set(null);
  }

  // Guardar formulario de edición
  async saveProduct(): Promise<void> {
    const original = this.editingProduct();
    if (!original) return;

    this.isSaving.set(true);

    const allergens = this.editForm.allergensText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updates: Partial<StoreProduct> = {
      name: this.editForm.name.trim(),
      category: this.editForm.category,
      price: Number(this.editForm.price),
      shortDescription: this.editForm.shortDescription.trim(),
      description: this.editForm.description.trim(),
      allergens,
      inStock: this.editForm.inStock,
      featured: this.editForm.featured,
    };

    try {
      const updated = await this.productsService.updateProduct(original.number, updates);
      if (updated) {
        this.allProducts.update((items) =>
          items.map((p) => (p.number === original.number ? { ...p, ...updates } : p)),
        );
      }
      this.showToast('success', this.i18n.t('admin.save_success'));
      this.closeEditModal();
    } catch {
      this.showToast('error', this.i18n.t('admin.save_error'));
    } finally {
      this.isSaving.set(false);
    }
  }

  showToast(type: 'success' | 'error', text: string): void {
    this.feedbackMessage.set({ type, text });
    setTimeout(() => {
      this.feedbackMessage.set(null);
    }, 3500);
  }

  formatCurrency(value?: number): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '0,00 €';
    }
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }
}
