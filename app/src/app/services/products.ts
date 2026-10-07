import { Injectable } from '@angular/core';

export interface StoreCategory {
  label: string;
  value: string;
}

export const storeCategories: StoreCategory[] = [
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

export interface StoreProduct {
  name: string;
  category: string;
  description: string;
  price: number;
  number: string;
  image: string;
  images?: string[];
  imageFit?: 'cover' | 'contain';
  shortDescription: string;
  priceLabel?: string;
  sourceUrl?: string;
}

export type StoreSortOrder = 'featured' | 'name-asc' | 'price-asc' | 'price-desc';

export interface FilterProductsOptions {
  searchTerm?: string;
  category?: string;
  sortOrder?: StoreSortOrder;
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

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  readonly categories: StoreCategory[] = storeCategories;
  private static catalogPromise: Promise<StoreProduct[]> | null = null;

  /**
   * Carga el catálogo completo de productos con caché en memoria.
   */
  getProducts(): Promise<StoreProduct[]> {
    ProductsService.catalogPromise ??= import('./products-catalog').then(
      (catalog) => catalog.storeProducts,
    );
    return ProductsService.catalogPromise;
  }

  /**
   * Obtiene un producto por su código/número único.
   */
  async getProductByNumber(productNumber: string): Promise<StoreProduct | null> {
    const products = await this.getProducts();
    return products.find((product) => product.number === productNumber) ?? null;
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

    if (hasSearch && sortOrder === 'featured') {
      return results;
    }

    return [...results].sort((first, second) => {
      switch (sortOrder) {
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
