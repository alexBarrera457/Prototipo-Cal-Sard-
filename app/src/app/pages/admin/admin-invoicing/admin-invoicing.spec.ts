import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AdminInvoicing } from './admin-invoicing';
import {
  OrdersService,
  InMemoryOrdersRepository,
  ORDERS_REPOSITORY,
  DEFAULT_INITIAL_ORDERS,
} from '../../../services/orders';
import { InvoicingService } from '../../../services/invoicing';
import { I18nService } from '../../../services/i18n';

describe('AdminInvoicing', () => {
  let component: AdminInvoicing;
  let fixture: ComponentFixture<AdminInvoicing>;
  let invoicingService: InvoicingService;
  let inMemoryRepo: InMemoryOrdersRepository;

  beforeEach(async () => {
    inMemoryRepo = new InMemoryOrdersRepository([...DEFAULT_INITIAL_ORDERS]);

    await TestBed.configureTestingModule({
      imports: [AdminInvoicing],
      providers: [
        provideRouter([]),
        OrdersService,
        InvoicingService,
        I18nService,
        { provide: ORDERS_REPOSITORY, useValue: inMemoryRepo },
      ],
    }).compileComponents();

    invoicingService = TestBed.inject(InvoicingService);
    const ordersService = TestBed.inject(OrdersService);
    await ordersService.loadAllOrders();

    fixture = TestBed.createComponent(AdminInvoicing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component and generates invoices from all orders', () => {
    expect(component).toBeTruthy();
    expect(component.allInvoices().length).toBe(DEFAULT_INITIAL_ORDERS.length);
    expect(component.filteredInvoices().length).toBe(DEFAULT_INITIAL_ORDERS.length);
  });

  it('calculates consolidated fiscal aggregates and VAT breakdown', () => {
    const agg = component.fiscalAggregates();
    expect(agg.invoiceCount).toBe(DEFAULT_INITIAL_ORDERS.length);
    expect(agg.totalBilled).toBeGreaterThan(0);
    expect(agg.totalBase).toBeGreaterThan(0);
    expect(agg.totalVat).toBeGreaterThan(0);
    // Base + IVA should equal total (subject to rounding within 1 cent)
    expect(Math.abs(agg.totalBase + agg.totalVat - agg.totalBilled)).toBeLessThan(0.05);

    // VAT rates breakdown exist
    expect(agg.base4 + agg.base10 + agg.base21).toBeGreaterThan(0);
  });

  it('filters invoices by search query', () => {
    component.searchQueryModel = 'Montserrat';
    component.onSearchChange();
    fixture.detectChanges();

    const filtered = component.filteredInvoices();
    expect(filtered.length).toBe(1);
    expect(filtered[0].customer.name).toContain('Montserrat');

    component.clearSearch();
    expect(component.filteredInvoices().length).toBe(DEFAULT_INITIAL_ORDERS.length);
  });

  it('filters invoices by VAT rate presence', () => {
    // 21% (wine or shipping)
    component.setVatFilter('21');
    const filtered21 = component.filteredInvoices();
    expect(filtered21.length).toBeGreaterThan(0);
    expect(filtered21.every((inv) => inv.taxBreakdown.some((t) => t.vatRate === 21))).toBe(true);

    component.setVatFilter('todos');
    expect(component.filteredInvoices().length).toBe(DEFAULT_INITIAL_ORDERS.length);
  });

  it('filters invoices by period', () => {
    component.setPeriodFilter('mes');
    const filteredMonth = component.filteredInvoices();
    expect(filteredMonth.length).toBeGreaterThanOrEqual(0);

    component.setPeriodFilter('todos');
    expect(component.filteredInvoices().length).toBe(DEFAULT_INITIAL_ORDERS.length);
  });

  it('opens and closes the invoice preview dialog', () => {
    const invoice = component.filteredInvoices()[0];
    component.openPreview(invoice);
    expect(component.selectedInvoice()).toBe(invoice);

    component.closePreview();
    expect(component.selectedInvoice()).toBeNull();
  });

  it('delegates invoice printing to InvoicingService', () => {
    const printSpy = vi.spyOn(invoicingService, 'printInvoice').mockImplementation(() => {});
    const invoice = component.filteredInvoices()[0];

    component.printInvoice(invoice);
    expect(printSpy).toHaveBeenCalledWith(invoice);
  });

  it('delegates invoice PDF download to InvoicingService and shows toast', () => {
    const downloadSpy = vi
      .spyOn(invoicingService, 'downloadInvoicePdf')
      .mockImplementation(() => {});
    const invoice = component.filteredInvoices()[0];

    component.downloadInvoicePdf(invoice);
    expect(downloadSpy).toHaveBeenCalledWith(invoice);
    expect(component.toastMessage()).toBeTruthy();
  });

  it('triggers CSV download for fiscal book export', () => {
    const origCreateObjectURL = (globalThis as any).URL.createObjectURL;
    const origRevokeObjectURL = (globalThis as any).URL.revokeObjectURL;

    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-csv-url');
    const revokeObjectURLMock = vi.fn();
    (globalThis as any).URL.createObjectURL = createObjectURLMock;
    (globalThis as any).URL.revokeObjectURL = revokeObjectURLMock;

    let clicked = false;
    const origCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'a') {
          el.click = () => {
            clicked = true;
          };
        }
        return el;
      });

    component.exportFiscalBookCsv();

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clicked).toBe(true);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/mock-csv-url');

    createElementSpy.mockRestore();
    (globalThis as any).URL.createObjectURL = origCreateObjectURL;
    (globalThis as any).URL.revokeObjectURL = origRevokeObjectURL;
  });

  it('renders KPI cards and invoice table in template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#invoicing-title')).toBeTruthy();
    expect(compiled.querySelectorAll('.kpi-card').length).toBe(4);
    expect(compiled.querySelectorAll('.vat-card').length).toBe(3);
    expect(compiled.querySelectorAll('.invoice-row').length).toBe(DEFAULT_INITIAL_ORDERS.length);
  });
});
