import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  Inject,
  Injectable,
  InjectionToken,
  Optional,
  PLATFORM_ID,
  signal,
} from '@angular/core';

export interface CookieConsent {
  status: 'accepted' | 'rejected' | 'custom';
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export interface CookiePreferences {
  analytics: boolean;
  marketing: boolean;
}

export interface CookieStorageAdapter {
  load(): CookieConsent | null;
  save(consent: CookieConsent): void;
  clear(): void;
}

export const COOKIE_STORAGE_ADAPTER = new InjectionToken<CookieStorageAdapter>(
  'COOKIE_STORAGE_ADAPTER',
);

@Injectable()
export class InMemoryCookieAdapter implements CookieStorageAdapter {
  private item: CookieConsent | null = null;

  constructor(@Optional() @Inject('INITIAL_COOKIE_CONSENT') initial?: CookieConsent | null) {
    this.item = initial ?? null;
  }

  load(): CookieConsent | null {
    return this.item ? { ...this.item } : null;
  }

  save(consent: CookieConsent): void {
    this.item = { ...consent };
  }

  clear(): void {
    this.item = null;
  }
}

@Injectable({
  providedIn: 'root',
})
export class LocalStorageCookieAdapter implements CookieStorageAdapter {
  private readonly storageKey = 'cal-sarda-cookie-consent';

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  load(): CookieConsent | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return null;
      }
      const parsed: unknown = JSON.parse(stored);
      if (this.isValidConsent(parsed)) {
        return parsed;
      }
    } catch {
      // Entornos con almacenamiento local deshabilitado o JSON corrupto
    }
    return null;
  }

  save(consent: CookieConsent): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(consent));
    } catch {
      // Ignorar excepciones de cuota excedida
    }
  }

  clear(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignorar excepciones
    }
  }

  private isValidConsent(value: unknown): value is CookieConsent {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    return (
      (candidate['status'] === 'accepted' ||
        candidate['status'] === 'rejected' ||
        candidate['status'] === 'custom') &&
      candidate['essential'] === true &&
      typeof candidate['analytics'] === 'boolean' &&
      typeof candidate['marketing'] === 'boolean' &&
      typeof candidate['timestamp'] === 'string'
    );
  }
}

@Injectable({
  providedIn: 'root',
})
export class CookieConsentService {
  private readonly adapter: CookieStorageAdapter;
  public readonly consent = signal<CookieConsent | null>(null);
  public readonly showPreferences = signal<boolean>(false);

  public readonly isBannerVisible = computed(() => this.consent() === null);
  public readonly isTrackingAllowed = computed(() => Boolean(this.consent()?.analytics));

  constructor(
    @Inject(COOKIE_STORAGE_ADAPTER) @Optional() customAdapter?: CookieStorageAdapter,
    @Optional() defaultAdapter?: LocalStorageCookieAdapter,
  ) {
    this.adapter = customAdapter ?? defaultAdapter ?? new InMemoryCookieAdapter();
    const stored = this.adapter.load();
    if (stored) {
      this.consent.set(stored);
    }
  }

  acceptAll(): void {
    const newConsent: CookieConsent = {
      status: 'accepted',
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    this.saveConsent(newConsent);
  }

  rejectNonEssential(): void {
    const newConsent: CookieConsent = {
      status: 'rejected',
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    this.saveConsent(newConsent);
  }

  savePreferences(preferences: CookiePreferences): void {
    const newConsent: CookieConsent = {
      status: 'custom',
      essential: true,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      timestamp: new Date().toISOString(),
    };
    this.saveConsent(newConsent);
    this.closePreferences();
  }

  openPreferences(): void {
    this.showPreferences.set(true);
  }

  closePreferences(): void {
    this.showPreferences.set(false);
  }

  resetConsent(): void {
    this.adapter.clear();
    this.consent.set(null);
    this.showPreferences.set(false);
  }

  private saveConsent(newConsent: CookieConsent): void {
    this.consent.set(newConsent);
    this.adapter.save(newConsent);
  }
}
