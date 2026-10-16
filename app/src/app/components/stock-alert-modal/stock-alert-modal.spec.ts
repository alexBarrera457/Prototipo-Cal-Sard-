import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { PLATFORM_ID } from '@angular/core';
import { StockAlertModalComponent } from './stock-alert-modal';
import { StockAlertService } from '../../services/stock-alerts';
import { AuthService, InMemoryAuthAdapter, AUTH_ADAPTER } from '../../services/auth';
import { I18nService } from '../../services/i18n';
import type { StoreProduct } from '../../services/products';

describe('StockAlertModalComponent', () => {
  let component: StockAlertModalComponent;
  let fixture: ComponentFixture<StockAlertModalComponent>;
  let stockAlertService: StockAlertService;
  let authService: AuthService;

  const mockProduct: StoreProduct = {
    number: '01',
    name: 'Café 100% Robusta',
    category: 'CAFÉ GOURMET',
    price: 5.25,
    inStock: false,
    image: '/images/products/cafe.jpg',
    shortDescription: '5,25 €',
    description: 'Café gourmet artesanal',
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [StockAlertModalComponent],
      providers: [
        StockAlertService,
        I18nService,
        AuthService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AUTH_ADAPTER, useClass: InMemoryAuthAdapter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockAlertModalComponent);
    component = fixture.componentInstance;
    stockAlertService = TestBed.inject(StockAlertService);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and remain hidden when no product is active', () => {
    expect(component).toBeTruthy();
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
    expect(backdrop).toBeNull();
  });

  it('renders modal dialog when an out-of-stock product is opened', () => {
    stockAlertService.openAlertModal(mockProduct);
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
    expect(backdrop).toBeTruthy();

    const title = fixture.nativeElement.querySelector('.modal-title');
    expect(title?.textContent).toContain('Avisarme cuando vuelva a haber existencias');

    const prodName = fixture.nativeElement.querySelector('.prod-name');
    expect(prodName?.textContent).toContain('Café 100% Robusta');
  });

  it('switches between WhatsApp and Email channels', () => {
    stockAlertService.openAlertModal(mockProduct);
    fixture.detectChanges();

    expect(component.selectedChannel()).toBe('whatsapp');

    component.setChannel('email');
    fixture.detectChanges();
    expect(component.selectedChannel()).toBe('email');

    const input = fixture.nativeElement.querySelector('#contact-input');
    expect(input.type).toBe('email');
  });

  it('shows error feedback on submitting invalid contact', async () => {
    stockAlertService.openAlertModal(mockProduct);
    fixture.detectChanges();

    component.contactValue = '123'; // Demasiado corto para teléfono
    await component.submitAlert();
    fixture.detectChanges();

    expect(component.submissionState()).toBe('error');
    expect(component.errorMessage()).toBeTruthy();
    expect(stockAlertService.getWaitingCount('01')).toBe(0);
  });

  it('subscribes successfully with valid phone number and shows success state', async () => {
    stockAlertService.openAlertModal(mockProduct);
    fixture.detectChanges();

    component.contactValue = '612345678';
    component.customerName = 'Pere';
    await component.submitAlert();
    fixture.detectChanges();

    expect(component.submissionState()).toBe('success');
    expect(stockAlertService.getWaitingCount('01')).toBe(1);

    const alertBox = fixture.nativeElement.querySelector('.status-alert.alert-success');
    expect(alertBox).toBeTruthy();
  });

  it('detects duplicate subscription and displays duplicate notice', async () => {
    stockAlertService.openAlertModal(mockProduct);
    fixture.detectChanges();

    component.contactValue = '612345678';
    await component.submitAlert();
    fixture.detectChanges();
    expect(component.submissionState()).toBe('success');

    // Intentar suscribirse de nuevo con el mismo contacto
    await component.submitAlert();
    fixture.detectChanges();
    expect(component.submissionState()).toBe('duplicate');
  });

  it('pre-fills contact and name when customer is logged in', async () => {
    await authService.signIn({ email: 'cliente@calsarda.com', password: 'cliente1930' });
    stockAlertService.openAlertModal(mockProduct);
    fixture.detectChanges();

    expect(component.customerName).toBeTruthy();
    expect(component.contactValue).toBeTruthy();
  });

  it('closes modal when closeModal is called or escape is pressed', () => {
    stockAlertService.openAlertModal(mockProduct);
    fixture.detectChanges();
    expect(stockAlertService.activeAlertProduct()).not.toBeNull();

    component.onEscape();
    fixture.detectChanges();
    expect(stockAlertService.activeAlertProduct()).toBeNull();
  });
});
