import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Order } from '@cal-sarda/domain';
import { OrdersService } from './orders';

export type CustomerType = 'particular' | 'empresa' | 'hosteleria';

export interface CustomerOverride {
  type?: CustomerType;
  internalNotes?: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  postalCode?: string;
  city?: string;
  type: CustomerType;
  totalOrders: number;
  totalSpent: number; // LTV
  lastOrderDate?: string;
  isRecurrent: boolean; // >= 2 pedidos
  internalNotes: string;
  orders: Order[];
}

const STORAGE_KEY = 'cal_sarda_crm_customers';

const INITIAL_OVERRIDES: Record<string, CustomerOverride> = {
  'cliente@calsarda.com': {
    type: 'particular',
    internalNotes:
      'Cliente habitual del barrio de Sagrada Família. Prefiere corte de jamón ibérico muy fino y envasado en paquetes de 100g.',
  },
  'montserrat.puig@gmail.com': {
    type: 'particular',
    internalNotes: 'Recogida siempre en tienda física los viernes por la tarde.',
  },
  'hosteleria@restaurantealegria.es': {
    type: 'hosteleria',
    internalNotes: 'Proveedor hostelería. Entregas por puerta de cocina antes de las 11:30h.',
  },
};

@Injectable({
  providedIn: 'root',
})
export class CustomersService {
  private readonly ordersService = inject(OrdersService);
  private readonly isBrowser: boolean;

  readonly overrides = signal<Record<string, CustomerOverride>>({});

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);
    this.loadOverrides();
  }

  private loadOverrides(): void {
    if (this.isBrowser) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, CustomerOverride>;
          this.overrides.set({ ...INITIAL_OVERRIDES, ...parsed });
          return;
        }
      } catch {
        // Fallback si falla localStorage
      }
    }
    this.overrides.set({ ...INITIAL_OVERRIDES });
  }

  private persistOverrides(): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.overrides()));
      } catch {
        // Ignorar fallo de almacenamiento
      }
    }
  }

  /**
   * Cálculo reactivo y consolidado de clientes a partir de los pedidos del obrador
   */
  readonly customers = computed<CustomerRecord[]>(() => {
    const orders = this.ordersService.allOrders();
    const ovs = this.overrides();

    const customerMap = new Map<
      string,
      {
        name: string;
        email: string;
        phone: string;
        address?: string;
        postalCode?: string;
        city?: string;
        orders: Order[];
      }
    >();

    for (const order of orders) {
      const email = order.customer.email.trim().toLowerCase();
      if (!email) continue;

      if (!customerMap.has(email)) {
        customerMap.set(email, {
          name: order.customer.name,
          email,
          phone: order.customer.phone || '',
          address: order.customer.address,
          postalCode: order.customer.postalCode,
          city: order.customer.city,
          orders: [],
        });
      }

      const record = customerMap.get(email)!;
      record.orders.push(order);
      // Mantener los datos más recientes o completos
      if (order.customer.phone && !record.phone) record.phone = order.customer.phone;
      if (order.customer.address && !record.address) record.address = order.customer.address;
      if (order.customer.postalCode && !record.postalCode)
        record.postalCode = order.customer.postalCode;
      if (order.customer.city && !record.city) record.city = order.customer.city;
    }

    const result: CustomerRecord[] = [];

    customerMap.forEach((entry, email) => {
      // Ordenar encargos de más reciente a más antiguo
      entry.orders.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });

      const totalSpent = entry.orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalOrders = entry.orders.length;
      const lastOrderDate = entry.orders[0]?.createdAt;
      const override = ovs[email];

      result.push({
        id: email,
        name: entry.name,
        email,
        phone: entry.phone,
        address: entry.address,
        postalCode: entry.postalCode,
        city: entry.city,
        type: override?.type ?? 'particular',
        internalNotes: override?.internalNotes ?? '',
        totalOrders,
        totalSpent: Math.round(totalSpent * 100) / 100,
        lastOrderDate,
        isRecurrent: totalOrders >= 2,
        orders: entry.orders,
      });
    });

    // Ordenar clientes por volumen total gastado (LTV) descendente
    return result.sort((a, b) => b.totalSpent - a.totalSpent);
  });

  getCustomerByEmail(email: string): CustomerRecord | undefined {
    const clean = email.trim().toLowerCase();
    return this.customers().find((c) => c.email.toLowerCase() === clean);
  }

  updateInternalNotes(email: string, notes: string): void {
    const clean = email.trim().toLowerCase();
    this.overrides.update((current) => ({
      ...current,
      [clean]: {
        ...current[clean],
        internalNotes: notes.trim(),
      },
    }));
    this.persistOverrides();
  }

  updateCustomerType(email: string, type: CustomerType): void {
    const clean = email.trim().toLowerCase();
    this.overrides.update((current) => ({
      ...current,
      [clean]: {
        ...current[clean],
        type,
      },
    }));
    this.persistOverrides();
  }
}
