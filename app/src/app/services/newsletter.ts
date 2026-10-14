import { Inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase';

export interface NewsletterSubscriptionResult {
  success: boolean;
  message?: string;
  alreadySubscribed?: boolean;
}

/**
 * Seam interface para el servicio de registro al boletín.
 */
export interface NewsletterAdapter {
  subscribe(email: string): Promise<NewsletterSubscriptionResult>;
  getSubscribers?(): Promise<string[]>;
}

export const NEWSLETTER_ADAPTER = new InjectionToken<NewsletterAdapter>('NEWSLETTER_ADAPTER');

/**
 * Adaptador en memoria para pruebas locales, desarrollo y modo offline.
 */
@Injectable()
export class InMemoryNewsletterAdapter implements NewsletterAdapter {
  private readonly subscribers = new Set<string>();

  async subscribe(email: string): Promise<NewsletterSubscriptionResult> {
    const normalized = email.trim().toLowerCase();
    if (this.subscribers.has(normalized)) {
      return {
        success: true,
        alreadySubscribed: true,
        message: 'Esta dirección ya se encontraba registrada en nuestro boletín.',
      };
    }

    this.subscribers.add(normalized);
    return {
      success: true,
      message: '¡Gracias por suscribirte al boletín de Cal Sardà!',
    };
  }

  async getSubscribers(): Promise<string[]> {
    return Array.from(this.subscribers);
  }
}

/**
 * Adaptador de producción conectado a la tabla newsletter_subscribers de Supabase.
 */
@Injectable()
export class SupabaseNewsletterAdapter implements NewsletterAdapter {
  private readonly fallbackAdapter: NewsletterAdapter;

  constructor(
    @Optional()
    @Inject(SUPABASE_CLIENT)
    private readonly supabase?: SupabaseClient | null,
    @Optional()
    @Inject('FALLBACK_NEWSLETTER_ADAPTER')
    fallbackAdapter?: NewsletterAdapter,
  ) {
    this.fallbackAdapter = fallbackAdapter ?? new InMemoryNewsletterAdapter();
  }

  async subscribe(email: string): Promise<NewsletterSubscriptionResult> {
    const normalized = email.trim().toLowerCase();

    if (!this.supabase) {
      return this.fallbackAdapter.subscribe(normalized);
    }

    try {
      const { error } = await this.supabase.from('newsletter_subscribers').insert({
        email: normalized,
        confirmed: false,
      });

      if (error) {
        // Código de violación de clave única en PostgreSQL (23505)
        if (
          error.code === '23505' ||
          error.message?.includes('duplicate key') ||
          error.message?.includes('unique')
        ) {
          return {
            success: true,
            alreadySubscribed: true,
            message: 'Esta dirección ya se encontraba registrada en nuestro boletín.',
          };
        }

        // Si ocurre otro fallo en Supabase, registrar en el fallback para no perder el contacto
        await this.fallbackAdapter.subscribe(normalized);
        return {
          success: true,
          message: '¡Gracias por suscribirte al boletín de Cal Sardà!',
        };
      }

      return {
        success: true,
        message: '¡Gracias por suscribirte al boletín de Cal Sardà!',
      };
    } catch {
      return this.fallbackAdapter.subscribe(normalized);
    }
  }

  async getSubscribers(): Promise<string[]> {
    if (!this.supabase) {
      return this.fallbackAdapter.getSubscribers?.() ?? [];
    }

    try {
      const { data } = await this.supabase
        .from('newsletter_subscribers')
        .select('email')
        .order('created_at', { ascending: false });

      return (data || []).map((row: { email: string }) => row.email);
    } catch {
      return this.fallbackAdapter.getSubscribers?.() ?? [];
    }
  }
}

export type NewsletterStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Servicio reactivo para la gestión de suscripciones al boletín gastronómico de Cal Sardà.
 */
@Injectable({
  providedIn: 'root',
})
export class NewsletterService {
  readonly status = signal<NewsletterStatus>('idle');
  readonly message = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly lastSubscribedEmail = signal<string | null>(null);

  private readonly adapter: NewsletterAdapter;

  constructor(
    @Optional()
    @Inject(NEWSLETTER_ADAPTER)
    adapter?: NewsletterAdapter,
    @Optional()
    @Inject(SUPABASE_CLIENT)
    supabase?: SupabaseClient | null,
  ) {
    if (adapter) {
      this.adapter = adapter;
    } else if (supabase) {
      this.adapter = new SupabaseNewsletterAdapter(supabase);
    } else {
      this.adapter = new InMemoryNewsletterAdapter();
    }
  }

  /**
   * Valida y registra una dirección de correo con consentimiento explícito de RGPD.
   */
  async subscribe(email: string, privacyAccepted: boolean): Promise<boolean> {
    this.errorMessage.set(null);
    this.message.set(null);

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      this.status.set('error');
      this.errorMessage.set('Por favor, introduce una dirección de correo electrónico.');
      return false;
    }

    // Validación de formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      this.status.set('error');
      this.errorMessage.set('Por favor, introduce una dirección de correo electrónico válida.');
      return false;
    }

    if (!privacyAccepted) {
      this.status.set('error');
      this.errorMessage.set('Debes aceptar la política de privacidad para suscribirte.');
      return false;
    }

    this.status.set('loading');

    try {
      const result = await this.adapter.subscribe(cleanEmail);

      if (result.success) {
        this.status.set('success');
        this.message.set(
          result.message || '¡Gracias por suscribirte al boletín gastronómico de Cal Sardà!',
        );
        this.lastSubscribedEmail.set(cleanEmail);
        return true;
      }

      this.status.set('error');
      this.errorMessage.set(
        result.message || 'No se ha podido completar la suscripción. Inténtalo de nuevo.',
      );
      return false;
    } catch {
      this.status.set('error');
      this.errorMessage.set('Ha ocurrido un error inesperado al procesar la solicitud.');
      return false;
    }
  }

  /**
   * Restablece el formulario a su estado inicial.
   */
  reset(): void {
    this.status.set('idle');
    this.message.set(null);
    this.errorMessage.set(null);
  }
}
