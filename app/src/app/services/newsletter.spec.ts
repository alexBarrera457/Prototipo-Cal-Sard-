import { TestBed } from '@angular/core/testing';
import {
  InMemoryNewsletterAdapter,
  NEWSLETTER_ADAPTER,
  NewsletterAdapter,
  NewsletterService,
  SupabaseNewsletterAdapter,
} from './newsletter';
import { SUPABASE_CLIENT } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('NewsletterService', () => {
  let service: NewsletterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NewsletterService],
    });
    service = TestBed.inject(NewsletterService);
  });

  it('initializes in idle status without messages', () => {
    expect(service.status()).toBe('idle');
    expect(service.message()).toBeNull();
    expect(service.errorMessage()).toBeNull();
  });

  it('rejects empty email and notifies user', async () => {
    const success = await service.subscribe('', true);

    expect(success).toBe(false);
    expect(service.status()).toBe('error');
    expect(service.errorMessage()).toContain('introduce una dirección');
  });

  it('rejects invalid email formats', async () => {
    const success = await service.subscribe('invalid-email-string', true);

    expect(success).toBe(false);
    expect(service.status()).toBe('error');
    expect(service.errorMessage()).toContain('válida');
  });

  it('requires acceptance of privacy policy under RGPD rules', async () => {
    const success = await service.subscribe('valid@example.com', false);

    expect(success).toBe(false);
    expect(service.status()).toBe('error');
    expect(service.errorMessage()).toContain('política de privacidad');
  });

  it('subscribes successfully with valid email and accepted privacy', async () => {
    const success = await service.subscribe('cliente@calsarda.cat', true);

    expect(success).toBe(true);
    expect(service.status()).toBe('success');
    expect(service.message()).toContain('¡Gracias por suscribirte');
    expect(service.lastSubscribedEmail()).toBe('cliente@calsarda.cat');
  });

  it('resets status and messages back to idle', async () => {
    await service.subscribe('test@calsarda.cat', true);
    expect(service.status()).toBe('success');

    service.reset();
    expect(service.status()).toBe('idle');
    expect(service.message()).toBeNull();
    expect(service.errorMessage()).toBeNull();
  });
});

describe('InMemoryNewsletterAdapter', () => {
  it('stores subscribers and flags duplicates', async () => {
    const adapter = new InMemoryNewsletterAdapter();

    const res1 = await adapter.subscribe('gourmet@test.cat');
    expect(res1.success).toBe(true);
    expect(res1.alreadySubscribed).toBeUndefined();

    const subscribers = await adapter.getSubscribers();
    expect(subscribers).toEqual(['gourmet@test.cat']);

    const res2 = await adapter.subscribe('gourmet@test.cat');
    expect(res2.success).toBe(true);
    expect(res2.alreadySubscribed).toBe(true);
    expect(res2.message).toContain('ya se encontraba registrada');
  });
});

describe('SupabaseNewsletterAdapter', () => {
  it('persists subscriber into newsletter_subscribers table', async () => {
    let capturedTable = '';
    let capturedPayload: any = null;

    const mockSupabase = {
      from: (table: string) => {
        capturedTable = table;
        return {
          insert: async (payload: any) => {
            capturedPayload = payload;
            return { error: null };
          },
        };
      },
    } as unknown as SupabaseClient;

    const adapter = new SupabaseNewsletterAdapter(mockSupabase);
    const result = await adapter.subscribe('client@test.cat');

    expect(result.success).toBe(true);
    expect(capturedTable).toBe('newsletter_subscribers');
    expect(capturedPayload.email).toBe('client@test.cat');
    expect(capturedPayload.confirmed).toBe(false);
  });

  it('handles unique violation error (code 23505) as already subscribed', async () => {
    const duplicateErrorClient = {
      from: () => ({
        insert: async () => ({
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        }),
      }),
    } as unknown as SupabaseClient;

    const adapter = new SupabaseNewsletterAdapter(duplicateErrorClient);
    const result = await adapter.subscribe('duplicated@test.cat');

    expect(result.success).toBe(true);
    expect(result.alreadySubscribed).toBe(true);
    expect(result.message).toContain('ya se encontraba registrada');
  });

  it('falls back to local memory adapter when Supabase client is null', async () => {
    const fallback = new InMemoryNewsletterAdapter();
    const adapter = new SupabaseNewsletterAdapter(null, fallback);

    const result = await adapter.subscribe('offline@test.cat');
    expect(result.success).toBe(true);

    const subs = await fallback.getSubscribers();
    expect(subs).toContain('offline@test.cat');
  });
});

describe('NewsletterService DI Seams', () => {
  it('accepts custom adapter via NEWSLETTER_ADAPTER token', async () => {
    const customList: string[] = [];
    const customAdapter: NewsletterAdapter = {
      subscribe: async (email) => {
        customList.push(email);
        return { success: true, message: 'Custom adapter success' };
      },
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [NewsletterService, { provide: NEWSLETTER_ADAPTER, useValue: customAdapter }],
    });

    const customService = TestBed.inject(NewsletterService);
    await customService.subscribe('custom@test.cat', true);

    expect(customList).toEqual(['custom@test.cat']);
    expect(customService.message()).toBe('Custom adapter success');
  });

  it('uses SupabaseNewsletterAdapter when SUPABASE_CLIENT is provided', async () => {
    let called = false;
    const mockSupabase = {
      from: () => ({
        insert: async () => {
          called = true;
          return { error: null };
        },
      }),
    } as unknown as SupabaseClient;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [NewsletterService, { provide: SUPABASE_CLIENT, useValue: mockSupabase }],
    });

    const service = TestBed.inject(NewsletterService);
    await service.subscribe('supabase@test.cat', true);

    expect(called).toBe(true);
    expect(service.status()).toBe('success');
  });
});
