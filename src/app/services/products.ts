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
   * Búsqueda sincrónica sobre un listado ya disponible en memoria.
   */
  searchInList(query: string, products: readonly StoreProduct[]): StoreProduct[] {
    const terms = this.normalizeText(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return products.filter((item) => {
      const searchableText = this.normalizeText(
        [item.name, item.category, item.description, item.shortDescription].join(' '),
      );
      return terms.every((term) => searchableText.includes(term));
    });
  }

  /**
   * Filtra y ordena una lista de productos aplicando búsqueda de texto, categoría y ordenación.
   */
  filterAndSort(
    products: readonly StoreProduct[],
    options: FilterProductsOptions = {},
  ): StoreProduct[] {
    const { searchTerm = '', category = 'TODOS', sortOrder = 'featured' } = options;
    let results = searchTerm.trim() ? this.searchInList(searchTerm, products) : products;

    if (category && category !== 'TODOS') {
      results = results.filter((product) => product.category === category);
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
      .toLocaleLowerCase('es')
      .trim();
  }

  /**
   * Formatea un precio numérico a cadena con formato de moneda EUR en España.
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
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
