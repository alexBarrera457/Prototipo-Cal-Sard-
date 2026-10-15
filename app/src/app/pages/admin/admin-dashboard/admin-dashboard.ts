import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { I18nService } from '../../../services/i18n';

export interface RecentAdminOrder {
  reference: string;
  customerName: string;
  fulfillmentType: 'pickup' | 'delivery';
  total: number;
  status: 'received' | 'in_prep' | 'ready' | 'delivered';
  timeAgo: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard {
  public readonly auth = inject(AuthService);
  public readonly i18n = inject(I18nService);

  readonly kpis = signal({
    todayOrders: 14,
    inPreparation: 4,
    readyPickup: 6,
    deliveries: 4,
    revenueToday: 486.5,
  });

  readonly recentOrders = signal<RecentAdminOrder[]>([
    {
      reference: 'CS-2026-1042',
      customerName: 'Montserrat Puig',
      fulfillmentType: 'pickup',
      total: 42.5,
      status: 'ready',
      timeAgo: 'Hace 15 min',
    },
    {
      reference: 'CS-2026-1041',
      customerName: 'Jaume Sardà',
      fulfillmentType: 'delivery',
      total: 78.9,
      status: 'in_prep',
      timeAgo: 'Hace 45 min',
    },
    {
      reference: 'CS-2026-1040',
      customerName: 'Laia Vidal',
      fulfillmentType: 'pickup',
      total: 31.2,
      status: 'received',
      timeAgo: 'Hace 1 hora',
    },
    {
      reference: 'CS-2026-1039',
      customerName: 'Marc Rovira',
      fulfillmentType: 'delivery',
      total: 115.0,
      status: 'delivered',
      timeAgo: 'Hace 3 horas',
    },
  ]);
}
