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
  featuredOrder?: number;
  allergens?: string[];
}

export interface CustomLotItem {
  name: string;
  price: number;
  quantity: number;
}

export interface CustomLotDefinition {
  packagingName: string;
  packagingPrice: number;
  items: CustomLotItem[];
  dedication?: string;
  senderName?: string;
  recipientName?: string;
}

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
  productNumber?: string;
  image?: string;
  isCutToOrder?: boolean;
  estimatedWeightGrams?: number;
  realWeightGrams?: number;
  pricePerKg?: number;
  customLot?: CustomLotDefinition;
}

export type FulfillmentMethod = 'pickup' | 'delivery';

export type CutThicknessPreference = 'muy_fino' | 'estandar' | 'grueso';
export type PackagingPreference = 'vacio_100g' | 'vacio_200g' | 'papel_colmado';
export type NotificationChannelPreference = 'whatsapp' | 'email' | 'sms';

export interface CustomerPreferences {
  allergens?: string[];
  cutThickness?: CutThicknessPreference;
  packaging?: PackagingPreference;
  obradorNotes?: string;
  preferredChannel?: NotificationChannelPreference;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  taxId?: string;
  companyName?: string;
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

export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minPurchase: number;
  expiresAt?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

export interface Order {
  id?: string;
  reference?: string;
  customer: OrderCustomer;
  items: CartItem[];
  subtotal?: number;
  shippingCost?: number;
  discount?: number;
  couponCode?: string;
  giftCardDiscount?: number;
  giftCardCode?: string;
  total: number;
  fulfillment?: FulfillmentMethod;
  shippingZoneLabel?: string;
  estimatedDate?: string;
  paymentMethod?: string;
  paymentMethodType?: PaymentMethodType;
  paymentStatus?: PaymentStatus;
  paymentTransactionId?: string;
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

export interface TaxBreakdownItem {
  vatRate: number;
  baseAmount: number;
  vatAmount: number;
  total: number;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  vatRate: number;
  baseAmount: number;
  vatAmount: number;
}

export interface Invoice {
  invoiceNumber: string;
  orderReference: string;
  issuedAt: string;
  company: {
    legalName: string;
    tradeName: string;
    cif: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    phone: string;
    email: string;
  };
  customer: OrderCustomer;
  items: InvoiceItem[];
  taxBreakdown: TaxBreakdownItem[];
  subtotalBase: number;
  totalVat: number;
  shippingBase: number;
  shippingVat: number;
  shippingTotal: number;
  total: number;
  paymentMethod?: string;
  fulfillment?: FulfillmentMethod;
}

export type PaymentMethodType = 'card' | 'bizum' | 'store';
export type PaymentStatus = 'pending' | 'requires_action' | 'confirmed' | 'failed';

export interface PaymentIntentRequest {
  orderReference: string;
  amount: number;
  currency: 'eur';
  paymentMethod: PaymentMethodType;
  customer: OrderCustomer;
  cardNumber?: string;
  cardExp?: string;
  cardCvc?: string;
  bizumPhone?: string;
}

export interface PaymentTransactionResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethodType;
  orderReference: string;
  amount: number;
  currency: 'eur';
  timestamp: string;
  errorMessage?: string;
  details?: Record<string, unknown>;
}
