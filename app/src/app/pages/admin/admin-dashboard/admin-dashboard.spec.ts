import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { AdminDashboard } from './admin-dashboard';
import { AuthService, InMemoryAuthAdapter, AUTH_ADAPTER } from '../../../services/auth';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  beforeEach(async () => {
    const mockAdapter = new InMemoryAuthAdapter();
    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [provideRouter([]), AuthService, { provide: AUTH_ADAPTER, useValue: mockAdapter }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the dashboard and exposes operational KPIs', () => {
    expect(component).toBeTruthy();
    expect(component.kpis().todayOrders).toBeGreaterThan(0);
    expect(component.kpis().inPreparation).toBeGreaterThan(0);
    expect(component.kpis().readyPickup).toBeGreaterThan(0);
  });

  it('renders KPI values and recent orders in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#dashboard-title')).toBeTruthy();
    expect(compiled.querySelectorAll('.kpi-card').length).toBe(4);

    const firstOrder = compiled.querySelector('.order-ref-cell');
    expect(firstOrder?.textContent).toContain('CS-2026-1042');
  });
});
