import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { AdminOrders } from './admin-orders';
import {
  OrdersService,
  InMemoryOrdersRepository,
  ORDERS_REPOSITORY,
  DEFAULT_INITIAL_ORDERS,
  type Order,
} from '../../../services/orders';
import { I18nService } from '../../../services/i18n';

describe('AdminOrders', () => {
  let component: AdminOrders;
  let ordersService: OrdersService;
  let inMemoryRepo: InMemoryOrdersRepository;

  beforeEach(async () => {
    inMemoryRepo = new InMemoryOrdersRepository([...DEFAULT_INITIAL_ORDERS]);

    await TestBed.configureTestingModule({
      imports: [AdminOrders],
      providers: [
        provideRouter([]),
        OrdersService,
        I18nService,
        { provide: ORDERS_REPOSITORY, useValue: inMemoryRepo },
      ],
    }).compileComponents();

    ordersService = TestBed.inject(OrdersService);
    const fixture = TestBed.createComponent(AdminOrders);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component and loads initial orders', () => {
    expect(component).toBeTruthy();
    expect(component.filteredOrders().length).toBe(DEFAULT_INITIAL_ORDERS.length);
    expect(component.statusCounts().todos).toBe(DEFAULT_INITIAL_ORDERS.length);
  });

  it('filters orders by operational status', () => {
    // Filtrar por 'en_preparacion'
    component.setStatusFilter('en_preparacion');
    const prepOrders = component.filteredOrders();
    expect(prepOrders.length).toBeGreaterThan(0);
    expect(prepOrders.every((o) => component.normalizeStatus(o.status) === 'en_preparacion')).toBe(
      true,
    );

    // Filtrar por 'listo_recogida'
    component.setStatusFilter('listo_recogida');
    const readyOrders = component.filteredOrders();
    expect(readyOrders.length).toBeGreaterThan(0);
    expect(readyOrders.every((o) => component.normalizeStatus(o.status) === 'listo_recogida')).toBe(
      true,
    );

    // Restablecer a 'todos'
    component.setStatusFilter('todos');
    expect(component.filteredOrders().length).toBe(DEFAULT_INITIAL_ORDERS.length);
  });

  it('filters orders by fulfillment modality (pickup vs delivery)', () => {
    // Filtrar solo recogidas en tienda
    component.setFulfillmentFilter('pickup');
    const pickupOrders = component.filteredOrders();
    expect(pickupOrders.length).toBeGreaterThan(0);
    expect(pickupOrders.every((o) => o.fulfillment === 'pickup')).toBe(true);

    // Filtrar solo entregas a domicilio
    component.setFulfillmentFilter('delivery');
    const deliveryOrders = component.filteredOrders();
    expect(deliveryOrders.length).toBeGreaterThan(0);
    expect(deliveryOrders.every((o) => o.fulfillment === 'delivery')).toBe(true);
  });

  it('searches orders live by reference, customer name or phone', () => {
    // Búsqueda por referencia
    component.searchQuery.set('CS-2026-1042');
    let results = component.filteredOrders();
    expect(results.length).toBe(1);
    expect(results[0].reference).toBe('CS-2026-1042');

    // Búsqueda por nombre de cliente
    component.searchQuery.set('Montserrat');
    results = component.filteredOrders();
    expect(results.length).toBe(1);
    expect(results[0].customer.name).toBe('Montserrat Puig');

    // Búsqueda por teléfono
    component.searchQuery.set('633 456');
    results = component.filteredOrders();
    expect(results.length).toBe(1);
    expect(results[0].customer.name).toBe('Jaume Sardà');

    // Limpiar búsqueda
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
    expect(component.filteredOrders().length).toBe(DEFAULT_INITIAL_ORDERS.length);
  });

  it('opens and closes the order detail modal', () => {
    const targetOrder = DEFAULT_INITIAL_ORDERS[0];
    expect(component.selectedOrder()).toBeNull();

    component.openOrderDetail(targetOrder);
    expect(component.selectedOrder()).toEqual(targetOrder);

    component.closeOrderDetail();
    expect(component.selectedOrder()).toBeNull();
  });

  it('advances order status and updates reactive signals and modal state', async () => {
    const orderToAdvance = DEFAULT_INITIAL_ORDERS.find((o) => o.reference === 'CS-2026-1040')!;
    expect(component.normalizeStatus(orderToAdvance.status)).toBe('recibido');

    // Abrir modal y avanzar a 'en_preparacion'
    component.openOrderDetail(orderToAdvance);
    await component.advanceStatus(orderToAdvance, 'en_preparacion');

    expect(component.selectedOrder()?.status).toBe('en_preparacion');

    const updatedInList = component
      .filteredOrders()
      .find((o) => o.reference === orderToAdvance.reference);
    expect(updatedInList?.status).toBe('en_preparacion');

    // Avanzar de 'en_preparacion' a 'listo_recogida'
    await component.advanceStatus(orderToAdvance, 'listo_recogida');
    expect(component.selectedOrder()?.status).toBe('listo_recogida');
  });

  it('cancels order through cancelOrder action', async () => {
    const orderToCancel = DEFAULT_INITIAL_ORDERS.find((o) => o.reference === 'CS-2026-1041')!;
    component.openOrderDetail(orderToCancel);

    await component.cancelOrder(orderToCancel);

    expect(component.selectedOrder()?.status).toBe('cancelado');
    const updated = component.filteredOrders().find((o) => o.reference === orderToCancel.reference);
    expect(updated?.status).toBe('cancelado');
  });

  it('refreshes orders list via refreshOrders', async () => {
    await component.refreshOrders();
    expect(component.isRefreshing()).toBe(false);
    expect(component.filteredOrders().length).toBe(DEFAULT_INITIAL_ORDERS.length);
  });

  it('calls invoicingService.printInvoice when printInvoice is triggered', () => {
    const order = DEFAULT_INITIAL_ORDERS[0];
    const printSpy = vi
      .spyOn(component.invoicingService, 'printInvoice')
      .mockImplementation(() => {});
    component.printInvoice(order);
    expect(printSpy).toHaveBeenCalled();
  });
});
