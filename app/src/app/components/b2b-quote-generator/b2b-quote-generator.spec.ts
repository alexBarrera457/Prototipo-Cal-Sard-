import { ComponentFixture, TestBed } from '@angular/core/testing';
import { B2bQuoteGeneratorComponent, CORPORATE_LOTS } from './b2b-quote-generator';
import { I18nService } from '../../services/i18n';
import { OrdersService, type Order } from '../../services/orders';
import { InvoicingService } from '../../services/invoicing';
import { AuthService } from '../../services/auth';

describe('B2bQuoteGeneratorComponent', () => {
  let component: B2bQuoteGeneratorComponent;
  let fixture: ComponentFixture<B2bQuoteGeneratorComponent>;
  let ordersService: OrdersService;
  let invoicingService: InvoicingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [B2bQuoteGeneratorComponent],
      providers: [
        I18nService,
        OrdersService,
        InvoicingService,
        {
          provide: AuthService,
          useValue: {
            currentUser: () => null,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(B2bQuoteGeneratorComponent);
    component = fixture.componentInstance;
    ordersService = TestBed.inject(OrdersService);
    invoicingService = TestBed.inject(InvoicingService);
    fixture.detectChanges();
  });

  it('debe crearse correctamente con valores iniciales por defecto', () => {
    expect(component).toBeTruthy();
    expect(component.selectedLot().id).toBe('lote-tradicion');
    expect(component.quantity()).toBe(30);
    expect(component.generatedInvoice()).toBeNull();
  });

  it('permite cambiar el lote seleccionado', () => {
    const lotGranReserva = CORPORATE_LOTS.find((l) => l.id === 'lote-gran-reserva')!;
    component.selectLot(lotGranReserva);
    expect(component.selectedLot().id).toBe('lote-gran-reserva');
    expect(component.selectedLot().price).toBe(85.0);
  });

  it('calcula correctamente el subtotal bruto y descuentos por volumen', () => {
    // 15 unidades a 45 € = 675 € (< 1.800 €) => 3% de descuento
    component.setQuantity(15);
    expect(component.grossSubtotal()).toBe(675);
    expect(component.discountPercent()).toBe(3);
    expect(component.discountAmount()).toBe(20.25);
    expect(component.netBase()).toBe(654.75);

    // 50 unidades a 45 € = 2.250 € (>= 1.800 €) => 5% de descuento
    component.setQuantity(50);
    expect(component.grossSubtotal()).toBe(2250);
    expect(component.discountPercent()).toBe(5);
    expect(component.discountAmount()).toBe(112.5);
    expect(component.netBase()).toBe(2137.5);
  });

  it('muestra mensaje de error si faltan campos obligatorios al generar proforma', async () => {
    component.companyName = '';
    component.cif = '';
    component.contactEmail = '';

    await component.generateProforma();

    expect(component.errorMessage()).toBeTruthy();
    expect(component.generatedInvoice()).toBeNull();
  });

  it('genera la proforma B2B con referencia PRF- y registra el pedido', async () => {
    component.companyName = 'Acme Corp S.L.';
    component.cif = 'B12345678';
    component.contactEmail = 'compras@acme.com';
    component.fiscalAddress = 'Carrer de Mallorca 100';
    component.postalCode = '08029';
    component.city = 'Barcelona';
    component.setQuantity(30);

    const submitSpy = vi.spyOn(ordersService, 'submitOrder');
    const invoiceSpy = vi.spyOn(invoicingService, 'generateInvoice');

    await component.generateProforma();

    expect(component.errorMessage()).toBe('');
    expect(submitSpy).toHaveBeenCalled();
    const createdOrder = submitSpy.mock.calls[0][0];
    expect(createdOrder.reference).toContain('PRF-');
    expect(createdOrder.status).toBe('proforma');
    expect(createdOrder.paymentStatus).toBe('pending');
    expect(createdOrder.customer.companyName).toBe('Acme Corp S.L.');
    expect(createdOrder.customer.taxId).toBe('B12345678');
    expect(createdOrder.paymentMethod).toBe('Transferencia bancaria B2B');

    expect(invoiceSpy).toHaveBeenCalled();
    const invoice = component.generatedInvoice();
    expect(invoice).not.toBeNull();
    expect(invoice?.invoiceNumber).toContain('PRF-');
    expect(invoice?.customer.companyName).toBe('Acme Corp S.L.');
    expect(invoice?.total).toBe(component.netBase());
  });

  it('invoca el servicio de impresión al llamar printProforma()', async () => {
    component.companyName = 'Acme Corp S.L.';
    component.cif = 'B12345678';
    component.contactEmail = 'compras@acme.com';
    component.fiscalAddress = 'Carrer de Mallorca 100';
    component.postalCode = '08029';

    await component.generateProforma();

    const printSpy = vi.spyOn(invoicingService, 'printInvoice').mockImplementation(() => {});
    component.printProforma();

    expect(printSpy).toHaveBeenCalledWith(component.generatedInvoice()!);
  });

  it('permite reiniciar el generador de presupuestos con reset()', async () => {
    component.companyName = 'Acme Corp S.L.';
    component.cif = 'B12345678';
    component.contactEmail = 'compras@acme.com';
    component.fiscalAddress = 'Carrer de Mallorca 100';
    component.postalCode = '08029';

    await component.generateProforma();
    expect(component.generatedInvoice()).not.toBeNull();

    component.reset();
    expect(component.generatedInvoice()).toBeNull();
    expect(component.errorMessage()).toBe('');
  });
});
