export interface Category {
  label: string;
  value: string;
}

export interface Product {
  number: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  price: number;
  priceLabel?: string;
  image: string;
  images?: string[];
  imageFit?: 'cover' | 'contain';
  sourceUrl?: string;
}

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface Order {
  id?: string;
  customer: OrderCustomer;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'cancelled';
  createdAt?: string;
}
