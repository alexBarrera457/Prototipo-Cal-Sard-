import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import type { Category, Product } from '@cal-sarda/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase';

export type StoreCategory = Category;
export type StoreProduct = Product;
export type { Category, Product };

export const storeCategories: Category[] = [
  { label: 'Café gourmet', value: 'CAFÉ GOURMET' },
  { label: 'Conservas de mar', value: 'CONSERVAS DE MAR' },
  { label: 'Dulces tradicionales de fiestas', value: 'DULCES DE FIESTAS' },
  { label: 'Frutos secos a granel', value: 'FRUTOS SECOS' },
  { label: 'Galletas y pastas', value: 'GALLETAS Y PASTAS' },
  { label: 'Bodega gourmet', value: 'BODEGA GOURMET' },
  { label: 'Chocolate gourmet', value: 'CHOCOLATE GOURMET' },
  { label: 'Víveres gourmet', value: 'VÍVERES GOURMET' },
  { label: 'Helados y horchata (solo Barcelona)', value: 'HELADOS Y HORCHATA' },
  { label: 'Embutidos', value: 'EMBUTIDOS' },
];

export const DEFAULT_PRODUCT_IMAGE = '/images/products/viveres-arroz.jpg';

export type StoreSortOrder = 'featured' | 'name-asc' | 'price-asc' | 'price-desc';

export interface FilterProductsOptions {
  searchTerm?: string;
  category?: string;
  sortOrder?: StoreSortOrder;
  glutenFreeOnly?: boolean;
  lactoseFreeOnly?: boolean;
}

export function isGlutenFree(product: StoreProduct): boolean {
  if (!product.allergens || product.allergens.length === 0) return true;
  return !product.allergens.some((a) => {
    const l = a.toLowerCase();
    return (
      l.includes('gluten') || l.includes('trigo') || l.includes('cebada') || l.includes('centeno')
    );
  });
}

export function isLactoseFree(product: StoreProduct): boolean {
  if (!product.allergens || product.allergens.length === 0) return true;
  return !product.allergens.some((a) => {
    const l = a.toLowerCase();
    return l.includes('láct') || l.includes('lact') || l.includes('leche') || l.includes('llet');
  });
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  firstItemIndex: number;
  lastItemIndex: number;
}

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  const visible = items.slice(start, start + pageSize);

  return {
    items: visible,
    total,
    page: safePage,
    pageSize,
    pageCount,
    firstItemIndex: total ? start + 1 : 0,
    lastItemIndex: Math.min(safePage * pageSize, total),
  };
}

/**
 * Obtiene variantes de un término para contemplar flexiones singulares y plurales.
 */
export function getSearchVariants(term: string): string[] {
  const normalized = term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es')
    .trim();
  if (!normalized) {
    return [];
  }

  const variants = new Set<string>([normalized]);
  const singularCandidates = [
    normalized.replace(/es$/, ''),
    normalized.replace(/s$/, ''),
    normalized.replace(/as$/, 'a'),
    normalized.replace(/os$/, 'o'),
  ];

  singularCandidates.forEach((candidate) => {
    if (candidate && candidate !== normalized) {
      variants.add(candidate);
    }
  });

  return [...variants].filter(Boolean);
}

/**
 * Convierte un texto en un slug URL amigable.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Obtiene el slug canónico de un producto para su ruta semántica.
 */
export function getProductSlug(product: { number: string; name: string; slug?: string }): string {
  return product.slug ?? (slugify(product.name) || product.number);
}

/**
 * Seam interface para abstracción del repositorio de productos.
 */
export interface ProductsRepository {
  getProducts(): Promise<StoreProduct[]>;
  getProductByNumber(number: string): Promise<StoreProduct | null>;
  updateProduct?(number: string, updates: Partial<StoreProduct>): Promise<StoreProduct | null>;
  createProduct?(product: StoreProduct): Promise<StoreProduct>;
  deleteProduct?(number: string): Promise<boolean>;
}

export type ProductsStorageAdapter = ProductsRepository;

export const PRODUCTS_REPOSITORY = new InjectionToken<ProductsRepository>('PRODUCTS_REPOSITORY');

/**
 * Mapea un registro de la tabla 'products' de PostgreSQL al modelo de dominio Product.
 */
export function mapDatabaseProductToProduct(row: any): StoreProduct {
  const fallbackImg = String(row.image || DEFAULT_PRODUCT_IMAGE);
  const images: string[] =
    Array.isArray(row.images) && row.images.length > 0 ? row.images : [fallbackImg];

  return {
    number: String(row.number),
    name: String(row.name),
    category: String(row.category_name ?? ''),
    description: String(row.description ?? ''),
    shortDescription: String(row.short_description ?? ''),
    price: typeof row.price === 'number' ? row.price : parseFloat(row.price || '0'),
    priceLabel: row.price_label ?? undefined,
    image: fallbackImg,
    images,
    imageFit: row.image_fit === 'cover' ? 'cover' : 'contain',
    sourceUrl: row.source_url ?? undefined,
    slug: getProductSlug({ number: String(row.number), name: String(row.name) }),
    inStock: row.in_stock !== undefined ? Boolean(row.in_stock) : true,
    featured: row.featured !== undefined ? Boolean(row.featured) : false,
    allergens: Array.isArray(row.allergens) ? row.allergens : [],
  };
}

const PRODUCT_OVERRIDES_KEY = 'cal_sarda_products_overrides';
const CREATED_PRODUCTS_KEY = 'cal_sarda_created_products';
const DELETED_PRODUCTS_KEY = 'cal_sarda_deleted_products';

function getStoredOverrides(): Record<string, Partial<StoreProduct>> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(PRODUCT_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredOverrides(overrides: Record<string, Partial<StoreProduct>>): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore quota or storage errors
  }
}

function getStoredCreatedProducts(): StoreProduct[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(CREATED_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredCreatedProducts(products: StoreProduct[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(CREATED_PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    // Ignore quota or storage errors
  }
}

function getStoredDeletedProductNumbers(): string[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredDeletedProductNumbers(numbers: string[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(numbers));
  } catch {
    // Ignore quota or storage errors
  }
}

/**
 * Adaptador de catálogo estático en memoria (modo offline / desarrollo).
 */
@Injectable()
export class StaticProductsAdapter implements ProductsRepository {
  private static catalogPromise: Promise<StoreProduct[]> | null = null;
  private static catalogData: StoreProduct[] | null = null;

  static resetCatalog(clearStorage = false): void {
    StaticProductsAdapter.catalogPromise = null;
    StaticProductsAdapter.catalogData = null;
    if (clearStorage && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(PRODUCT_OVERRIDES_KEY);
        localStorage.removeItem(CREATED_PRODUCTS_KEY);
        localStorage.removeItem(DELETED_PRODUCTS_KEY);
      } catch {
        // Ignore errors
      }
    }
  }

  getProducts(): Promise<StoreProduct[]> {
    StaticProductsAdapter.catalogPromise ??= import('./products-catalog').then((catalog) => {
      const overrides = getStoredOverrides();
      const created = getStoredCreatedProducts();
      const deletedSet = new Set(getStoredDeletedProductNumbers());

      const baseProducts = catalog.storeProducts
        .filter((p) => !deletedSet.has(p.number))
        .map((p) => {
          const override = overrides[p.number];
          return {
            ...p,
            inStock: p.inStock ?? true,
            featured: p.featured ?? false,
            allergens: p.allergens ? [...p.allergens] : [],
            ...override,
          };
        });

      const activeCreated = created
        .filter((p) => !deletedSet.has(p.number))
        .map((p) => ({
          ...p,
          ...(overrides[p.number] || {}),
        }));

      StaticProductsAdapter.catalogData = [...activeCreated, ...baseProducts];
      return StaticProductsAdapter.catalogData;
    });
    return StaticProductsAdapter.catalogPromise;
  }

  async getProductByNumber(number: string): Promise<StoreProduct | null> {
    const products = await this.getProducts();
    return products.find((product) => product.number === number) ?? null;
  }

  async updateProduct(
    number: string,
    updates: Partial<StoreProduct>,
  ): Promise<StoreProduct | null> {
    const products = await this.getProducts();
    const index = products.findIndex((product) => product.number === number);
    if (index === -1) {
      return null;
    }
    const current = products[index];
    const updated: StoreProduct = {
      ...current,
      ...updates,
      number: current.number,
    };
    products[index] = updated;

    const overrides = getStoredOverrides();
    overrides[number] = {
      ...(overrides[number] || {}),
      ...updates,
    };
    saveStoredOverrides(overrides);

    return updated;
  }

  async createProduct(product: StoreProduct): Promise<StoreProduct> {
    const products = await this.getProducts();
    const fallbackImage = product.image?.trim() ? product.image.trim() : DEFAULT_PRODUCT_IMAGE;
    const newProduct: StoreProduct = {
      ...product,
      image: fallbackImage,
      images: product.images?.length ? product.images : [fallbackImage],
      slug: product.slug || slugify(product.name),
      inStock: product.inStock !== false,
      featured: Boolean(product.featured),
      allergens: product.allergens ? [...product.allergens] : [],
    };
    products.unshift(newProduct);

    const created = getStoredCreatedProducts();
    created.unshift(newProduct);
    saveStoredCreatedProducts(created);

    return newProduct;
  }

  async deleteProduct(number: string): Promise<boolean> {
    const products = await this.getProducts();
    const index = products.findIndex((p) => p.number === number);
    if (index === -1) {
      return false;
    }
    products.splice(index, 1);

    const deleted = getStoredDeletedProductNumbers();
    if (!deleted.includes(number)) {
      deleted.push(number);
      saveStoredDeletedProductNumbers(deleted);
    }

    return true;
  }
}

/**
 * Adaptador de catálogo con persistencia PostgreSQL mediante Supabase.
 */
@Injectable()
export class SupabaseProductsAdapter implements ProductsRepository {
  private cachedProducts: Promise<StoreProduct[]> | null = null;
  private readonly fallbackAdapter: ProductsRepository;

  constructor(
    @Optional()
    @Inject(SUPABASE_CLIENT)
    private readonly supabase?: SupabaseClient | null,
    @Optional()
    @Inject('FALLBACK_PRODUCTS_ADAPTER')
    fallbackAdapter?: ProductsRepository,
  ) {
    this.fallbackAdapter = fallbackAdapter ?? new StaticProductsAdapter();
  }

  getProducts(): Promise<StoreProduct[]> {
    if (!this.supabase) {
      return this.fallbackAdapter.getProducts();
    }

    if (this.cachedProducts) {
      return this.cachedProducts;
    }

    this.cachedProducts = this.loadProductsFromSupabase();
    return this.cachedProducts;
  }

  private async loadProductsFromSupabase(): Promise<StoreProduct[]> {
    try {
      const { data, error } = await this.supabase!.from('products')
        .select('*')
        .eq('is_active', true)
        .order('number', { ascending: true });

      if (error || !data || data.length === 0) {
        return this.fallbackAdapter.getProducts();
      }

      return data.map(mapDatabaseProductToProduct);
    } catch {
      return this.fallbackAdapter.getProducts();
    }
  }

  async getProductByNumber(number: string): Promise<StoreProduct | null> {
    if (!this.supabase) {
      return this.fallbackAdapter.getProductByNumber(number);
    }

    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('number', number)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        return this.fallbackAdapter.getProductByNumber(number);
      }

      return mapDatabaseProductToProduct(data);
    } catch {
      return this.fallbackAdapter.getProductByNumber(number);
    }
  }

  private async fallbackUpdate(
    number: string,
    updates: Partial<StoreProduct>,
  ): Promise<StoreProduct | null> {
    if (this.fallbackAdapter.updateProduct) {
      return this.fallbackAdapter.updateProduct(number, updates);
    }
    const current = await this.fallbackAdapter.getProductByNumber(number);
    if (!current) {
      return null;
    }
    return { ...current, ...updates };
  }

  async updateProduct(
    number: string,
    updates: Partial<StoreProduct>,
  ): Promise<StoreProduct | null> {
    if (!this.supabase) {
      return this.fallbackUpdate(number, updates);
    }

    try {
      const dbPayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) dbPayload['name'] = updates.name;
      if (updates.category !== undefined) dbPayload['category_name'] = updates.category;
      if (updates.description !== undefined) dbPayload['description'] = updates.description;
      if (updates.shortDescription !== undefined)
        dbPayload['short_description'] = updates.shortDescription;
      if (updates.price !== undefined) dbPayload['price'] = updates.price;
      if (updates.priceLabel !== undefined) dbPayload['price_label'] = updates.priceLabel;
      if (updates.inStock !== undefined) dbPayload['in_stock'] = updates.inStock;
      if (updates.featured !== undefined) dbPayload['featured'] = updates.featured;
      if (updates.allergens !== undefined) dbPayload['allergens'] = updates.allergens;

      const { data, error } = await this.supabase
        .from('products')
        .update(dbPayload)
        .eq('number', number)
        .select()
        .maybeSingle();

      if (error || !data) {
        return this.fallbackUpdate(number, updates);
      }

      this.cachedProducts = null;
      return mapDatabaseProductToProduct(data);
    } catch {
      return this.fallbackUpdate(number, updates);
    }
  }

  async createProduct(product: StoreProduct): Promise<StoreProduct> {
    if (!this.supabase) {
      return this.fallbackAdapter.createProduct
        ? this.fallbackAdapter.createProduct(product)
        : product;
    }

    try {
      const fallbackImage = product.image?.trim() ? product.image.trim() : DEFAULT_PRODUCT_IMAGE;
      const dbPayload: Record<string, unknown> = {
        number: product.number,
        name: product.name,
        category_name: product.category,
        description: product.description,
        short_description: product.shortDescription,
        price: product.price,
        price_label: product.priceLabel ?? null,
        image: fallbackImage,
        images: product.images?.length ? product.images : [fallbackImage],
        in_stock: product.inStock !== false,
        featured: Boolean(product.featured),
        allergens: product.allergens ?? [],
        is_active: true,
      };

      const { data, error } = await this.supabase
        .from('products')
        .insert(dbPayload)
        .select()
        .single();

      if (error || !data) {
        return this.fallbackAdapter.createProduct
          ? this.fallbackAdapter.createProduct(product)
          : product;
      }

      this.cachedProducts = null;
      return mapDatabaseProductToProduct(data);
    } catch {
      return this.fallbackAdapter.createProduct
        ? this.fallbackAdapter.createProduct(product)
        : product;
    }
  }

  async deleteProduct(number: string): Promise<boolean> {
    if (!this.supabase) {
      return this.fallbackAdapter.deleteProduct
        ? this.fallbackAdapter.deleteProduct(number)
        : false;
    }

    try {
      const { error } = await this.supabase
        .from('products')
        .update({ is_active: false })
        .eq('number', number);

      if (error) {
        return this.fallbackAdapter.deleteProduct
          ? this.fallbackAdapter.deleteProduct(number)
          : false;
      }

      this.cachedProducts = null;
      if (this.fallbackAdapter.deleteProduct) {
        await this.fallbackAdapter.deleteProduct(number);
      }
      return true;
    } catch {
      return this.fallbackAdapter.deleteProduct
        ? this.fallbackAdapter.deleteProduct(number)
        : false;
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  readonly categories: StoreCategory[] = storeCategories;
  private readonly repository: ProductsRepository;

  constructor(
    @Optional()
    @Inject(PRODUCTS_REPOSITORY)
    repository?: ProductsRepository,
    @Optional()
    @Inject(SUPABASE_CLIENT)
    supabase?: SupabaseClient | null,
  ) {
    if (repository) {
      this.repository = repository;
    } else if (supabase) {
      this.repository = new SupabaseProductsAdapter(supabase);
    } else {
      this.repository = new StaticProductsAdapter();
    }
  }

  /**
   * Carga el catálogo completo de productos con caché en memoria.
   */
  getProducts(): Promise<StoreProduct[]> {
    return this.repository.getProducts();
  }

  /**
   * Da de alta un nuevo producto artesanal en el catálogo.
   */
  async createProduct(product: StoreProduct): Promise<StoreProduct> {
    if (this.repository.createProduct) {
      return this.repository.createProduct(product);
    }
    return product;
  }

  /**
   * Elimina un producto del catálogo por su número de referencia.
   */
  async deleteProduct(number: string): Promise<boolean> {
    if (this.repository.deleteProduct) {
      return this.repository.deleteProduct(number);
    }
    return false;
  }

  /**
   * Actualiza los datos o disponibilidad de un producto en el repositorio.
   */
  async updateProduct(
    number: string,
    updates: Partial<StoreProduct>,
  ): Promise<StoreProduct | null> {
    if (this.repository.updateProduct) {
      return this.repository.updateProduct(number, updates);
    }
    const current = await this.repository.getProductByNumber(number);
    if (!current) {
      return null;
    }
    return { ...current, ...updates };
  }

  /**
   * Obtiene un producto por su código/número único.
   */
  getProductByNumber(productNumber: string): Promise<StoreProduct | null> {
    return this.repository.getProductByNumber(productNumber);
  }

  /**
   * Obtiene un producto por su slug semántico o número único.
   */
  async getProductBySlugOrNumber(identifier: string): Promise<StoreProduct | null> {
    if (!identifier) {
      return null;
    }
    const cleanId = identifier.trim().toLowerCase();
    const products = await this.getProducts();

    return (
      products.find(
        (product) =>
          product.number.toLowerCase() === cleanId ||
          (product.slug && product.slug.toLowerCase() === cleanId) ||
          slugify(product.name) === cleanId ||
          `${product.number}-${slugify(product.name)}` === cleanId,
      ) ?? null
    );
  }

  /**
   * Obtiene exclusivamente los productos marcados como destacados y disponibles en stock.
   */
  async getFeaturedProducts(): Promise<StoreProduct[]> {
    const products = await this.getProducts();
    return products
      .filter((product) => Boolean(product.featured) && product.inStock !== false)
      .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));
  }

  /**
   * Obtiene de 2 a 3 productos complementarios recomendados por el colmado ("Amb què combina millor?")
   */
  async getPairingsForProduct(product: StoreProduct): Promise<StoreProduct[]> {
    const all = await this.getProducts();
    const available = all.filter((p) => p.number !== product.number && p.inStock !== false);

    const targetCategories = this.getRecommendedCategories(product.category);
    const categoryMatches = available.filter((p) => targetCategories.includes(p.category));

    if (categoryMatches.length >= 2) {
      return categoryMatches.slice(0, 3);
    }

    const remaining = available.filter(
      (p) => !categoryMatches.some((cm) => cm.number === p.number),
    );
    return [...categoryMatches, ...remaining].slice(0, 3);
  }

  /**
   * Obtiene recomendaciones de maridaje cruzado para los productos actuales de la cesta.
   */
  async getPairingsForCart(cartItemNumbersOrNames: string[]): Promise<StoreProduct[]> {
    const all = await this.getProducts();
    const available = all.filter(
      (p) =>
        !cartItemNumbersOrNames.includes(p.number) &&
        !cartItemNumbersOrNames.includes(p.name) &&
        p.inStock !== false,
    );

    const preferred = available.filter((p) =>
      ['BODEGA GOURMET', 'CAFÉ GOURMET', 'VÍVERES GOURMET', 'FRUTOS SECOS'].includes(p.category),
    );

    if (preferred.length >= 2) {
      return preferred.slice(0, 3);
    }
    return available.slice(0, 3);
  }

  private getRecommendedCategories(category: string): string[] {
    switch (category) {
      case 'CAFÉ GOURMET':
        return ['GALLETAS Y PASTAS', 'CHOCOLATE GOURMET', 'DULCES DE FIESTAS'];
      case 'CONSERVAS DE MAR':
        return ['BODEGA GOURMET', 'VÍVERES GOURMET'];
      case 'DULCES DE FIESTAS':
      case 'GALLETAS Y PASTAS':
        return ['CAFÉ GOURMET', 'CHOCOLATE GOURMET', 'BODEGA GOURMET'];
      case 'FRUTOS SECOS':
        return ['BODEGA GOURMET', 'EMBUTIDOS', 'VÍVERES GOURMET'];
      case 'EMBUTIDOS':
        return ['BODEGA GOURMET', 'FRUTOS SECOS', 'CONSERVAS DE MAR'];
      case 'BODEGA GOURMET':
        return ['CONSERVAS DE MAR', 'FRUTOS SECOS', 'EMBUTIDOS'];
      default:
        return ['BODEGA GOURMET', 'CAFÉ GOURMET', 'CONSERVAS DE MAR'];
    }
  }

  /**
   * Búsqueda en texto completo de productos por múltiples términos.
   */
  async search(query: string, limit?: number): Promise<StoreProduct[]> {
    const products = await this.getProducts();
    const results = this.searchInList(query, products);
    return typeof limit === 'number' && limit > 0 ? results.slice(0, limit) : results;
  }

  /**
   * Obtiene variantes de un término para contemplar flexiones singulares y plurales.
   */
  getSearchVariants(term: string): string[] {
    return getSearchVariants(term);
  }

  /**
   * Búsqueda sincrónica sobre un listado ya disponible en memoria,
   * calculando puntuación ponderada y variantes morfológicas.
   */
  searchInList(query: string, products: readonly StoreProduct[]): StoreProduct[] {
    const terms = this.normalizeText(query).split(/\s+/).filter(Boolean);
    if (!terms.length) {
      return [];
    }

    return [...products]
      .map((item) => {
        const searchableText = this.normalizeText(
          [item.name, item.category, item.description, item.shortDescription, item.number].join(
            ' ',
          ),
        );

        let score = 0;

        for (const term of terms) {
          const variants = getSearchVariants(term);

          if (!variants.some((variant) => searchableText.includes(variant))) {
            return { product: item, score: Number.NEGATIVE_INFINITY };
          }

          const nameText = this.normalizeText(item.name);
          const categoryText = this.normalizeText(item.category);
          const shortDescriptionText = this.normalizeText(item.shortDescription);
          const descriptionText = this.normalizeText(item.description);

          if (variants.some((variant) => nameText.includes(variant))) {
            score += 60;
          }
          if (variants.some((variant) => categoryText.includes(variant))) {
            score += 25;
          }
          if (variants.some((variant) => shortDescriptionText.includes(variant))) {
            score += 15;
          }
          if (variants.some((variant) => descriptionText.includes(variant))) {
            score += 8;
          }
          if (variants.some((variant) => item.number.includes(variant))) {
            score += 10;
          }
        }

        return { product: item, score };
      })
      .filter(({ score }) => Number.isFinite(score))
      .sort((first, second) => second.score - first.score)
      .map(({ product }) => product);
  }

  /**
   * Filtra y ordena una lista de productos aplicando búsqueda de texto, categoría y ordenación.
   */
  filterAndSort(
    products: readonly StoreProduct[],
    options: FilterProductsOptions = {},
  ): StoreProduct[] {
    const { searchTerm = '', category = 'TODOS', sortOrder = 'featured' } = options;
    const hasSearch = searchTerm.trim().length > 0;
    let results = hasSearch ? this.searchInList(searchTerm, products) : [...products];

    if (category && category !== 'TODOS') {
      results = results.filter((product) => product.category === category);
    }

    if (options.glutenFreeOnly) {
      results = results.filter((product) => isGlutenFree(product));
    }

    if (options.lactoseFreeOnly) {
      results = results.filter((product) => isLactoseFree(product));
    }

    if (hasSearch && sortOrder === 'featured') {
      return results;
    }

    return [...results].sort((first, second) => {
      switch (sortOrder) {
        case 'featured': {
          const aFeatured = Boolean(first.featured);
          const bFeatured = Boolean(second.featured);
          if (aFeatured !== bFeatured) {
            return aFeatured ? -1 : 1;
          }
          if (aFeatured && bFeatured) {
            const orderA = first.featuredOrder ?? 999;
            const orderB = second.featuredOrder ?? 999;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
          }
          return products.indexOf(first) - products.indexOf(second);
        }
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

  /**
   * Normaliza texto para búsqueda insensible a mayúsculas y acentos.
   */
  normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('es')
      .trim();
  }

  /**
   * Formatea un precio numérico a cadena con formato de moneda EUR en España.
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
  }

  /**
   * Divide un listado de elementos en páginas con metadatos de navegación.
   */
  paginate<T>(items: readonly T[], page: number, pageSize: number): PaginatedResult<T> {
    return paginate(items, page, pageSize);
  }
}

// Facade de retrocompatibilidad para invocaciones estáticas
let defaultServiceInstance: ProductsService | null = null;
function getDefaultService(): ProductsService {
  return (defaultServiceInstance ??= new ProductsService());
}

export function loadStoreProducts(): Promise<StoreProduct[]> {
  return getDefaultService().getProducts();
}

export function searchStoreProducts(
  query: string,
  products: readonly StoreProduct[],
): StoreProduct[] {
  return getDefaultService().searchInList(query, products);
}

export function formatStorePrice(price: number): string {
  return getDefaultService().formatPrice(price);
}
