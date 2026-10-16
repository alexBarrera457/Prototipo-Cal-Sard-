import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { AdminDashboard } from './admin-dashboard';
import { AuthService, InMemoryAuthAdapter, AUTH_ADAPTER } from '../../../services/auth';
import {
  OrdersService,
  InMemoryOrdersRepository,
  ORDERS_REPOSITORY,
} from '../../../services/orders';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  beforeEach(async () => {
    const mockAdapter = new InMemoryAuthAdapter();
    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        provideRouter([]),
        AuthService,
        OrdersService,
        { provide: AUTH_ADAPTER, useValue: mockAdapter },
        {
          provide: ORDERS_REPOSITORY,
          useValue: new InMemoryOrdersRepository([
            {
              id: 'ord-1',
              reference: 'CS-2026-1042',
              customer: { name: 'Montserrat Puig', email: 'm@example.com' },
              items: [
                { name: 'Secallona artesana', price: 6.8, quantity: 3 },
                { name: 'Formatge d’Ovella Curat', price: 18.5, quantity: 1 },
              ],
              total: 38.9,
              status: 'listo_recogida',
              fulfillment: 'pickup',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'ord-2',
              reference: 'CS-2026-1041',
              customer: { name: 'Jaume Sardà', email: 'j@example.com' },
              items: [
                { name: 'Vi Negre Selecció Priorat', price: 17.5, quantity: 2 },
                { name: 'Secallona artesana', price: 6.8, quantity: 2 },
              ],
              total: 48.6,
              status: 'en_preparacion',
              fulfillment: 'delivery',
              createdAt: new Date().toISOString(),
            },
          ]),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    const ordersService = TestBed.inject(OrdersService);
    await ordersService.loadAllOrders();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('creates the dashboard and exposes operational KPIs', () => {
    expect(component).toBeTruthy();
    expect(component.kpis().todayOrders).toBe(2);
    expect(component.kpis().inPreparation).toBe(1);
    expect(component.kpis().readyPickup).toBe(1);
  });

  it('renders KPI values and recent orders in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#dashboard-title')).toBeTruthy();
    expect(compiled.querySelectorAll('.kpi-card').length).toBe(4);

    const firstOrder = compiled.querySelector('.order-ref-cell');
    expect(firstOrder?.textContent).toBeTruthy();
  });

  it('calculates category sales distribution and renders progress bars', () => {
    const categories = component.categorySales();
    expect(categories.length).toBeGreaterThan(0);

    const embutidos = categories.find((c) => c.categoryKey === 'embutidos');
    expect(embutidos).toBeDefined();
    expect(embutidos!.units).toBe(5); // 3 + 2 Secallona

    const compiled = fixture.nativeElement as HTMLElement;
    const barsContainer = compiled.querySelector('#category-bars-container');
    expect(barsContainer).toBeTruthy();
    expect(barsContainer?.querySelectorAll('.category-bar-item').length).toBeGreaterThan(0);
  });

  it('calculates top 5 bestsellers products', () => {
    const stars = component.topProducts();
    expect(stars.length).toBeGreaterThan(0);
    expect(stars[0].name).toBe('Secallona artesana');
    expect(stars[0].units).toBe(5);

    const compiled = fixture.nativeElement as HTMLElement;
    const starsContainer = compiled.querySelector('#top-stars-container');
    expect(starsContainer).toBeTruthy();
    expect(starsContainer?.textContent).toContain('Secallona artesana');
  });

  it('calculates periodic comparison metrics', () => {
    const comp = component.periodComparison();
    expect(comp.currentRevenue).toBe(38.9 + 48.6);
    expect(comp.growthPercent).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    const growthElem = compiled.querySelector('#period-growth-rate');
    expect(growthElem?.textContent).toBe(comp.growthPercent);
  });
});
