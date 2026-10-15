import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import {
  AuthService,
  InMemoryAuthAdapter,
  SupabaseAuthAdapter,
  AUTH_ADAPTER,
  type UserProfile,
} from './auth';
import type { SupabaseClient } from './supabase';

describe('InMemoryAuthAdapter', () => {
  let adapter: InMemoryAuthAdapter;

  beforeEach(() => {
    adapter = new InMemoryAuthAdapter();
    // Limpiar cualquier sesión previa
    void adapter.signOut();
  });

  it('signs in preconfigured admin successfully with admin role', async () => {
    const result = await adapter.signIn({
      email: 'admin@calsarda.com',
      password: 'admin1930',
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.role).toBe('admin');
    expect(result.user?.email).toBe('admin@calsarda.com');
  });

  it('signs in preconfigured customer with customer role', async () => {
    const result = await adapter.signIn({
      email: 'cliente@calsarda.com',
      password: 'cliente1930',
    });

    expect(result.success).toBe(true);
    expect(result.user?.role).toBe('customer');
  });

  it('fails to sign in with incorrect password', async () => {
    const result = await adapter.signIn({
      email: 'admin@calsarda.com',
      password: 'wrong-password',
    });

    expect(result.success).toBe(false);
    expect(result.user).toBeUndefined();
    expect(result.error).toContain('incorrectas');
  });

  it('fails to sign in with non-existent email', async () => {
    const result = await adapter.signIn({
      email: 'nadie@calsarda.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('registers a new user and returns user profile', async () => {
    const result = await adapter.signUp({
      name: 'Maria Valls',
      email: 'maria@test.cat',
      password: 'passwordSeguro123',
      phone: '655 443 322',
      address: 'Passeig de Sant Joan, 45',
      city: 'Barcelona',
      postalCode: '08010',
    });

    expect(result.success).toBe(true);
    expect(result.user?.email).toBe('maria@test.cat');
    expect(result.user?.name).toBe('Maria Valls');
    expect(result.user?.role).toBe('customer');

    const current = await adapter.getCurrentUser();
    expect(current?.email).toBe('maria@test.cat');
  });

  it('rejects duplicate email in signUp', async () => {
    const result = await adapter.signUp({
      name: 'Duplicado',
      email: 'admin@calsarda.com',
      password: 'otraPassword123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Ya existe una cuenta');
  });

  it('rejects password shorter than 8 characters in signUp', async () => {
    const result = await adapter.signUp({
      name: 'Corto',
      email: 'corto@test.cat',
      password: '1234',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('mínimo de 8 caracteres');
  });

  it('signs out and clears current user', async () => {
    await adapter.signIn({
      email: 'cliente@calsarda.com',
      password: 'cliente1930',
    });

    expect(await adapter.getCurrentUser()).not.toBeNull();
    await adapter.signOut();
    expect(await adapter.getCurrentUser()).toBeNull();
  });

  it('updates profile and keeps immutable fields safe', async () => {
    await adapter.signIn({
      email: 'cliente@calsarda.com',
      password: 'cliente1930',
    });

    const updateRes = await adapter.updateProfile({
      name: 'Jaume Sardà Actualitzat',
      phone: '600 999 888',
      role: 'admin', // No debe permitir auto-escalado a admin
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.user?.name).toBe('Jaume Sardà Actualitzat');
    expect(updateRes.user?.phone).toBe('600 999 888');
    expect(updateRes.user?.role).toBe('customer');
  });

  it('handles resetPassword correctly', async () => {
    const existing = await adapter.resetPassword('cliente@calsarda.com');
    expect(existing.success).toBe(true);

    const nonExisting = await adapter.resetPassword('inexistente@calsarda.com');
    expect(nonExisting.success).toBe(false);
  });
});

describe('SupabaseAuthAdapter', () => {
  let mockSupabase: any;
  let adapter: SupabaseAuthAdapter;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'sb-usr-1',
                email: 'test@sb.cat',
                user_metadata: { name: 'Test SB', role: 'admin' },
              },
            },
          },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'sb-usr-1',
              email: 'test@sb.cat',
              user_metadata: { name: 'Test SB', role: 'admin' },
            },
          },
          error: null,
        }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        resetPasswordForEmail: vi.fn(),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'sb-usr-1',
                email: 'test@sb.cat',
                name: 'Test SB DB',
                role: 'admin',
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    adapter = new SupabaseAuthAdapter(mockSupabase as unknown as SupabaseClient);
  });

  it('initializes and reads profile from database', async () => {
    const user = await adapter.init();
    expect(user).toBeDefined();
    expect(user?.email).toBe('test@sb.cat');
    expect(user?.name).toBe('Test SB DB');
    expect(user?.role).toBe('admin');
  });

  it('handles signInWithPassword success', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'sb-usr-1',
          email: 'test@sb.cat',
          user_metadata: { name: 'Test SB' },
        },
      },
      error: null,
    });

    const result = await adapter.signIn({
      email: 'test@sb.cat',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    expect(result.user?.id).toBe('sb-usr-1');
  });

  it('handles signInWithPassword failure', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' },
    });

    const result = await adapter.signIn({
      email: 'test@sb.cat',
      password: 'wrong',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });
});

describe('AuthService', () => {
  let service: AuthService;
  let mockAdapter: InMemoryAuthAdapter;

  beforeEach(() => {
    mockAdapter = new InMemoryAuthAdapter();
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: AUTH_ADAPTER, useValue: mockAdapter }],
    });

    service = TestBed.inject(AuthService);
  });

  it('starts in unauthenticated state', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isAdmin()).toBe(false);
  });

  it('updates signals reactively on successful signIn', async () => {
    const result = await service.signIn({
      email: 'admin@calsarda.com',
      password: 'admin1930',
    });

    expect(result.success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(service.currentUser()?.email).toBe('admin@calsarda.com');
  });

  it('updates signals reactively on customer signIn', async () => {
    await service.signIn({
      email: 'cliente@calsarda.com',
      password: 'cliente1930',
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(false);
    expect(service.currentUser()?.role).toBe('customer');
  });

  it('clears state on signOut', async () => {
    await service.signIn({
      email: 'cliente@calsarda.com',
      password: 'cliente1930',
    });

    expect(service.isAuthenticated()).toBe(true);
    await service.signOut();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
