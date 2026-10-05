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
  { label: 'Embutidos', value: 'EMBUTIDOS' }
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

let storeProductsPromise: Promise<StoreProduct[]> | null = null;

export function loadStoreProducts(): Promise<StoreProduct[]> {
  storeProductsPromise ??= import('./products-catalog').then((catalog) => catalog.storeProducts);
  return storeProductsPromise;
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

export function searchStoreProducts(query: string, products: readonly StoreProduct[]): StoreProduct[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return products.filter((item) => {
    const searchableText = normalizeSearchText([item.name, item.category, item.description, item.shortDescription].join(' '));
    return terms.every((term) => searchableText.includes(term));
  });
}

export function formatStorePrice(price: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
}
