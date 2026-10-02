export interface StoreProduct {
  name: string;
  category: string;
  description: string;
  price: number;
  number: string;
  image: string;
  imageFit?: 'cover' | 'contain';
  shortDescription: string;
}

export const storeProducts: StoreProduct[] = [
  {
    name: 'Anchoas del Cantábrico',
    category: 'CONSERVAS',
    description: 'Anchoas Ortiz en aceite de oliva, una conserva clásica de la selección de Cal Sardà.',
    price: 4.5,
    number: '01',
    image: '/images/products/conservas.png',
    imageFit: 'contain',
    shortDescription: 'Anchoas Ortiz en aceite de oliva.'
  },
  {
    name: 'Café Sardà',
    category: 'CAFÉ',
    description: 'El café que forma parte de nuestra historia.',
    price: 6.9,
    number: '02',
    image: '/images/products/cafe.jpg',
    shortDescription: 'Café en grano de la casa, 250 g.'
  },
  {
    name: 'Frutos secos',
    category: 'FRUTOS SECOS',
    description: 'Una selección de frutos secos de calidad.',
    price: 3.9,
    number: '03',
    image: '/images/products/frutos-secos.jpg',
    shortDescription: 'Almendras seleccionadas.'
  },
  {
    name: 'Arrugats de chocolate',
    category: 'DULCES',
    description: 'Galletas Arrugats de chocolate de El Rosal, un dulce tradicional para compartir.',
    price: 5.5,
    number: '04',
    image: '/images/products/dulces.jpg',
    imageFit: 'contain',
    shortDescription: 'Galletas de chocolate El Rosal.'
  }
];

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

export function searchStoreProducts(query: string): StoreProduct[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);

  if (!terms.length) {
    return [];
  }

  return storeProducts.filter((product) => {
    const searchableText = normalizeSearchText([
      product.name,
      product.category,
      product.description,
      product.shortDescription
    ].join(' '));

    return terms.every((term) => searchableText.includes(term));
  });
}
