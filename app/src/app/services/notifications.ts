import { Inject, inject, Injectable, InjectionToken, Optional } from '@angular/core';
import type { Order } from '@cal-sarda/domain';

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
  private readonly config: NotificationConfig;

  constructor(
    @Optional()
    @Inject(EMAIL_SENDER_ADAPTER)
    private readonly customAdapter?: EmailSenderAdapter,
    @Optional()
    @Inject(NOTIFICATION_CONFIG)
    private readonly customConfig?: NotificationConfig,
  ) {
    this.config = this.customConfig ?? DEFAULT_NOTIFICATION_CONFIG;
    this.adapter = this.customAdapter ?? new InMemoryEmailAdapter();
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
          <p style="margin: 6px 0 0; color: #251c15; font-size: 13px;"><strong>Disponibilidad estimada:</strong> ${order.estimatedDate ?? 'A partir de mañana a las 10:00 h'}</p>
        </div>`
        : `
        <div style="background-color: #f7f3ed; border-left: 4px solid #aa845c; padding: 14px 18px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px; color: #251c15; font-size: 15px;">🚚 Envío refrigerado a domicilio</h4>
          <p style="margin: 0 0 4px; color: #4a3e35; font-size: 14px;"><strong>Destinatario:</strong> ${order.customer.name}</p>
          <p style="margin: 0 0 4px; color: #4a3e35; font-size: 14px;">${order.customer.address}, ${order.customer.postalCode} ${order.customer.city}</p>
          <p style="margin: 0 0 4px; color: #6e5f52; font-size: 13px;">Zona: ${order.shippingZoneLabel ?? 'Península'}</p>
          <p style="margin: 6px 0 0; color: #251c15; font-size: 13px;"><strong>Plazo estimado:</strong> ${order.estimatedDate ?? '24-48 horas laborables'}</p>
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
FECHA ESTIMADA: ${order.estimatedDate ?? 'A partir de mañana a las 10:00 h'}
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

  getSentEmails(): EmailMessage[] {
    return this.adapter.getSentEmails ? this.adapter.getSentEmails() : [];
  }

  clearSentEmails(): void {
    if (this.adapter.clearSentEmails) {
      this.adapter.clearSentEmails();
    }
  }
}
