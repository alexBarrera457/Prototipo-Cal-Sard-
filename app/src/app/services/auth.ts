import {
  computed,
  inject,
  Inject,
  Injectable,
  InjectionToken,
  Optional,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SUPABASE_CLIENT, type SupabaseClient } from './supabase';

export type UserRole = 'customer' | 'admin' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  country?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  country?: string;
  role?: UserRole;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

/**
 * Seam: Interfaz que desacopla la autenticación y gestión de usuarios.
 * Permite alternar entre Supabase Auth y adaptador en memoria para desarrollo, SSR y tests.
 */
export interface AuthAdapter {
  init(): Promise<UserProfile | null>;
  signIn(credentials: SignInInput): Promise<AuthResult>;
  signUp(data: SignUpInput): Promise<AuthResult>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<{ success: boolean; error?: string }>;
  getCurrentUser(): Promise<UserProfile | null>;
  updateProfile(data: Partial<UserProfile>): Promise<AuthResult>;
}

export const AUTH_ADAPTER = new InjectionToken<AuthAdapter>('AUTH_ADAPTER');

const AUTH_STORAGE_KEY = 'cal_sarda_auth_session';

/**
 * Adaptador en memoria con persistencia en localStorage para tests, modo demo y offline.
 */
@Injectable()
export class InMemoryAuthAdapter implements AuthAdapter {
  private users: Array<UserProfile & { passwordHash: string }> = [
    {
      id: 'usr-admin-01',
      email: 'admin@calsarda.com',
      passwordHash: 'admin1930',
      name: 'Administrador Cal Sardà',
      phone: '932 456 789',
      address: 'Carrer de la Marina, 237',
      postalCode: '08013',
      city: 'Barcelona',
      province: 'Barcelona',
      country: 'España',
      role: 'admin',
      createdAt: new Date('1930-10-15T08:00:00Z').toISOString(),
    },
    {
      id: 'usr-customer-01',
      email: 'cliente@calsarda.com',
      passwordHash: 'cliente1930',
      name: 'Jaume Sardà',
      phone: '611 223 344',
      address: 'Carrer d’Aragó, 312',
      postalCode: '08009',
      city: 'Barcelona',
      province: 'Barcelona',
      country: 'España',
      role: 'customer',
      createdAt: new Date('2026-01-10T10:00:00Z').toISOString(),
    },
  ];

  private currentUser: UserProfile | null = null;

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          this.currentUser = JSON.parse(stored) as UserProfile;
        }
      } catch {
        this.currentUser = null;
      }
    }
  }

  private persistSession(user: UserProfile | null): void {
    this.currentUser = user;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (user) {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        } else {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch {
        // Ignorar excepciones de almacenamiento local
      }
    }
  }

  async init(): Promise<UserProfile | null> {
    this.restoreFromStorage();
    return this.currentUser;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.currentUser;
  }

  async signIn(credentials: SignInInput): Promise<AuthResult> {
    const email = credentials.email.trim().toLowerCase();
    const user = this.users.find(
      (u) => u.email.toLowerCase() === email && u.passwordHash === credentials.password,
    );

    if (!user) {
      return {
        success: false,
        error: 'Las credenciales introducidas son incorrectas.',
      };
    }

    const { passwordHash: _, ...profile } = user;
    this.persistSession(profile);

    return {
      success: true,
      user: profile,
    };
  }

  async signUp(data: SignUpInput): Promise<AuthResult> {
    const email = data.email.trim().toLowerCase();
    const existing = this.users.find((u) => u.email.toLowerCase() === email);

    if (existing) {
      return {
        success: false,
        error: 'Ya existe una cuenta registrada con este correo electrónico.',
      };
    }

    if (data.password.length < 8) {
      return {
        success: false,
        error: 'La contraseña debe tener un mínimo de 8 caracteres.',
      };
    }

    const newProfile: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email,
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      postalCode: data.postalCode?.trim() || undefined,
      city: data.city?.trim() || undefined,
      province: data.province?.trim() || undefined,
      country: data.country?.trim() || 'España',
      role: data.role ?? 'customer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push({ ...newProfile, passwordHash: data.password });
    this.persistSession(newProfile);

    return {
      success: true,
      user: newProfile,
    };
  }

  async signOut(): Promise<void> {
    this.persistSession(null);
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    const normalized = email.trim().toLowerCase();
    const exists = this.users.some((u) => u.email.toLowerCase() === normalized);

    if (!exists) {
      return {
        success: false,
        error: 'No se ha encontrado ninguna cuenta con ese correo electrónico.',
      };
    }

    return { success: true };
  }

  async updateProfile(data: Partial<UserProfile>): Promise<AuthResult> {
    if (!this.currentUser) {
      return { success: false, error: 'No hay ninguna sesión activa.' };
    }

    const updated: UserProfile = {
      ...this.currentUser,
      ...data,
      id: this.currentUser.id, // ID inmutable
      role: this.currentUser.role, // Rol inmutable por el usuario
      updatedAt: new Date().toISOString(),
    };

    const index = this.users.findIndex((u) => u.id === updated.id);
    if (index >= 0) {
      this.users[index] = { ...this.users[index], ...updated };
    }

    this.persistSession(updated);
    return { success: true, user: updated };
  }
}

/**
 * Adaptador de autenticación conectado con Supabase Auth y tabla 'profiles'.
 */
@Injectable()
export class SupabaseAuthAdapter implements AuthAdapter {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async init(): Promise<UserProfile | null> {
    try {
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();
      if (error || !session?.user) {
        return null;
      }
      return await this.fetchProfile(
        session.user.id,
        session.user.email ?? '',
        session.user.user_metadata,
      );
    } catch {
      return null;
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();
      if (error || !user) {
        return null;
      }
      return await this.fetchProfile(user.id, user.email ?? '', user.user_metadata);
    } catch {
      return null;
    }
  }

  async signIn(credentials: SignInInput): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Error al iniciar sesión.',
        };
      }

      if (!data.user) {
        return { success: false, error: 'Usuario no disponible.' };
      }

      const profile = await this.fetchProfile(
        data.user.id,
        data.user.email ?? '',
        data.user.user_metadata,
      );
      return { success: true, user: profile };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado de autenticación';
      return { success: false, error: message };
    }
  }

  async signUp(data: SignUpInput): Promise<AuthResult> {
    try {
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: {
            name: data.name.trim(),
            phone: data.phone?.trim(),
            address: data.address?.trim(),
            postalCode: data.postalCode?.trim(),
            city: data.city?.trim(),
            province: data.province?.trim(),
            country: data.country?.trim() || 'España',
            role: data.role ?? 'customer',
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Error al registrar la cuenta.',
        };
      }

      if (!authData.user) {
        return { success: false, error: 'No se pudo crear el usuario.' };
      }

      // Si Supabase requiere confirmación de email y no genera sesión inmediata
      const requiresEmailConfirmation = !authData.session;

      const profile = await this.fetchProfile(
        authData.user.id,
        authData.user.email ?? data.email,
        authData.user.user_metadata,
      );

      return {
        success: true,
        user: profile,
        requiresEmailConfirmation,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar la cuenta';
      return { success: false, error: message };
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } catch {
      // Ignorar error al cerrar sesión
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al solicitar recuperación';
      return { success: false, error: message };
    }
  }

  async updateProfile(data: Partial<UserProfile>): Promise<AuthResult> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'No hay usuario autenticado.' };
      }

      // 1. Actualizar tabla profiles
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({
          name: data.name,
          phone: data.phone,
          address: data.address,
          postal_code: data.postalCode,
          city: data.city,
          province: data.province,
          country: data.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.warn('No se pudo actualizar tabla profiles, actualizando metadata:', profileError);
      }

      // 2. Actualizar metadata de auth
      await this.supabase.auth.updateUser({
        data: {
          name: data.name,
          phone: data.phone,
          address: data.address,
          postalCode: data.postalCode,
          city: data.city,
          province: data.province,
          country: data.country,
        },
      });

      const updated = await this.fetchProfile(user.id, user.email ?? '', {
        ...user.user_metadata,
        ...data,
      });

      return { success: true, user: updated };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar perfil';
      return { success: false, error: message };
    }
  }

  private async fetchProfile(
    userId: string,
    email: string,
    metadata?: Record<string, unknown>,
  ): Promise<UserProfile> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          email: data.email ?? email,
          name: data.name ?? (metadata?.['name'] as string) ?? email.split('@')[0],
          phone: data.phone ?? (metadata?.['phone'] as string),
          address: data.address ?? (metadata?.['address'] as string),
          postalCode: data.postal_code ?? (metadata?.['postalCode'] as string),
          city: data.city ?? (metadata?.['city'] as string),
          province: data.province ?? (metadata?.['province'] as string),
          country: data.country ?? (metadata?.['country'] as string) ?? 'España',
          role: (data.role as UserRole) ?? (metadata?.['role'] as UserRole) ?? 'customer',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {
      // Fallback a metadata
    }

    return {
      id: userId,
      email,
      name: (metadata?.['name'] as string) || email.split('@')[0],
      phone: metadata?.['phone'] as string | undefined,
      address: metadata?.['address'] as string | undefined,
      postalCode: metadata?.['postalCode'] as string | undefined,
      city: metadata?.['city'] as string | undefined,
      province: metadata?.['province'] as string | undefined,
      country: (metadata?.['country'] as string | undefined) || 'España',
      role: (metadata?.['role'] as UserRole) || 'customer',
    };
  }
}

/**
 * Servicio principal de autenticación reactivo basado en Angular Signals.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly adapter: AuthAdapter;
  private readonly isBrowser: boolean;

  readonly currentUser = signal<UserProfile | null>(null);
  readonly loading = signal<boolean>(false);

  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');
  readonly isStaff = computed(
    () => this.currentUser()?.role === 'admin' || this.currentUser()?.role === 'staff',
  );

  constructor(
    @Optional() @Inject(AUTH_ADAPTER) injectAdapter: AuthAdapter | null,
    @Optional() @Inject(SUPABASE_CLIENT) supabaseClient: SupabaseClient | null,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (injectAdapter) {
      this.adapter = injectAdapter;
    } else if (supabaseClient) {
      this.adapter = new SupabaseAuthAdapter(supabaseClient);
    } else {
      this.adapter = new InMemoryAuthAdapter();
    }

    if (this.isBrowser) {
      void this.initSession();
    }
  }

  async initSession(): Promise<void> {
    this.loading.set(true);
    try {
      const user = await this.adapter.init();
      this.currentUser.set(user);
    } finally {
      this.loading.set(false);
    }
  }

  async signIn(credentials: SignInInput): Promise<AuthResult> {
    this.loading.set(true);
    try {
      const result = await this.adapter.signIn(credentials);
      if (result.success && result.user) {
        this.currentUser.set(result.user);
      }
      return result;
    } finally {
      this.loading.set(false);
    }
  }

  async signUp(data: SignUpInput): Promise<AuthResult> {
    this.loading.set(true);
    try {
      const result = await this.adapter.signUp(data);
      if (result.success && result.user && !result.requiresEmailConfirmation) {
        this.currentUser.set(result.user);
      }
      return result;
    } finally {
      this.loading.set(false);
    }
  }

  async signOut(): Promise<void> {
    this.loading.set(true);
    try {
      await this.adapter.signOut();
      this.currentUser.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    this.loading.set(true);
    try {
      return await this.adapter.resetPassword(email);
    } finally {
      this.loading.set(false);
    }
  }

  async updateProfile(data: Partial<UserProfile>): Promise<AuthResult> {
    this.loading.set(true);
    try {
      const result = await this.adapter.updateProfile(data);
      if (result.success && result.user) {
        this.currentUser.set(result.user);
      }
      return result;
    } finally {
      this.loading.set(false);
    }
  }
}
