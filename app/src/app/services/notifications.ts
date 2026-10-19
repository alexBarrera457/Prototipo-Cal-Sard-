import { Inject, inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import type { Order, OrderStatus } from '@cal-sarda/domain';

export interface OrderStatusWebhookPayload {
  event: 'order.status_changed';
  orderReference: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  previousStatus?: OrderStatus;
  newStatus: OrderStatus;
  fulfillment?: string;
  total: number;
  timestamp: string;
  alertMessage: string;
}

export interface StatusAlertCopy {
  subject: string;
  badge: string;
  headline: string;
  message: string;
  instructions: string;
}

export interface AbandonedCartEmailPayload {
  customerName: string;
  customerEmail: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  total: number;
  recoveryUrl?: string;
  lang?: 'ca' | 'es';
}

export interface WebhookSenderAdapter {
  dispatchWebhook(payload: OrderStatusWebhookPayload): Promise<boolean>;
  getDispatchedWebhooks?(): OrderStatusWebhookPayload[];
  clearDispatchedWebhooks?(): void;
}

export const WEBHOOK_SENDER_ADAPTER = new InjectionToken<WebhookSenderAdapter>(
  'WEBHOOK_SENDER_ADAPTER',
);

@Injectable()
export class InMemoryWebhookAdapter implements WebhookSenderAdapter {
  private readonly dispatches: OrderStatusWebhookPayload[] = [];

  async dispatchWebhook(payload: OrderStatusWebhookPayload): Promise<boolean> {
    this.dispatches.push({ ...payload });
    return true;
  }

  getDispatchedWebhooks(): OrderStatusWebhookPayload[] {
    return [...this.dispatches];
  }

  clearDispatchedWebhooks(): void {
    this.dispatches.length = 0;
  }
}

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationConfig {
  storeEmail: string;
  senderEmail: string;
  senderName: string;
  apiKey?: string;
  apiUrl?: string;
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  storeEmail: 'sarda@calsarda.com',
  senderEmail: 'pedidos@calsarda.com',
  senderName: 'Cal Sardà 1930',
};

export const NOTIFICATION_CONFIG = new InjectionToken<NotificationConfig>('NOTIFICATION_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_NOTIFICATION_CONFIG,
});

/**
 * Seam (Costura): Interfaz para el adaptador de envío de correos electrónicos transaccionales.
 * Desacopla la lógica de negocio de los proveedores externos (Resend, SendGrid, etc.).
 */
export interface EmailSenderAdapter {
  sendEmail(message: EmailMessage): Promise<SendEmailResult>;
  getSentEmails?(): EmailMessage[];
  clearSentEmails?(): void;
}

export const EMAIL_SENDER_ADAPTER = new InjectionToken<EmailSenderAdapter>('EMAIL_SENDER_ADAPTER');

/**
 * Adaptador de email en memoria para pruebas unitarias, desarrollo local y SSR.
 */
@Injectable()
export class InMemoryEmailAdapter implements EmailSenderAdapter {
  private readonly sentEmails: EmailMessage[] = [];

  async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    const copy = { ...message };
    this.sentEmails.push(copy);
    return {
      success: true,
      messageId: `mock-msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    };
  }

  getSentEmails(): EmailMessage[] {
    return [...this.sentEmails];
  }

  clearSentEmails(): void {
    this.sentEmails.length = 0;
  }
}

/**
 * Adaptador HTTP para envío mediante API REST (ej: Resend o Supabase Edge Functions).
 * Si no dispone de clave API o falla la conexión, recurre al adaptador en memoria.
 */
@Injectable()
export class HttpEmailAdapter implements EmailSenderAdapter {
  private readonly fallbackAdapter: EmailSenderAdapter;

  constructor(
    @Optional()
    @Inject(NOTIFICATION_CONFIG)
    private readonly config?: NotificationConfig,
    @Optional()
    @Inject('FALLBACK_EMAIL_ADAPTER')
    fallbackAdapter?: EmailSenderAdapter,
  ) {
    this.fallbackAdapter = fallbackAdapter ?? new InMemoryEmailAdapter();
  }

  async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    const apiKey = this.config?.apiKey;
    const apiUrl = this.config?.apiUrl ?? 'https://api.resend.com/emails';

    if (!apiKey) {
      return this.fallbackAdapter.sendEmail(message);
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `${this.config?.senderName ?? 'Cal Sardà'} <${message.from}>`,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Fallo al enviar correo con proveedor HTTP, usando fallback:', errorText);
        return this.fallbackAdapter.sendEmail(message);
      }

      const data = (await response.json()) as { id?: string };
      return {
        success: true,
        messageId: data.id ?? `http-msg-${Date.now()}`,
      };
    } catch (err) {
      console.warn('Excepción al enviar email vía HTTP, usando fallback:', err);
      return this.fallbackAdapter.sendEmail(message);
    }
  }

  getSentEmails(): EmailMessage[] {
    return this.fallbackAdapter.getSentEmails ? this.fallbackAdapter.getSentEmails() : [];
  }

  clearSentEmails(): void {
    if (this.fallbackAdapter.clearSentEmails) {
      this.fallbackAdapter.clearSentEmails();
    }
  }
}

/**
 * Servicio profundo para generación de plantillas y despacho de notificaciones transaccionales.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly adapter: EmailSenderAdapter;
  private readonly webhookAdapter: WebhookSenderAdapter;
  private readonly config: NotificationConfig;

  readonly lastDispatchedAlert = signal<OrderStatusWebhookPayload | null>(null);

  constructor(
    @Optional()
    @Inject(EMAIL_SENDER_ADAPTER)
    private readonly customAdapter?: EmailSenderAdapter,
    @Optional()
    @Inject(NOTIFICATION_CONFIG)
    private readonly customConfig?: NotificationConfig,
    @Optional()
    @Inject(WEBHOOK_SENDER_ADAPTER)
    private readonly customWebhookAdapter?: WebhookSenderAdapter,
  ) {
    this.config = this.customConfig ?? DEFAULT_NOTIFICATION_CONFIG;
    this.adapter = this.customAdapter ?? new InMemoryEmailAdapter();
    this.webhookAdapter = this.customWebhookAdapter ?? new InMemoryWebhookAdapter();
  }

  /**
   * Genera el contenido HTML y texto plano para el correo de confirmación del cliente.
   */
  buildCustomerEmail(order: Order): EmailMessage {
    const fromAddress = `${this.config.senderName} <${this.config.senderEmail}>`;
    const subject = `Confirmación de tu encargo en Cal Sardà - Ref: ${order.reference}`;

    const itemsRowsHtml = order.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5ded3;">
            <strong style="color: #251c15;">${it.name}</strong>
            ${it.productNumber ? `<br><small style="color: #8c7b6d;">Ref: ${it.productNumber}</small>` : ''}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5ded3; text-align: center; color: #4a3e35;">
            ${it.quantity}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5ded3; text-align: right; color: #4a3e35;">
            ${it.price.toFixed(2)} €
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5ded3; text-align: right; font-weight: bold; color: #251c15;">
            ${(it.quantity * it.price).toFixed(2)} €
          </td>
        </tr>`,
      )
      .join('');

    const fulfillmentDetailsHtml =
      order.fulfillment === 'pickup'
        ? `
        <div style="background-color: #f7f3ed; border-left: 4px solid #aa845c; padding: 14px 18px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px; color: #251c15; font-size: 15px;">🏪 Recogida en tienda física</h4>
          <p style="margin: 0 0 4px; color: #4a3e35; font-size: 14px;"><strong>Cal Sardà</strong> · Carrer de Marina, 237, 08013 Barcelona</p>
          <p style="margin: 0 0 4px; color: #6e5f52; font-size: 13px;">Horario obrador: Lunes a sábado de 9:00 a 14:00 y de 17:00 a 20:30</p>
          <p style="margin: 6px 0 0; color: #251c15; font-size: 13px;"><strong>${order.scheduledDate ? 'Cita concertada:' : 'Disponibilidad estimada:'}</strong> ${order.scheduledDate ? `${order.scheduledDate} ${order.scheduledTimeSlot ? `(${order.scheduledTimeSlot})` : ''}` : (order.estimatedDate ?? 'A partir de mañana a las 10:00 h')}</p>
        </div>`
        : `
        <div style="background-color: #f7f3ed; border-left: 4px solid #aa845c; padding: 14px 18px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px; color: #251c15; font-size: 15px;">🚚 Envío refrigerado a domicilio</h4>
          <p style="margin: 0 0 4px; color: #4a3e35; font-size: 14px;"><strong>Destinatario:</strong> ${order.customer.name}</p>
          <p style="margin: 0 0 4px; color: #4a3e35; font-size: 14px;">${order.customer.address}, ${order.customer.postalCode} ${order.customer.city}</p>
          <p style="margin: 0 0 4px; color: #6e5f52; font-size: 13px;">Zona: ${order.shippingZoneLabel ?? 'Península'}</p>
          <p style="margin: 6px 0 0; color: #251c15; font-size: 13px;"><strong>${order.scheduledDate ? 'Entrega concertada:' : 'Plazo estimado:'}</strong> ${order.scheduledDate ? `${order.scheduledDate} ${order.scheduledTimeSlot ? `(${order.scheduledTimeSlot})` : ''}` : (order.estimatedDate ?? '24-48 horas laborables')}</p>
        </div>`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; background-color: #f6f1ea; margin: 0; padding: 24px; color: #251c15;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5ded3;">
    <!-- Encabezado con identidad de marca -->
    <tr>
      <td style="background-color: #251c15; padding: 32px 36px; text-align: center; color: #f6f1ea;">
        <span style="font-size: 10px; letter-spacing: 3px; color: #c4a47c; font-weight: bold; font-family: sans-serif;">CAL SARDÀ · DESDE 1930</span>
        <h1 style="margin: 12px 0 0; font-size: 28px; font-weight: normal; letter-spacing: -0.5px;">¡Encargo confirmado!</h1>
      </td>
    </tr>
    <!-- Mensaje principal y código de referencia -->
    <tr>
      <td style="padding: 32px 36px;">
        <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">
          Hola, <strong>${order.customer.name}</strong>:
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #51443a;">
          Muchas gracias por tu confianza en Cal Sardà. Tu encargo ha quedado registrado correctamente y nuestro equipo en obrador ya está seleccionando los mejores productos artesanos para ti.
        </p>

        <div style="background-color: #251c15; color: #ffffff; padding: 18px 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 10px; letter-spacing: 2px; color: #c4a47c; font-weight: bold; font-family: sans-serif; display: block; margin-bottom: 4px;">TU CÓDIGO DE REFERENCIA</span>
          <strong style="font-size: 32px; letter-spacing: 2px;">${order.reference}</strong>
          <span style="display: block; font-size: 12px; color: #b8aba0; margin-top: 4px; font-family: sans-serif;">Conserva este código para recoger tu encargo o para cualquier consulta.</span>
        </div>

        ${fulfillmentDetailsHtml}

        <!-- Instrucciones de pago -->
        <div style="background-color: #fbf9f6; border: 1px solid #e5ded3; padding: 14px 18px; margin-bottom: 24px; font-family: sans-serif; font-size: 13px; color: #433830; line-height: 1.5;">
          <strong style="color: #251c15; font-size: 14px; display: block; margin-bottom: 4px;">💳 Modo de pago acordado:</strong>
          ${order.paymentMethod ?? 'Pago en tienda física en el momento de la recogida (efectivo o tarjeta bancaria) o Bizum.'}
        </div>

        <!-- Tabla de productos -->
        <h3 style="font-size: 18px; margin: 28px 0 12px; border-bottom: 2px solid #251c15; padding-bottom: 8px;">Detalle de productos</h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: sans-serif; font-size: 13px; margin-bottom: 20px;">
          <thead>
            <tr style="color: #7a6b5e; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">
              <th align="left" style="padding-bottom: 8px;">Producto</th>
              <th align="center" style="padding-bottom: 8px;">Cant.</th>
              <th align="right" style="padding-bottom: 8px;">Precio</th>
              <th align="right" style="padding-bottom: 8px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <!-- Totales -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: sans-serif; font-size: 14px; margin-bottom: 28px;">
          <tr>
            <td align="right" style="padding: 4px 0; color: #6e5f52;">Subtotal productos:</td>
            <td align="right" style="padding: 4px 0 4px 20px; width: 100px; color: #251c15;">${(order.subtotal ?? order.total - (order.shippingCost ?? 0)).toFixed(2)} €</td>
          </tr>
          <tr>
            <td align="right" style="padding: 4px 0; color: #6e5f52;">Gastos de envío:</td>
            <td align="right" style="padding: 4px 0 4px 20px; color: #251c15;">${order.shippingCost === 0 ? 'Gratis' : order.shippingCost?.toFixed(2) + ' €'}</td>
          </tr>
          <tr style="font-size: 17px; font-weight: bold; border-top: 1px solid #251c15;">
            <td align="right" style="padding: 10px 0; color: #251c15;">TOTAL FINAL (IVA incluido):</td>
            <td align="right" style="padding: 10px 0 10px 20px; color: #251c15;">${order.total.toFixed(2)} €</td>
          </tr>
        </table>

        <div style="border-top: 1px solid #e5ded3; padding-top: 20px; font-size: 13px; color: #6e5f52; line-height: 1.6; font-family: sans-serif;">
          <p style="margin: 0 0 4px;">¿Tienes alguna duda o petición especial?</p>
          <p style="margin: 0;">Llámanos al obrador: <a href="tel:+34932325508" style="color: #251c15; font-weight: bold; text-decoration: none;">93 232 55 08</a> o responde a este correo.</p>
        </div>
      </td>
    </tr>
    <!-- Pie -->
    <tr>
      <td style="background-color: #f7f3ed; padding: 20px 36px; text-align: center; font-size: 11px; color: #7a6b5e; font-family: sans-serif; border-top: 1px solid #e5ded3;">
        Cal Sardà · Carrer de Marina, 237 · 08013 Barcelona · sarda@calsarda.com
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `
CAL SARDÀ · DESDE 1930
=========================================
¡Encargo confirmado con éxito!

Hola, ${order.customer.name}:
Muchas gracias por tu confianza. Tu encargo ha quedado registrado correctamente.

CÓDIGO DE REFERENCIA: ${order.reference}
Conserva este código para cualquier consulta o para la recogida en tienda.

MODALIDAD: ${order.fulfillment === 'pickup' ? 'Recogida en tienda (C/ Marina 237, Barcelona)' : `Envío a domicilio (${order.customer.address}, ${order.customer.postalCode} ${order.customer.city})`}
FECHA Y HORARIO: ${order.scheduledDate ? `${order.scheduledDate} (${order.scheduledTimeSlot ?? ''})` : (order.estimatedDate ?? 'A partir de mañana a las 10:00 h')}
MÉTODO DE PAGO: ${order.paymentMethod ?? 'Pago en tienda física (tarjeta/efectivo) o Bizum.'}

PRODUCTOS SOLICITADOS:
${order.items.map((it) => `- ${it.quantity}x ${it.name} (${it.price.toFixed(2)} €/u) = ${(it.quantity * it.price).toFixed(2)} €`).join('\n')}

Subtotal: ${(order.subtotal ?? order.total - (order.shippingCost ?? 0)).toFixed(2)} €
Envío: ${order.shippingCost === 0 ? 'Gratis' : order.shippingCost?.toFixed(2) + ' €'}
TOTAL FINAL: ${order.total.toFixed(2)} € (IVA incluido)

Atención al cliente: 93 232 55 08 · sarda@calsarda.com
    `.trim();

    return {
      to: order.customer.email,
      from: fromAddress,
      subject,
      html,
      text,
      replyTo: this.config.storeEmail,
    };
  }

  /**
   * Genera el contenido HTML y texto plano para la notificación de alerta al obrador/tienda.
   */
  buildStoreEmail(order: Order): EmailMessage {
    const fromAddress = `${this.config.senderName} <${this.config.senderEmail}>`;
    const subject = `[NUEVO ENCARGO] ${order.reference} - ${order.customer.name} (${order.fulfillment === 'pickup' ? 'Recogida' : 'Envío'})`;

    const itemsRowsHtml = order.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${it.quantity} ×</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            ${it.name} ${it.productNumber ? `(Ref. ${it.productNumber})` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${it.price.toFixed(2)} €</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${(it.quantity * it.price).toFixed(2)} €</td>
        </tr>`,
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; color: #222;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 2px solid #251c15;">
    <tr>
      <td style="background-color: #251c15; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">🛎️ NUEVO ENCARGO WEB RECIBIDO</h2>
        <p style="margin: 6px 0 0; color: #c4a47c; font-weight: bold;">Referencia: ${order.reference}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <h3 style="margin-top: 0; color: #251c15; border-bottom: 1px solid #eee; padding-bottom: 6px;">Datos del Cliente</h3>
        <p style="margin: 4px 0;"><strong>Nombre:</strong> ${order.customer.name}</p>
        <p style="margin: 4px 0;"><strong>Teléfono:</strong> <a href="tel:${order.customer.phone}" style="font-size: 16px; font-weight: bold; color: #0066cc;">${order.customer.phone ?? 'No indicado'}</a></p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${order.customer.email}</p>
        ${
          order.fulfillment === 'delivery'
            ? `<p style="margin: 4px 0;"><strong>Dirección de entrega:</strong> ${order.customer.address}, ${order.customer.postalCode} ${order.customer.city} (${order.shippingZoneLabel})</p>`
            : '<p style="margin: 4px 0; color: #2e7d32;"><strong>Modalidad:</strong> Recogida en tienda (C/ Marina 237)</p>'
        }
        <p style="margin: 4px 0;"><strong>Plazo acordado:</strong> ${order.estimatedDate ?? 'Estándar'}</p>
        <p style="margin: 4px 0;"><strong>Instrucciones de pago:</strong> ${order.paymentMethod ?? 'En tienda / Bizum'}</p>

        <h3 style="margin: 24px 0 8px; color: #251c15; border-bottom: 1px solid #eee; padding-bottom: 6px;">Lista de preparación (Obrador)</h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #f8f8f8; color: #555;">
              <th align="left" style="padding: 6px 8px;">Cant.</th>
              <th align="left" style="padding: 6px 8px;">Producto</th>
              <th align="right" style="padding: 6px 8px;">Precio</th>
              <th align="right" style="padding: 6px 8px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <div style="text-align: right; font-size: 16px; font-weight: bold; border-top: 2px solid #222; padding-top: 10px;">
          TOTAL DEL ENCARGO: ${order.total.toFixed(2)} €
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `
NUEVO ENCARGO WEB RECIBIDO - Cal Sardà
=========================================
Referencia: ${order.reference}
Cliente: ${order.customer.name}
Teléfono: ${order.customer.phone ?? 'No indicado'}
Email: ${order.customer.email}
Modalidad: ${order.fulfillment === 'pickup' ? 'Recogida en tienda' : `Envío: ${order.customer.address}, ${order.customer.postalCode} ${order.customer.city}`}
Plazo: ${order.estimatedDate ?? 'Estándar'}
Pago: ${order.paymentMethod}

LISTA DE PRODUCTOS:
${order.items.map((it) => `- ${it.quantity}x ${it.name} (${it.price.toFixed(2)} €) = ${(it.quantity * it.price).toFixed(2)} €`).join('\n')}

TOTAL ENCARGO: ${order.total.toFixed(2)} €
    `.trim();

    return {
      to: this.config.storeEmail,
      from: fromAddress,
      subject,
      html,
      text,
      replyTo: order.customer.email,
    };
  }

  /**
   * Envía los correos transaccionales tanto al cliente como al obrador de la tienda.
   */
  async sendOrderConfirmationNotifications(
    order: Order,
  ): Promise<{ customerNotification: SendEmailResult; storeNotification: SendEmailResult }> {
    const customerEmail = this.buildCustomerEmail(order);
    const storeEmail = this.buildStoreEmail(order);

    const [customerRes, storeRes] = await Promise.all([
      this.adapter.sendEmail(customerEmail),
      this.adapter.sendEmail(storeEmail),
    ]);

    return {
      customerNotification: customerRes,
      storeNotification: storeRes,
    };
  }

  buildProformaCustomerEmail(order: Order): EmailMessage {
    const fromAddress = `${this.config.senderName} <${this.config.senderEmail}>`;
    const company = order.customer.companyName || order.customer.name;
    const subject = `[Cal Sardà] Presupuesto Proforma ${order.reference} - Lotes Corporativos`;
    const html = `
      <div style="font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8c2423;">Presupuesto Proforma B2B: ${order.reference}</h2>
        <p>Estimado/a ${order.customer.name} (${company}),</p>
        <p>Hemos generado el presupuesto proforma solicitado para tu empresa.</p>
        <p><strong>Importe Total Proforma:</strong> ${order.total.toFixed(2)} €</p>
        <div style="background: #faf6f0; border-left: 4px solid #8c2423; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 8px 0; color: #8c2423;">Instrucciones de Pago por Transferencia:</h4>
          <p style="margin: 2px 0;"><strong>Banco:</strong> CaixaBank</p>
          <p style="margin: 2px 0;"><strong>Beneficiario:</strong> Cal Sardà Obrador Gastronòmic S.L.</p>
          <p style="margin: 2px 0;"><strong>IBAN:</strong> <span style="font-family: monospace; font-size: 14px; font-weight: bold;">ES66 2100 0418 4502 0005 1930</span></p>
          <p style="margin: 2px 0;"><strong>Concepto obligatorio:</strong> ${order.reference} - ${company}</p>
        </div>
        <p style="font-size: 12px; color: #666;">Una vez confirmada la transferencia bancaria en firme, el obrador iniciará el empaquetado y logística de entrega.</p>
      </div>
    `.trim();

    const text = `Presupuesto Proforma B2B: ${order.reference}\nEmpresa: ${company}\nTotal: ${order.total.toFixed(2)} €\nIBAN: ES66 2100 0418 4502 0005 1930\nConcepto: ${order.reference} - ${company}`;

    return {
      to: order.customer.email,
      from: fromAddress,
      subject,
      html,
      text,
    };
  }

  buildProformaStoreEmail(order: Order): EmailMessage {
    const fromAddress = `${this.config.senderName} <${this.config.senderEmail}>`;
    const company = order.customer.companyName || order.customer.name;
    const subject = `[PROFORMA B2B - NO PREPARAR] Solicitud de Presupuesto ${order.reference} - ${company}`;
    const html = `
      <div style="font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto;">
        <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 14px; border-radius: 6px; margin-bottom: 16px;">
          <h3 style="color: #92400e; margin: 0 0 6px 0;">⚠️ SOLICITUD DE PRESUPUESTO PROFORMA (NO PREPARAR TODAVÍA)</h3>
          <p style="margin: 0; color: #78350f; font-size: 13px;">
            Este encargo es un presupuesto comercial B2B. No se debe preparar físicamente en obrador hasta comprobar la recepción del pago por transferencia bancaria.
          </p>
        </div>
        <p><strong>Referencia:</strong> ${order.reference}</p>
        <p><strong>Empresa / Contacto:</strong> ${company} (${order.customer.email})</p>
        <p><strong>NIF / CIF:</strong> ${order.customer.taxId || 'No indicado'}</p>
        <p><strong>Importe previsto:</strong> ${order.total.toFixed(2)} €</p>
      </div>
    `.trim();

    const text = `⚠️ SOLICITUD DE PRESUPUESTO PROFORMA (${order.reference}) - NO PREPARAR TODAVÍA FÍSICAMENTE.\nEmpresa: ${company}\nImporte: ${order.total.toFixed(2)} €`;

    return {
      to: this.config.storeEmail,
      from: fromAddress,
      subject,
      html,
      text,
      replyTo: order.customer.email,
    };
  }

  async sendProformaQuoteNotifications(
    order: Order,
  ): Promise<{ customerNotification: SendEmailResult; storeNotification: SendEmailResult }> {
    const customerEmail = this.buildProformaCustomerEmail(order);
    const storeEmail = this.buildProformaStoreEmail(order);

    const [customerRes, storeRes] = await Promise.all([
      this.adapter.sendEmail(customerEmail),
      this.adapter.sendEmail(storeEmail),
    ]);

    return {
      customerNotification: customerRes,
      storeNotification: storeRes,
    };
  }

  /**
   * Obtiene los textos y etiquetas bilingües según el estado del pedido y modalidad.
   */
  getStatusAlertCopy(
    status: OrderStatus,
    fulfillment: string = 'pickup',
    lang: 'ca' | 'es' = 'es',
  ): StatusAlertCopy {
    const isPickup = fulfillment === 'pickup';

    if (lang === 'ca') {
      switch (status) {
        case 'en_preparacion':
          return {
            subject: "La teva comanda s'està preparant a l'obrador",
            badge: 'EN PREPARACIÓ',
            headline: 'Obrador fil a l’agulla',
            message:
              'Els nostres mestres artesans estan seleccionant i preparant els teus productes amb la màxima cura.',
            instructions: isPickup
              ? 'Molt aviat rebràs l’avís definitiu per passar-la a recollir pel Carrer de Marina, 237.'
              : 'Un cop enllestida, sortirà amb el nostre servei de transport refrigerat urgent.',
          };
        case 'listo_recogida':
          return {
            subject: 'La teva comanda està a punt per recollir a la botiga!',
            badge: 'A PUNT PER RECOLLIR',
            headline: 'Ja pots venir a recollir la teva comanda',
            message:
              'La teva comanda ja està empaquetada i reservada al teu nom al nostre establiment.',
            instructions:
              'Punt de recollida: Cal Sardà · Carrer de Marina, 237, 08013 Barcelona. Horari: De dilluns a dissabte de 9:00 a 14:00 i de 17:00 a 20:30.',
          };
        case 'enviado':
          return {
            subject: 'La teva comanda ha sortit en repartiment',
            badge: 'EN REPARTIMENT',
            headline: 'La teva comanda està en camí',
            message:
              'El teu paquet viatja en vehicle refrigerat per garantir la màxima frescor i conservació dels productes.',
            instructions:
              'Lliurament estimat en les properes 24 hores feineres a l’adreça indicada al formulari.',
          };
        case 'entregado':
          return {
            subject: 'La teva comanda ha estat lliurada',
            badge: 'LLIURADA',
            headline: 'Comanda lliurada amb èxit!',
            message:
              'Esperem que gaudeixis dels sabors artesans i de tradició de Cal Sardà. Moltes gràcies per la teva confiança!',
            instructions:
              'Si tens qualsevol consulta o suggeriment sobre els productes rebuts, estem a la teva disposició.',
          };
        case 'cancelado':
          return {
            subject: 'Actualització sobre la teva comanda',
            badge: 'CANCEL·LADA',
            headline: 'La teva comanda ha estat cancel·lada',
            message:
              'Et confirmem que la comanda ha estat cancel·lada segons s’ha sol·licitat o acordat.',
            instructions:
              'Si creus que és un error o vols formalitzar una nova comanda, truca’ns al 93 232 55 08.',
          };
        case 'proforma':
        case 'presupuesto':
          return {
            subject: 'Pressupost Proforma emès - Cal Sardà',
            badge: 'PROFORMA B2B',
            headline: 'Pressupost Proforma generat',
            message: 'Hem generat el teu pressupost proforma oficial per a la teva empresa.',
            instructions:
              'Pots tramitar la transferència bancària amb el número de proforma com a concepte per iniciar la preparació.',
          };
        case 'recibido':
        case 'confirmed':
        default:
          return {
            subject: 'Comanda rebuda i confirmada',
            badge: 'REBUDA',
            headline: 'Hem rebut la teva comanda',
            message:
              'La teva comanda ha quedat registrada correctament i està pendent de ser processada pel nostre obrador.',
            instructions: isPickup
              ? 'T’avisarem quan comencem a preparar-la i tan bon punt estigui a punt per recollir.'
              : 'T’avisarem quan comenci la preparació i quan surti en repartiment refrigerat.',
          };
      }
    }

    // Castellano por defecto
    switch (status) {
      case 'en_preparacion':
        return {
          subject: 'Tu encargo está en preparación en el obrador',
          badge: 'EN PREPARACIÓN',
          headline: 'Obrador manos a la obra',
          message:
            'Nuestros maestros artesanos están seleccionando y preparando tus productos con el máximo cuidado.',
          instructions: isPickup
            ? 'En breve recibirás el aviso definitivo cuando puedas pasar a recogerlo por Carrer de Marina, 237.'
            : 'Una vez preparado, saldrá con nuestro servicio de transporte refrigerado urgente.',
        };
      case 'listo_recogida':
        return {
          subject: '¡Tu encargo está listo para recoger en tienda!',
          badge: 'LISTO PARA RECOGER',
          headline: 'Ya puedes venir a buscar tu encargo',
          message:
            'Tu encargo ya está empaquetado y reservado a tu nombre en nuestro establecimiento.',
          instructions:
            'Punto de recogida: Cal Sardà · Carrer de Marina, 237, 08013 Barcelona. Horario: Lunes a sábado de 9:00 a 14:00 y de 17:00 a 20:30.',
        };
      case 'enviado':
        return {
          subject: 'Tu encargo ha salido en reparto',
          badge: 'EN REPARTO',
          headline: 'Tu pedido está en camino',
          message:
            'Tu paquete viaja en vehículo refrigerado para mantener la máxima frescura y calidad de los productos artesanos.',
          instructions:
            'Entrega estimada en las próximas 24 horas laborables en la dirección indicada.',
        };
      case 'entregado':
        return {
          subject: 'Tu encargo ha sido entregado',
          badge: 'ENTREGADO',
          headline: '¡Encargo entregado con éxito!',
          message:
            'Esperamos que disfrutes de los sabores artesanos de Cal Sardà. ¡Muchas gracias por tu confianza!',
          instructions:
            'Si tienes cualquier consulta o sugerencia sobre los productos recibidos, estamos a tu entera disposición.',
        };
      case 'cancelado':
        return {
          subject: 'Actualización sobre tu encargo',
          badge: 'CANCELADO',
          headline: 'Tu encargo ha sido cancelado',
          message:
            'Te confirmamos que el encargo ha sido cancelado según lo solicitado o convenido.',
          instructions:
            'Si crees que se trata de un error o deseas realizar un nuevo encargo, por favor llámanos al 93 232 55 08.',
        };
      case 'proforma':
      case 'presupuesto':
        return {
          subject: 'Presupuesto Proforma emitido - Cal Sardà',
          badge: 'PROFORMA B2B',
          headline: 'Presupuesto Proforma generado',
          message: 'Hemos generado el presupuesto proforma oficial solicitado para tu empresa.',
          instructions:
            'Puedes tramitar la transferencia bancaria indicando la referencia de la proforma como concepto para confirmar el encargo.',
        };
      case 'recibido':
      case 'confirmed':
      default:
        return {
          subject: 'Encargo recibido y confirmado',
          badge: 'RECIBIDO',
          headline: 'Hemos recibido tu encargo',
          message:
            'Tu encargo ha quedado registrado correctamente y está a la espera de ser procesado por nuestro obrador.',
          instructions: isPickup
            ? 'Te avisaremos cuando empecemos a prepararlo y en cuanto esté listo para recoger.'
            : 'Te avisaremos cuando empiece la preparación y cuando salga en reparto refrigerado.',
        };
    }
  }

  /**
   * Genera el email transaccional para comunicar al cliente una actualización de estado de su pedido.
   */
  buildStatusChangeEmail(
    order: Order,
    newStatus: OrderStatus,
    lang: 'ca' | 'es' = 'es',
  ): EmailMessage {
    const copy = this.getStatusAlertCopy(newStatus, order.fulfillment, lang);
    const fromAddress = `${this.config.senderName} <${this.config.senderEmail}>`;
    const subject = `[Cal Sardà] ${copy.subject} - Ref: ${order.reference}`;

    const itemsSummaryHtml = order.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #f0eae1; color: #251c15;">
            ${it.quantity}x ${it.name}
          </td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f0eae1; text-align: right; font-weight: bold; color: #251c15;">
            ${(it.quantity * it.price).toFixed(2)} €
          </td>
        </tr>`,
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; background-color: #f6f1ea; margin: 0; padding: 24px; color: #251c15;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5ded3;">
    <!-- Cabecera corporativa -->
    <tr>
      <td style="background-color: #251c15; padding: 28px 32px; text-align: center; color: #f6f1ea;">
        <span style="font-size: 10px; letter-spacing: 3px; color: #c4a47c; font-weight: bold; font-family: sans-serif;">CAL SARDÀ · DESDE 1930</span>
        <h1 style="margin: 10px 0 0; font-size: 24px; font-weight: normal;">${copy.headline}</h1>
      </td>
    </tr>
    <!-- Contenido y estado -->
    <tr>
      <td style="padding: 28px 32px;">
        <p style="font-size: 16px; margin-top: 0;">
          Hola, <strong>${order.customer.name}</strong>:
        </p>

        <!-- Insignia de estado -->
        <div style="text-align: center; margin: 20px 0;">
          <span style="display: inline-block; background-color: #795548; color: #ffffff; padding: 6px 16px; font-family: sans-serif; font-size: 12px; font-weight: bold; letter-spacing: 1.5px; border-radius: 4px;">
            ${copy.badge}
          </span>
        </div>

        <p style="font-size: 15px; line-height: 1.6; color: #433830;">
          ${copy.message}
        </p>

        <!-- Bloque de instrucciones y ubicación -->
        <div style="background-color: #f7f3ed; border-left: 4px solid #aa845c; padding: 14px 18px; margin: 20px 0; font-family: sans-serif; font-size: 13px; line-height: 1.6; color: #251c15;">
          ${copy.instructions}
        </div>

        <!-- Referencia destacada -->
        <div style="background-color: #251c15; color: #ffffff; padding: 14px 20px; text-align: center; margin: 22px 0;">
          <span style="font-size: 10px; letter-spacing: 2px; color: #c4a47c; font-family: sans-serif; display: block; margin-bottom: 2px;">CÓDIGO DE REFERENCIA</span>
          <strong style="font-size: 24px; letter-spacing: 2px;">${order.reference}</strong>
        </div>

        <!-- Resumen de productos -->
        <h3 style="font-size: 16px; margin: 24px 0 10px; border-bottom: 2px solid #251c15; padding-bottom: 6px;">Resumen del encargo</h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: sans-serif; font-size: 13px; margin-bottom: 16px;">
          <tbody>
            ${itemsSummaryHtml}
          </tbody>
        </table>

        <div style="text-align: right; font-family: sans-serif; font-size: 15px; font-weight: bold; color: #251c15; margin-bottom: 24px;">
          Total: ${order.total.toFixed(2)} €
        </div>

        <div style="border-top: 1px solid #e5ded3; padding-top: 16px; font-size: 12px; color: #6e5f52; font-family: sans-serif; line-height: 1.5;">
          ¿Dudas con tu encargo? Llámanos al obrador: <a href="tel:+34932325508" style="color: #251c15; font-weight: bold; text-decoration: none;">93 232 55 08</a> o escribe a <a href="mailto:${this.config.storeEmail}" style="color: #251c15;">${this.config.storeEmail}</a>.
        </div>
      </td>
    </tr>
    <!-- Pie -->
    <tr>
      <td style="background-color: #f7f3ed; padding: 16px 32px; text-align: center; font-size: 11px; color: #7a6b5e; font-family: sans-serif; border-top: 1px solid #e5ded3;">
        Cal Sardà · Carrer de Marina, 237 · 08013 Barcelona
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const text = `
CAL SARDÀ · DESDE 1930
=========================================
${copy.headline.toUpperCase()}
Estado: ${copy.badge}
Referencia: ${order.reference}

Hola, ${order.customer.name}:
${copy.message}

${copy.instructions}

PRODUCTOS:
${order.items.map((it) => `- ${it.quantity}x ${it.name} (${(it.quantity * it.price).toFixed(2)} €)`).join('\n')}

TOTAL: ${order.total.toFixed(2)} €

Atención: 93 232 55 08 · ${this.config.storeEmail}
    `.trim();

    return {
      to: order.customer.email,
      from: fromAddress,
      subject,
      html,
      text,
      replyTo: this.config.storeEmail,
    };
  }

  /**
   * Envía la alerta por cambio de estado al cliente y emite el webhook/SMS simulado.
   */
  async sendOrderStatusChangeNotification(
    order: Order,
    previousStatus?: OrderStatus,
    lang: 'ca' | 'es' = 'es',
  ): Promise<{
    emailSent: boolean;
    webhookDispatched: boolean;
    payload: OrderStatusWebhookPayload;
  }> {
    const alertCopy = this.getStatusAlertCopy(order.status, order.fulfillment, lang);
    const emailMessage = this.buildStatusChangeEmail(order, order.status, lang);

    const emailResult = await this.adapter.sendEmail(emailMessage);

    const payload: OrderStatusWebhookPayload = {
      event: 'order.status_changed',
      orderReference: order.reference ?? order.id ?? 'UNKNOWN',
      customer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
      },
      previousStatus,
      newStatus: order.status,
      fulfillment: order.fulfillment,
      total: order.total,
      timestamp: new Date().toISOString(),
      alertMessage: alertCopy.message,
    };

    const webhookDispatched = await this.webhookAdapter.dispatchWebhook(payload);
    this.lastDispatchedAlert.set(payload);

    return {
      emailSent: emailResult.success,
      webhookDispatched,
      payload,
    };
  }

  /**
   * Genera el email recordatorio de cesta abandonada.
   */
  buildAbandonedCartEmail(payload: AbandonedCartEmailPayload): EmailMessage {
    const lang = payload.lang ?? 'es';
    const fromAddress = `${this.config.senderName} <${this.config.senderEmail}>`;
    const recoveryUrl = payload.recoveryUrl ?? 'https://calsarda.com/tienda-online';

    const isCa = lang === 'ca';
    const subject = isCa
      ? "Cal Sardà · La teva selecció gourmet t'està esperant"
      : 'Cal Sardà · Tu selección gourmet te está esperando';
    const headline = isCa ? 'La teva cistella a Cal Sardà' : 'Tu selección en Cal Sardà';
    const greeting = `Hola, ${payload.customerName}:`;
    const intro = isCa
      ? "Hem guardat la teva selecció de productes de l'obrador perquè puguis reprendre la teva compra quan vulguis. Els productes artesans tenen producció limitada i volem assegurar-nos que no et quedis sense!"
      : 'Hemos guardado tu selección de productos del obrador para que puedas retomar tu compra cuando quieras. Los productos artesanos tienen producción limitada y queremos asegurarnos de que no te quedes sin ellos.';
    const btnText = isCa ? 'Reprendre la meva comanda →' : 'Retomar mi pedido →';
    const subtotalText = isCa ? 'Total de la selecció:' : 'Total de la selección:';

    const itemsRowsHtml = payload.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f0eae1; color: #251c15;">
            <strong>${it.name}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f0eae1; text-align: center; color: #6e5f52;">
            ${it.quantity} ud.
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f0eae1; text-align: right; font-weight: bold; color: #8c2423;">
            ${(it.quantity * it.price).toFixed(2)} €
          </td>
        </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; background-color: #f6f1ea; margin: 0; padding: 24px; color: #251c15;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5ded3;">
    <tr>
      <td style="background-color: #251c15; padding: 28px 32px; text-align: center; color: #f6f1ea;">
        <span style="font-size: 10px; letter-spacing: 3px; color: #c4a47c; font-weight: bold; font-family: sans-serif;">CAL SARDÀ · OBRADOR DESDE 1930</span>
        <h1 style="margin: 10px 0 0; font-size: 24px; font-weight: normal;">${headline}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <p style="font-size: 16px; margin-top: 0;">${greeting}</p>
        <p style="font-size: 15px; line-height: 1.6; color: #433830;">${intro}</p>

        <h3 style="font-size: 16px; margin: 24px 0 10px; border-bottom: 2px solid #251c15; padding-bottom: 6px;">
          ${isCa ? 'Productes a la teva cistella' : 'Productos en tu cesta'}
        </h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: sans-serif; font-size: 13px; margin-bottom: 16px;">
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <div style="text-align: right; font-family: sans-serif; font-size: 16px; font-weight: bold; color: #251c15; margin-bottom: 28px;">
          ${subtotalText} <span style="color: #8c2423;">${payload.total.toFixed(2)} €</span>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${recoveryUrl}" style="background-color: #8c2423; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-family: sans-serif; border-radius: 6px; display: inline-block;">
            ${btnText}
          </a>
        </div>

        <div style="border-top: 1px solid #e5ded3; padding-top: 16px; font-size: 12px; color: #6e5f52; font-family: sans-serif; line-height: 1.5;">
          ${
            isCa
              ? 'Si tens qualsevol dubte o vols fer la comanda per telèfon, pots trucar-nos al 93 232 55 08.'
              : 'Si tienes cualquier duda o prefieres hacer el pedido por teléfono, llámanos al 93 232 55 08.'
          }
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f7f3ed; padding: 16px 32px; text-align: center; font-size: 11px; color: #7a6b5e; font-family: sans-serif; border-top: 1px solid #e5ded3;">
        Cal Sardà · Carrer de Marina, 237 · 08013 Barcelona · sarda@calsarda.com<br>
        ${
          isCa
            ? 'Rebeu aquest correu perquè heu iniciat una selecció de compra a la botiga en línia de Cal Sardà.'
            : 'Recibes este aviso porque iniciaste una selección de compra en la tienda online de Cal Sardà.'
        }
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `
CAL SARDÀ · DESDE 1930
=========================================
${headline.toUpperCase()}

${greeting}
${intro}

PRODUCTOS EN TU CESTA:
${payload.items.map((it) => `- ${it.quantity}x ${it.name} (${(it.quantity * it.price).toFixed(2)} €)`).join('\n')}

TOTAL: ${payload.total.toFixed(2)} €

Para retomar tu compra, accede a: ${recoveryUrl}

Atención: 93 232 55 08 · sarda@calsarda.com
    `.trim();

    return {
      to: payload.customerEmail,
      from: fromAddress,
      subject,
      html,
      text,
      replyTo: this.config.storeEmail,
    };
  }

  async sendAbandonedCartNotification(
    payload: AbandonedCartEmailPayload,
  ): Promise<SendEmailResult> {
    const email = this.buildAbandonedCartEmail(payload);
    return this.adapter.sendEmail(email);
  }

  getSentEmails(): EmailMessage[] {
    return this.adapter.getSentEmails ? this.adapter.getSentEmails() : [];
  }

  clearSentEmails(): void {
    if (this.adapter.clearSentEmails) {
      this.adapter.clearSentEmails();
    }
  }

  getDispatchedWebhooks(): OrderStatusWebhookPayload[] {
    return this.webhookAdapter.getDispatchedWebhooks
      ? this.webhookAdapter.getDispatchedWebhooks()
      : [];
  }

  clearDispatchedWebhooks(): void {
    if (this.webhookAdapter.clearDispatchedWebhooks) {
      this.webhookAdapter.clearDispatchedWebhooks();
    }
    this.lastDispatchedAlert.set(null);
  }
}
