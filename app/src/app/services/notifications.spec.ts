import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_NOTIFICATION_CONFIG,
  HttpEmailAdapter,
  InMemoryEmailAdapter,
  InMemoryWebhookAdapter,
  NotificationConfig,
  NotificationService,
} from './notifications';
import type { Order } from '@cal-sarda/domain';

describe('NotificationService', () => {
  const samplePickupOrder: Order = {
    reference: 'CS-2026-1042',
    customer: {
      name: 'Maria Garcia',
      email: 'maria.garcia@test.cat',
      phone: '612345678',
    },
    items: [
      {
        name: 'Secallona artesana',
        price: 6.8,
        quantity: 2,
        productNumber: '02',
      },
      {
        name: 'Formatge de Maó semicurat',
        price: 9.5,
        quantity: 1,
        productNumber: '05',
      },
    ],
    subtotal: 23.1,
    shippingCost: 0,
    total: 23.1,
    fulfillment: 'pickup',
    shippingZoneLabel: 'Recogida en tienda (gratis)',
    estimatedDate:
      'Disponible para recogida en tienda a partir de mañana (laborable de 9:00 a 14:00 y de 17:00 a 20:30) en Carrer de Marina, 237, Barcelona',
    paymentMethod:
      'Pago en tienda física en el momento de la recogida (tarjeta bancaria o efectivo) o mediante Bizum.',
    status: 'confirmed',
    createdAt: '2026-10-14T10:00:00.000Z',
  };

  const sampleDeliveryOrder: Order = {
    reference: 'CS-2026-1043',
    customer: {
      name: 'Jordi Vila',
      email: 'jordi.vila@test.cat',
      phone: '654987321',
      address: 'Carrer de Mallorca, 120, 3r 2a',
      postalCode: '08029',
      city: 'Barcelona',
    },
    items: [
      {
        name: 'Café 100% Robusta',
        price: 4.8,
        quantity: 3,
      },
    ],
    subtotal: 14.4,
    shippingCost: 7.99,
    total: 22.39,
    fulfillment: 'delivery',
    shippingZoneLabel: 'Cataluña (7,99 €)',
    estimatedDate: 'Entrega estimada en 24-48 horas laborables (transporte refrigerado urgente)',
    paymentMethod:
      'Pago por Bizum al confirmar el encargo telefónicamente o contra reembolso al recibirlo.',
    status: 'confirmed',
    createdAt: '2026-10-14T10:05:00.000Z',
  };

  it('builds a customer email with greeting, reference code, pickup instructions, and product breakdown', () => {
    const service = new NotificationService();
    const email = service.buildCustomerEmail(samplePickupOrder);

    expect(email.to).toBe('maria.garcia@test.cat');
    expect(email.subject).toContain('CS-2026-1042');
    expect(email.subject).toContain('Confirmación de tu encargo');
    expect(email.replyTo).toBe('sarda@calsarda.com');

    // HTML assertions
    expect(email.html).toContain('Maria Garcia');
    expect(email.html).toContain('CS-2026-1042');
    expect(email.html).toContain('Marina, 237');
    expect(email.html).toContain('Secallona artesana');
    expect(email.html).toContain('23.10 €');
    expect(email.html).toContain('tienda física');
    expect(email.html).toContain('93 232 55 08');

    // Plain text assertions
    expect(email.text).toContain('Hola, Maria Garcia:');
    expect(email.text).toContain('CS-2026-1042');
    expect(email.text).toContain('Secallona artesana');
    expect(email.text).toContain('TOTAL FINAL: 23.10 €');
  });

  it('builds a customer email with delivery details and shipping address', () => {
    const service = new NotificationService();
    const email = service.buildCustomerEmail(sampleDeliveryOrder);

    expect(email.to).toBe('jordi.vila@test.cat');
    expect(email.html).toContain('Envío refrigerado a domicilio');
    expect(email.html).toContain('Carrer de Mallorca, 120');
    expect(email.html).toContain('08029 Barcelona');
    expect(email.html).toContain('7.99 €');
    expect(email.html).toContain('22.39 €');
    expect(email.text).toContain('Carrer de Mallorca, 120');
    expect(email.text).toContain('TOTAL FINAL: 22.39 €');
  });

  it('builds a store alert email to sarda@calsarda.com with obrador details and phone number', () => {
    const service = new NotificationService();
    const email = service.buildStoreEmail(samplePickupOrder);

    expect(email.to).toBe('sarda@calsarda.com');
    expect(email.subject).toContain('[NUEVO ENCARGO] CS-2026-1042');
    expect(email.subject).toContain('Maria Garcia');
    expect(email.subject).toContain('Recogida');
    expect(email.replyTo).toBe('maria.garcia@test.cat');

    // Obrador preparation content
    expect(email.html).toContain('NUEVO ENCARGO WEB RECIBIDO');
    expect(email.html).toContain('612345678');
    expect(email.html).toContain('Secallona artesana');
    expect(email.html).toContain('Formatge de Maó');
    expect(email.html).toContain('TOTAL DEL ENCARGO: 23.10 €');

    expect(email.text).toContain('Teléfono: 612345678');
    expect(email.text).toContain('Secallona artesana');
  });

  it('sends both customer and store notifications concurrently and registers in sent emails', async () => {
    const adapter = new InMemoryEmailAdapter();
    const service = new NotificationService(adapter);

    expect(service.getSentEmails().length).toBe(0);

    const result = await service.sendOrderConfirmationNotifications(samplePickupOrder);

    expect(result.customerNotification.success).toBe(true);
    expect(result.storeNotification.success).toBe(true);
    expect(service.getSentEmails().length).toBe(2);

    const sent = service.getSentEmails();
    const customerSent = sent.find((e) => e.to === 'maria.garcia@test.cat');
    const storeSent = sent.find((e) => e.to === 'sarda@calsarda.com');

    expect(customerSent).toBeTruthy();
    expect(customerSent?.subject).toContain('CS-2026-1042');
    expect(storeSent).toBeTruthy();
    expect(storeSent?.subject).toContain('[NUEVO ENCARGO]');

    service.clearSentEmails();
    expect(service.getSentEmails().length).toBe(0);
  });

  it('HttpEmailAdapter falls back to InMemory adapter when apiKey is absent', async () => {
    const fallback = new InMemoryEmailAdapter();
    const httpAdapter = new HttpEmailAdapter({ ...DEFAULT_NOTIFICATION_CONFIG }, fallback);

    const email = {
      to: 'cliente@test.cat',
      from: 'pedidos@calsarda.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    };

    const res = await httpAdapter.sendEmail(email);
    expect(res.success).toBe(true);
    expect(fallback.getSentEmails().length).toBe(1);
  });

  it('HttpEmailAdapter makes HTTP fetch when apiKey is present and handles response', async () => {
    const customConfig: NotificationConfig = {
      ...DEFAULT_NOTIFICATION_CONFIG,
      apiKey: 're_test_key_123456',
      apiUrl: 'https://api.resend.test/emails',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'resend_email_id_999' }),
    } as Response);

    const httpAdapter = new HttpEmailAdapter(customConfig);
    const email = {
      to: 'cliente@test.cat',
      from: 'pedidos@calsarda.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    };

    const res = await httpAdapter.sendEmail(email);
    expect(res.success).toBe(true);
    expect(res.messageId).toBe('resend_email_id_999');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.resend.test/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test_key_123456',
        }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it('HttpEmailAdapter falls back to in-memory sender when HTTP request fails', async () => {
    const customConfig: NotificationConfig = {
      ...DEFAULT_NOTIFICATION_CONFIG,
      apiKey: 're_test_key_123456',
      apiUrl: 'https://api.resend.test/emails',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const fallback = new InMemoryEmailAdapter();
    const httpAdapter = new HttpEmailAdapter(customConfig, fallback);
    const email = {
      to: 'cliente@test.cat',
      from: 'pedidos@calsarda.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    };

    const res = await httpAdapter.sendEmail(email);
    expect(res.success).toBe(true);
    expect(fallback.getSentEmails().length).toBe(1);

    fetchSpy.mockRestore();
  });

  describe('Order Status Change Alerts & Webhooks', () => {
    it('returns appropriate bilingual copy for each order status', () => {
      const service = new NotificationService();

      // Spanish copies
      const prepEs = service.getStatusAlertCopy('en_preparacion', 'pickup', 'es');
      expect(prepEs.badge).toBe('EN PREPARACIÓN');
      expect(prepEs.instructions).toContain('Marina, 237');

      const readyEs = service.getStatusAlertCopy('listo_recogida', 'pickup', 'es');
      expect(readyEs.badge).toBe('LISTO PARA RECOGER');
      expect(readyEs.instructions).toContain('Lunes a sábado de 9:00 a 14:00');

      const shippedEs = service.getStatusAlertCopy('enviado', 'delivery', 'es');
      expect(shippedEs.badge).toBe('EN REPARTO');
      expect(shippedEs.instructions).toContain('24 horas');

      const deliveredEs = service.getStatusAlertCopy('entregado', 'delivery', 'es');
      expect(deliveredEs.badge).toBe('ENTREGADO');

      // Catalan copies
      const prepCa = service.getStatusAlertCopy('en_preparacion', 'pickup', 'ca');
      expect(prepCa.badge).toBe('EN PREPARACIÓ');
      expect(prepCa.headline).toContain('Obrador fil a l’agulla');

      const readyCa = service.getStatusAlertCopy('listo_recogida', 'pickup', 'ca');
      expect(readyCa.badge).toBe('A PUNT PER RECOLLIR');
      expect(readyCa.instructions).toContain('De dilluns a dissabte');

      const shippedCa = service.getStatusAlertCopy('enviado', 'delivery', 'ca');
      expect(shippedCa.badge).toBe('EN REPARTIMENT');
      expect(shippedCa.instructions).toContain('24 hores feineres');
    });

    it('builds a responsive status change email with reference, items, and instructions', () => {
      const service = new NotificationService();
      const email = service.buildStatusChangeEmail(samplePickupOrder, 'listo_recogida', 'es');

      expect(email.to).toBe('maria.garcia@test.cat');
      expect(email.subject).toContain('[Cal Sardà]');
      expect(email.subject).toContain('CS-2026-1042');
      expect(email.subject).toContain('listo para recoger');
      expect(email.html).toContain('LISTO PARA RECOGER');
      expect(email.html).toContain('Marina, 237');
      expect(email.html).toContain('Secallona artesana');
      expect(email.html).toContain('23.10 €');
      expect(email.text).toContain('Estado: LISTO PARA RECOGER');
      expect(email.text).toContain('CS-2026-1042');
    });

    it('dispatches status change notification via email and webhook adapter', async () => {
      const emailAdapter = new InMemoryEmailAdapter();
      const webhookAdapter = new InMemoryWebhookAdapter();
      const service = new NotificationService(emailAdapter, undefined, webhookAdapter);

      const modifiedOrder: Order = {
        ...samplePickupOrder,
        status: 'en_preparacion',
      };

      const result = await service.sendOrderStatusChangeNotification(
        modifiedOrder,
        'recibido',
        'es',
      );

      expect(result.emailSent).toBe(true);
      expect(result.webhookDispatched).toBe(true);
      expect(result.payload.event).toBe('order.status_changed');
      expect(result.payload.orderReference).toBe('CS-2026-1042');
      expect(result.payload.previousStatus).toBe('recibido');
      expect(result.payload.newStatus).toBe('en_preparacion');
      expect(result.payload.customer.name).toBe('Maria Garcia');
      expect(result.payload.alertMessage).toContain('maestros artesanos');

      // Verify email sent
      expect(emailAdapter.getSentEmails().length).toBe(1);
      expect(emailAdapter.getSentEmails()[0].subject).toContain('preparación en el obrador');

      // Verify webhook stored in adapter and signal
      expect(webhookAdapter.getDispatchedWebhooks().length).toBe(1);
      expect(service.lastDispatchedAlert()?.newStatus).toBe('en_preparacion');

      // Clear webhooks
      service.clearDispatchedWebhooks();
      expect(webhookAdapter.getDispatchedWebhooks().length).toBe(0);
      expect(service.lastDispatchedAlert()).toBeNull();
    });

    it('genera y envía correos de recordatorio de cesta abandonada en catalán y castellano', async () => {
      const emailAdapter = new InMemoryEmailAdapter();
      const service = new NotificationService(emailAdapter);

      const payloadEs = {
        customerName: 'Laura Soler',
        customerEmail: 'laura@example.com',
        items: [
          { name: 'Queso Curado de Pastor', price: 14.5, quantity: 1 },
          { name: 'Fuet de Vic', price: 6.5, quantity: 2 },
        ],
        total: 27.5,
        recoveryUrl: 'https://calsarda.com/preparar-pedido',
        lang: 'es' as const,
      };

      const emailEs = service.buildAbandonedCartEmail(payloadEs);
      expect(emailEs.to).toBe('laura@example.com');
      expect(emailEs.subject).toContain('Tu selección gourmet te está esperando');
      expect(emailEs.html).toContain('Retomar mi pedido');
      expect(emailEs.html).toContain('27.50 €');
      expect(emailEs.text).toContain('Queso Curado de Pastor');

      const payloadCa = {
        ...payloadEs,
        lang: 'ca' as const,
      };

      const emailCa = service.buildAbandonedCartEmail(payloadCa);
      expect(emailCa.subject).toContain("La teva selecció gourmet t'està esperant");
      expect(emailCa.html).toContain('Reprendre la meva comanda');

      const sendResult = await service.sendAbandonedCartNotification(payloadCa);
      expect(sendResult.success).toBe(true);
      expect(emailAdapter.getSentEmails().length).toBe(1);
    });
  });
});
