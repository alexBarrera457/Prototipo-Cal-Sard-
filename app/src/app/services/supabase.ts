import { inject, InjectionToken, type Provider } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type { SupabaseClient };

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function getEnvVar(key: string): string {
  try {
    const proc = (
      globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process;
    return proc?.env?.[key] ?? '';
  } catch {
    return '';
  }
}

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig | null>('SUPABASE_CONFIG', {
  providedIn: 'root',
  factory: () => {
    const url = getEnvVar('SUPABASE_URL');
    const anonKey = getEnvVar('SUPABASE_ANON_KEY');
    return url && anonKey ? { url, anonKey } : null;
  },
});

export function createSupabaseClient(config?: SupabaseConfig | null): SupabaseClient | null {
  if (!config?.url || !config?.anonKey) {
    return null;
  }
  try {
    return createClient(config.url, config.anonKey);
  } catch (err) {
    console.warn('Error al inicializar cliente de Supabase:', err);
    return null;
  }
}

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient | null>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => {
    const config = inject(SUPABASE_CONFIG, { optional: true });
    return createSupabaseClient(config);
  },
});

export function provideSupabase(config?: SupabaseConfig | null): Provider[] {
  return [
    {
      provide: SUPABASE_CONFIG,
      useValue: config ?? null,
    },
    {
      provide: SUPABASE_CLIENT,
      useFactory: (cfg: SupabaseConfig | null) => createSupabaseClient(cfg),
      deps: [SUPABASE_CONFIG],
    },
  ];
}
