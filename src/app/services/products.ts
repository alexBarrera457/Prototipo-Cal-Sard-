export interface StoreProduct {
  name: string;
  category: string;
  description: string;
  price: number;
  number: string;
  image: string;
  shortDescription: string;
}

export const storeProducts: StoreProduct[] = [
  {
    name: 'Conservas del mar',
    category: 'CONSERVAS',
    description: 'Una selección de conservas del mar escogidas por Cal Sardà.',
    price: 4.5,
    number: '01',
    image: 'assets/images/products/conservas.jpg',
    shortDescription: 'Selección de productos del mar.'
  },
  {
    name: 'Café Sardà',
    category: 'CAFÉ',
    description: 'El café que forma parte de nuestra historia.',
    price: 6.9,
    number: '02',
    image: 'assets/images/products/cafe.jpg',
    shortDescription: 'El café que forma parte de nuestra historia.'
  },
  {
    name: 'Frutos secos',
    category: 'FRUTOS SECOS',
    description: 'Una selección de frutos secos de calidad.',
    price: 3.9,
    number: '03',
    image: 'assets/images/products/frutos-secos.jpg',
    shortDescription: 'Una selección de frutos secos de calidad.'
  },
  {
    name: 'Turrones y dulces',
    category: 'DULCES',
    description: 'Dulces tradicionales para cualquier ocasión.',
    price: 5.5,
    number: '04',
    image: 'assets/images/products/dulces.jpg',
    shortDescription: 'Dulces tradicionales para cualquier ocasión.'
  }
];
