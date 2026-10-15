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
  slug?: string;
  inStock?: boolean;
  featured?: boolean;
  allergens?: string[];
}

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
  productNumber?: string;
  image?: string;
}

export type FulfillmentMethod = 'pickup' | 'delivery';

export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

export type OrderStatus =
  | 'recibido'
  | 'en_preparacion'
  | 'listo_recogida'
  | 'enviado'
  | 'entregado'
  | 'cancelado'
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'cancelled';

export interface Order {
  id?: string;
  reference?: string;
  customer: OrderCustomer;
  items: CartItem[];
  subtotal?: number;
  shippingCost?: number;
  total: number;
  fulfillment?: FulfillmentMethod;
  shippingZoneLabel?: string;
  estimatedDate?: string;
  paymentMethod?: string;
  status: OrderStatus;
  notes?: string;
  createdAt?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  coverImage: string;
  publishedAt: string;
  readingTimeMinutes: number;
  tags: string[];
  author: string;
}
