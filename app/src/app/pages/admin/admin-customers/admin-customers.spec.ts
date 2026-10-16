import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, expect, it, beforeEach } from 'vitest';
import { AdminCustomers } from './admin-customers';
import { CustomersService } from '../../../services/customers';
import {
  OrdersService,
  InMemoryOrdersRepository,
  ORDERS_REPOSITORY,
} from '../../../services/orders';
import { I18nService } from '../../../services/i18n';

describe('AdminCustomers', () => {
  let component: AdminCustomers;
  let fixture: ComponentFixture<AdminCustomers>;
  let customersService: CustomersService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminCustomers],
      providers: [
        CustomersService,
        OrdersService,
        I18nService,
        {
          provide: ORDERS_REPOSITORY,
          useValue: new InMemoryOrdersRepository([
            {
              id: 'ord-1',
              reference: 'CS-2026-1042',
              customer: {
                name: 'Montserrat Puig',
                email: 'montserrat.puig@gmail.com',
                phone: '612 345 678',
              },
              items: [{ name: 'Pan de Pagès', price: 3.5, quantity: 2 }],
              total: 7.0,
              status: 'entregado',
              createdAt: '2026-03-01T10:00:00Z',
            },
            {
              id: 'ord-2',
              reference: 'CS-2026-1041',
              customer: {
                name: 'Jaume Sardà',
                email: 'cliente@calsarda.com',
                phone: '611 223 344',
              },
              items: [{ name: 'Llonganissa de Vic', price: 9.8, quantity: 2 }],
              total: 19.6,
              status: 'entregado',
              createdAt: '2026-03-05T10:00:00Z',
            },
            {
              id: 'ord-3',
              reference: 'CS-2026-1040',
              customer: {
                name: 'Jaume Sardà',
                email: 'cliente@calsarda.com',
                phone: '611 223 344',
              },
              items: [{ name: 'Formatge Curat', price: 25.0, quantity: 1 }],
              total: 25.0,
              status: 'entregado',
              createdAt: '2026-03-10T10:00:00Z',
            },
          ]),
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCustomers);
    component = fixture.componentInstance;
    customersService = TestBed.inject(CustomersService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates the component and renders consolidated customer metrics', () => {
    expect(component).toBeTruthy();
    expect(component.totalCustomersCount()).toBe(2);
    expect(component.recurrentCustomersCount()).toBe(1); // Jaume tiene 2 pedidos
    expect(component.filteredCustomers().length).toBe(2);
  });

  it('filters customers by search query and recurrence', () => {
    component.onSearchChange('Montserrat');
    expect(component.filteredCustomers().length).toBe(1);
    expect(component.filteredCustomers()[0].email).toBe('montserrat.puig@gmail.com');

    component.clearSearch();
    expect(component.filteredCustomers().length).toBe(2);

    component.setRecurrenceFilter('recurrentes');
    expect(component.filteredCustomers().length).toBe(1);
    expect(component.filteredCustomers()[0].email).toBe('cliente@calsarda.com');

    component.setRecurrenceFilter('esporadicos');
    expect(component.filteredCustomers().length).toBe(1);
    expect(component.filteredCustomers()[0].email).toBe('montserrat.puig@gmail.com');
  });

  it('opens customer detail modal, edits obrador notes and customer type', () => {
    const jaume = component.filteredCustomers().find((c) => c.email === 'cliente@calsarda.com')!;
    component.openCustomerDetail(jaume);

    expect(component.selectedCustomer()).toBeDefined();
    expect(component.selectedCustomer()?.email).toBe('cliente@calsarda.com');

    component.notesDraft = 'Corte ultrafino y envasado en raciones de 150g';
    component.typeDraft = 'empresa';
    component.saveCustomerChanges();

    expect(component.toastMessage()).toContain('actualizada');
    const updated = customersService.getCustomerByEmail('cliente@calsarda.com');
    expect(updated?.internalNotes).toBe('Corte ultrafino y envasado en raciones de 150g');
    expect(updated?.type).toBe('empresa');

    component.closeCustomerDetail();
    expect(component.selectedCustomer()).toBeNull();
  });
});
