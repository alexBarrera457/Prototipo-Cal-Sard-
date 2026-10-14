import { describe, expect, it } from 'vitest';
import {
  createSupabaseClient,
  provideSupabase,
  SUPABASE_CLIENT,
  SUPABASE_CONFIG,
} from './supabase';
import { TestBed } from '@angular/core/testing';

describe('Supabase Service and Providers', () => {
  it('returns null when config is empty or missing required keys', () => {
    expect(createSupabaseClient(null)).toBeNull();
    expect(createSupabaseClient(undefined)).toBeNull();
    expect(createSupabaseClient({ url: '', anonKey: '' })).toBeNull();
    expect(createSupabaseClient({ url: 'https://test.supabase.co', anonKey: '' })).toBeNull();
  });

  it('instantiates SupabaseClient when valid url and anonKey are provided', () => {
    const client = createSupabaseClient({
      url: 'https://example.supabase.co',
      anonKey: 'sample-anon-key-12345',
    });

    expect(client).toBeTruthy();
    expect(typeof client?.from).toBe('function');
  });

  it('provides SUPABASE_CONFIG and SUPABASE_CLIENT in Angular TestBed', () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideSupabase({
          url: 'https://cal-sarda-test.supabase.co',
          anonKey: 'test-anon-key',
        }),
      ],
    });

    const config = TestBed.inject(SUPABASE_CONFIG);
    expect(config?.url).toBe('https://cal-sarda-test.supabase.co');

    const client = TestBed.inject(SUPABASE_CLIENT);
    expect(client).toBeTruthy();
    expect(typeof client?.from).toBe('function');
  });

  it('provides null client when config is omitted in provider', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [...provideSupabase(null)],
    });

    const client = TestBed.inject(SUPABASE_CLIENT);
    expect(client).toBeNull();
  });
});
