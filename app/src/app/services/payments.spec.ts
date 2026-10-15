import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { PaymentIntentRequest } from '@cal-sarda/domain';
import {
  MockPaymentGatewayAdapter,
  PAYMENT_GATEWAY_ADAPTER,
  PaymentGatewayAdapter,
  PaymentsService,
  StripePaymentGatewayAdapter,
} from './payments';

describe('PaymentsService & PaymentGatewayAdapter (Issue #45)', () => {
  let service: PaymentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PaymentsService, MockPaymentGatewayAdapter],
    });
    service = TestBed.inject(PaymentsService);
  });

  const baseCustomer = {
    name: 'Jaume Sardà',
    email: 'cliente@calsarda.com',
    phone: '612 345 678',
  };

  describe('Validaciones de formato (Tarjeta y Bizum)', () => {
    it('valida correctamente tarjetas bancarias con el algoritmo de Luhn', () => {
      // Tarjeta de prueba Visa estándar válida
      const validCheck = service.validateCard('4242 4242 4242 4242', '12/28', '123');
      expect(validCheck.valid).toBe(true);

      // Tarjeta con dígito de control erróneo (falla Luhn)
      const invalidLuhn = service.validateCard('4242 4242 4242 4241', '12/28', '123');
      expect(invalidLuhn.valid).toBe(false);
      expect(invalidLuhn.error).toContain('algoritmo de verificación');
    });

    it('detecta tarjetas caducadas o con formato de fecha inválido', () => {
      const expiredCheck = service.validateCard('4242 4242 4242 4242', '01/20', '123');
      expect(expiredCheck.valid).toBe(false);
      expect(expiredCheck.error).toContain('caducada');

      const badFormat = service.validateCard('4242 4242 4242 4242', '2028/12', '123');
      expect(badFormat.valid).toBe(false);
      expect(badFormat.error).toContain('formato MM/AA');
    });

    it('valida longitud de código de seguridad CVC', () => {
      const shortCvc = service.validateCard('4242 4242 4242 4242', '12/28', '1');
      expect(shortCvc.valid).toBe(false);
      expect(shortCvc.error).toContain('CVC');
    });

    it('valida números de teléfono españoles para Bizum', () => {
      expect(service.validateBizum('612 345 678').valid).toBe(true);
      expect(service.validateBizum('+34 712 345 678').valid).toBe(true);
      expect(service.validateBizum('93 232 55 08').valid).toBe(false); // Fijo no permitido
      expect(service.validateBizum('12345').valid).toBe(false);
    });
  });

  describe('Procesamiento con MockPaymentGatewayAdapter', () => {
    it('procesa y aprueba un cobro online con tarjeta bancaria (SCA PSD2)', async () => {
      const request: PaymentIntentRequest = {
        orderReference: 'CS-2026-1045',
        amount: 45.5,
        currency: 'eur',
        paymentMethod: 'card',
        customer: baseCustomer,
        cardNumber: '4242 4242 4242 4242',
        cardExp: '12/28',
        cardCvc: '123',
      };

      const result = await service.processPayment(request);

      expect(result.success).toBe(true);
      expect(result.status).toBe('confirmed');
      expect(result.transactionId).toContain('TX-CARD-VISA-');
      expect(result.orderReference).toBe('CS-2026-1045');
      expect(result.amount).toBe(45.5);
      expect(result.details?.['scaVerified']).toBe(true);
      expect(service.lastTransaction()).toEqual(result);
    });

    it('simula denegación bancaria por fondos insuficientes (tarjeta acabada en 0002)', async () => {
      const request: PaymentIntentRequest = {
        orderReference: 'CS-2026-1046',
        amount: 80.0,
        currency: 'eur',
        paymentMethod: 'card',
        customer: baseCustomer,
        cardNumber: '4000 0000 0000 0002',
        cardExp: '12/28',
        cardCvc: '123',
      };

      const result = await service.processPayment(request);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.transactionId).toContain('TX-DECLINED-');
      expect(result.errorMessage).toContain('fondos insuficientes');
    });

    it('procesa el pago móvil instantáneo por Bizum', async () => {
      const request: PaymentIntentRequest = {
        orderReference: 'CS-2026-1047',
        amount: 32.0,
        currency: 'eur',
        paymentMethod: 'bizum',
        customer: baseCustomer,
        bizumPhone: '655 443 322',
      };

      const result = await service.processPayment(request);

      expect(result.success).toBe(true);
      expect(result.status).toBe('confirmed');
      expect(result.transactionId).toContain('TX-BIZUM-');
      expect(result.details?.['bizumPhone']).toBe('655443322');
    });

    it('registra pago en tienda física como pendiente de cobro presencial', async () => {
      const request: PaymentIntentRequest = {
        orderReference: 'CS-2026-1048',
        amount: 15.0,
        currency: 'eur',
        paymentMethod: 'store',
        customer: baseCustomer,
      };

      const result = await service.processPayment(request);

      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
      expect(result.transactionId).toContain('TX-STORE-');
    });
  });

  describe('Sustitución de pasarela mediante Costura (Seam)', () => {
    it('permite inyectar un adaptador personalizado mediante PAYMENT_GATEWAY_ADAPTER', async () => {
      const customMockAdapter: PaymentGatewayAdapter = {
        processPayment: vi.fn().mockResolvedValue({
          success: true,
          transactionId: 'TX-CUSTOM-TPV-12345',
          status: 'confirmed',
          paymentMethod: 'card',
          orderReference: 'CS-TEST-999',
          amount: 50,
          currency: 'eur',
          timestamp: new Date().toISOString(),
        }),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PaymentsService,
          { provide: PAYMENT_GATEWAY_ADAPTER, useValue: customMockAdapter },
        ],
      });

      const customService = TestBed.inject(PaymentsService);
      const res = await customService.processPayment({
        orderReference: 'CS-TEST-999',
        amount: 50,
        currency: 'eur',
        paymentMethod: 'card',
        customer: baseCustomer,
      });

      expect(res.transactionId).toBe('TX-CUSTOM-TPV-12345');
      expect(customMockAdapter.processPayment).toHaveBeenCalled();
    });
  });
});
