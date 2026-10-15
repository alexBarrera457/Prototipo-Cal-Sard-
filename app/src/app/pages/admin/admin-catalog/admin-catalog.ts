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

export interface ProductCreateForm {
  number: string;
  name: string;
  category: string;
  price: number;
  priceLabel: string;
  image: string;
  shortDescription: string;
  description: string;
  allergensText: string;
  inStock: boolean;
  featured: boolean;
}

export interface AllergenDef {
  id: string;
  icon: string;
  nameEs: string;
  nameCa: string;
}

export const OFFICIAL_ALLERGENS: AllergenDef[] = [
  { id: 'gluten', icon: '🌾', nameEs: 'Gluten', nameCa: 'Gluten' },
  { id: 'crustaceos', icon: '🦀', nameEs: 'Crustáceos', nameCa: 'Crustacis' },
  { id: 'huevos', icon: '🥚', nameEs: 'Huevos', nameCa: 'Ous' },
  { id: 'pescado', icon: '🐟', nameEs: 'Pescado', nameCa: 'Peix' },
  { id: 'cacahuetes', icon: '🥜', nameEs: 'Cacahuetes', nameCa: 'Cacauets' },
  { id: 'soja', icon: '🌱', nameEs: 'Soja', nameCa: 'Soia' },
  { id: 'lacteos', icon: '🥛', nameEs: 'Lácteos', nameCa: 'Lactis' },
  { id: 'frutos_cascara', icon: '🌰', nameEs: 'Frutos de cáscara', nameCa: 'Fruits de closca' },
  { id: 'apio', icon: '🥬', nameEs: 'Apio', nameCa: 'Api' },
  { id: 'mostaza', icon: '🟡', nameEs: 'Mostaza', nameCa: 'Mostassa' },
  { id: 'sesamo', icon: '⚪', nameEs: 'Sésamo', nameCa: 'Sèsam' },
  { id: 'sulfitos', icon: '🍷', nameEs: 'Sulfitos', nameCa: 'Sulfits' },
  { id: 'altramuces', icon: '🫘', nameEs: 'Altramuces', nameCa: 'Tramussos' },
  { id: 'moluscos', icon: '🦪', nameEs: 'Moluscos', nameCa: 'Mol·luscs' },
];

@Component({
  selector: 'app-admin-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-catalog.html',
  styleUrl: './admin-catalog.css',
})
export class AdminCatalog implements OnInit {
  readonly officialAllergens = OFFICIAL_ALLERGENS;
  readonly productsService = inject(ProductsService);
  readonly i18n = inject(I18nService);

  isAllergenSelected(allergenDef: AllergenDef, isCreate: boolean = false): boolean {
    const text = (isCreate ? this.createForm.allergensText : this.editForm.allergensText) || '';
    const lower = text.toLowerCase();
    return (
      lower.includes(allergenDef.nameEs.toLowerCase()) ||
      lower.includes(allergenDef.nameCa.toLowerCase())
    );
  }

  toggleAllergen(allergenDef: AllergenDef, isCreate: boolean = false): void {
    const current = (isCreate ? this.createForm.allergensText : this.editForm.allergensText) || '';
    const currentItems = current
      .split(',')
      .map((s) => s.trim())
      .filter((s) => Boolean(s));

    const isCa = this.i18n.currentLang() === 'ca';
    const targetName = isCa ? allergenDef.nameCa : allergenDef.nameEs;

    const existsIndex = currentItems.findIndex(
      (item) =>
        item.toLowerCase() === allergenDef.nameEs.toLowerCase() ||
        item.toLowerCase() === allergenDef.nameCa.toLowerCase(),
    );

    if (existsIndex >= 0) {
      currentItems.splice(existsIndex, 1);
    } else {
      currentItems.push(targetName);
    }

    const newText = currentItems.join(', ');
    if (isCreate) {
      this.createForm.allergensText = newText;
    } else {
      this.editForm.allergensText = newText;
    }
  }

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

  // Estado del modal de creación de nuevo producto
  readonly isCreatingProduct = signal<boolean>(false);
  createForm: ProductCreateForm = {
    number: '',
    name: '',
    category: 'CAFÉ GOURMET',
    price: 0,
    priceLabel: '',
    image: '',
    shortDescription: '',
    description: '',
    allergensText: '',
    inStock: true,
    featured: false,
  };

  // Estado del diálogo de confirmación de eliminación
  readonly deletingProduct = signal<StoreProduct | null>(null);
  readonly isDeleting = signal<boolean>(false);

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

  // Estado y recomendación visual del escaparate de portada (4 a 8 productos óptimo)
  readonly featuredStatus = computed(() => {
    const count = this.catalogStats().featured;
    if (count < 4) {
      return {
        type: 'warning' as const,
        message:
          this.i18n.currentLang() === 'ca'
            ? `Hi ha ${count} productes destacats. Es recomanen entre 4 i 8 per a un disseny equilibrat.`
            : `Hay ${count} productos destacados. Se recomiendan entre 4 y 8 para un diseño equilibrado.`,
        icon: '⚠️',
      };
    }
    if (count <= 8) {
      return {
        type: 'success' as const,
        message:
          this.i18n.currentLang() === 'ca'
            ? `Escaparador equilibrat: ${count} productes seleccionats per a la portada.`
            : `Escaparate equilibrado: ${count} productos seleccionados para la portada.`,
        icon: '✨',
      };
    }
    return {
      type: 'info' as const,
      message:
        this.i18n.currentLang() === 'ca'
          ? `Hi ha ${count} productes destacats. Més de 8 peces poden sobrecarregar la portada.`
          : `Hay ${count} productos destacados. Más de 8 piezas pueden sobrecargar la portada.`,
      icon: 'ℹ️',
    };
  });

  // Productos filtrados según búsqueda, categoría y disponibilidad
  readonly filteredProducts = computed(() => {
    const products = this.allProducts();
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.categoryFilter();
    const stock = this.stockFilter();
    const featuredOnly = this.featuredFilter();

    const filtered = products.filter((product) => {
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

    if (featuredOnly) {
      return [...filtered].sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));
    }

    return filtered;
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
    const currentFeaturedCount = this.allProducts().filter((p) => Boolean(p.featured)).length;
    const newOrder = newFeatured ? (product.featuredOrder ?? currentFeaturedCount + 1) : undefined;
    this.updatingProductNumber.set(product.number);

    // Actualización optimista local
    this.allProducts.update((items) =>
      items.map((p) =>
        p.number === product.number ? { ...p, featured: newFeatured, featuredOrder: newOrder } : p,
      ),
    );

    try {
      await this.productsService.updateProduct(product.number, {
        featured: newFeatured,
        ...(newOrder !== undefined ? { featuredOrder: newOrder } : {}),
      });
      this.showToast(
        'success',
        `${product.name}: ${newFeatured ? this.i18n.t('admin.badge_featured') : 'No destacado'}`,
      );
    } catch {
      // Revertir
      this.allProducts.update((items) =>
        items.map((p) =>
          p.number === product.number
            ? { ...p, featured: !newFeatured, featuredOrder: product.featuredOrder }
            : p,
        ),
      );
      this.showToast('error', this.i18n.t('admin.save_error'));
    } finally {
      this.updatingProductNumber.set(null);
    }
  }

  // Ajuste de orden / prioridad en el escaparate de portada
  async reorderFeatured(product: StoreProduct, direction: 'up' | 'down'): Promise<void> {
    const featuredList = this.allProducts()
      .filter((p) => Boolean(p.featured))
      .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));

    const currentIndex = featuredList.findIndex((p) => p.number === product.number);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= featuredList.length) return;

    const targetProduct = featuredList[targetIndex];
    const currentOrder = currentIndex + 1;
    const targetOrder = targetIndex + 1;

    this.allProducts.update((items) =>
      items.map((p) => {
        if (p.number === product.number) {
          return { ...p, featuredOrder: targetOrder };
        }
        if (p.number === targetProduct.number) {
          return { ...p, featuredOrder: currentOrder };
        }
        return p;
      }),
    );

    try {
      await Promise.all([
        this.productsService.updateProduct(product.number, { featuredOrder: targetOrder }),
        this.productsService.updateProduct(targetProduct.number, { featuredOrder: currentOrder }),
      ]);
      this.showToast(
        'success',
        `Prioridad actualizada: ${product.name} (posición #${targetOrder})`,
      );
    } catch {
      this.showToast('error', this.i18n.t('admin.save_error'));
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

  // --- Creación de nuevo producto ---
  openCreateModal(): void {
    const nextNum = this.generateNextProductNumber();
    this.createForm = {
      number: nextNum,
      name: '',
      category: this.categories()[0]?.value ?? 'CAFÉ GOURMET',
      price: 0,
      priceLabel: '',
      image: '',
      shortDescription: '',
      description: '',
      allergensText: '',
      inStock: true,
      featured: false,
    };
    this.isCreatingProduct.set(true);
  }

  closeCreateModal(): void {
    this.isCreatingProduct.set(false);
  }

  async createProduct(): Promise<void> {
    if (!this.createForm.name.trim() || !this.createForm.number.trim()) {
      return;
    }

    this.isSaving.set(true);
    const allergens = this.createForm.allergensText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newProd: StoreProduct = {
      number: this.createForm.number.trim(),
      name: this.createForm.name.trim(),
      category: this.createForm.category,
      price: Number(this.createForm.price) || 0,
      priceLabel: this.createForm.priceLabel.trim() || undefined,
      image: this.createForm.image.trim() || '',
      images: this.createForm.image.trim() ? [this.createForm.image.trim()] : [],
      shortDescription: this.createForm.shortDescription.trim(),
      description: this.createForm.description.trim() || this.createForm.shortDescription.trim(),
      allergens,
      inStock: this.createForm.inStock,
      featured: this.createForm.featured,
    };

    try {
      const created = await this.productsService.createProduct(newProd);
      this.allProducts.update((items) => [
        created,
        ...items.filter((p) => p.number !== created.number),
      ]);
      this.showToast('success', this.i18n.t('admin.create_success'));
      this.closeCreateModal();
    } catch {
      this.showToast('error', this.i18n.t('admin.create_error'));
    } finally {
      this.isSaving.set(false);
    }
  }

  // --- Eliminación de producto con confirmación ---
  openDeleteConfirm(product: StoreProduct): void {
    this.deletingProduct.set(product);
  }

  closeDeleteConfirm(): void {
    this.deletingProduct.set(null);
  }

  async confirmDeleteProduct(): Promise<void> {
    const target = this.deletingProduct();
    if (!target) return;

    this.isDeleting.set(true);
    try {
      await this.productsService.deleteProduct(target.number);
      this.allProducts.update((items) => items.filter((p) => p.number !== target.number));
      this.showToast('success', this.i18n.t('admin.delete_success'));
      this.closeDeleteConfirm();
    } catch {
      this.showToast('error', this.i18n.t('admin.delete_error'));
    } finally {
      this.isDeleting.set(false);
    }
  }

  generateNextProductNumber(): string {
    const products = this.allProducts();
    const numericValues = products
      .map((p) => parseInt(p.number, 10))
      .filter((n) => !isNaN(n) && n > 0);
    const max = numericValues.length ? Math.max(...numericValues) : 0;
    const next = max + 1;
    return next < 10 ? `0${next}` : String(next);
  }
}
