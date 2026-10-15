import { Injectable, signal } from '@angular/core';

export interface FiscalSettings {
  legalName: string;
  tradeName: string;
  cif: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
}

export interface HoursSettings {
  morningHours: string;
  afternoonHours: string;
  workingDays: string;
  prepTimeHours: number;
}

export interface LogisticsSettings {
  shippingCostBcn: number;
  shippingCostCatalonia: number;
  shippingCostPeninsula: number;
  freeShippingThreshold: number;
}

export interface NotificationSettings {
  emailStatusUpdates: boolean;
  internalNewOrderAlert: boolean;
  enableBizumAlert: boolean;
  bccManager: boolean;
}

export interface StoreSettings {
  fiscal: FiscalSettings;
  hours: HoursSettings;
  logistics: LogisticsSettings;
  notifications: NotificationSettings;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  fiscal: {
    legalName: 'Cal Sardà Obrador Gastronòmic S.L.',
    tradeName: 'Cal Sardà (Des de 1930)',
    cif: 'B-08193026',
    address: 'Carrer de la Marina, 237',
    postalCode: '08013',
    city: 'Barcelona',
    phone: '+34 93 245 67 89',
    email: 'obrador@calsarda.com',
  },
  hours: {
    morningHours: '09:00 - 14:00',
    afternoonHours: '17:00 - 20:30',
    workingDays: 'Lunes a Sábado',
    prepTimeHours: 24,
  },
  logistics: {
    shippingCostBcn: 4.9,
    shippingCostCatalonia: 7.99,
    shippingCostPeninsula: 8.99,
    freeShippingThreshold: 80.0,
  },
  notifications: {
    emailStatusUpdates: true,
    internalNewOrderAlert: true,
    enableBizumAlert: true,
    bccManager: true,
  },
};

const SETTINGS_STORAGE_KEY = 'cal_sarda_admin_settings';

@Injectable({
  providedIn: 'root',
})
export class StoreSettingsService {
  readonly settings = signal<StoreSettings>(this.loadInitialSettings());
  readonly toastMessage = signal<string | null>(null);

  private loadInitialSettings(): StoreSettings {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_STORE_SETTINGS };
    }

    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          fiscal: { ...DEFAULT_STORE_SETTINGS.fiscal, ...parsed.fiscal },
          hours: { ...DEFAULT_STORE_SETTINGS.hours, ...parsed.hours },
          logistics: { ...DEFAULT_STORE_SETTINGS.logistics, ...parsed.logistics },
          notifications: { ...DEFAULT_STORE_SETTINGS.notifications, ...parsed.notifications },
        };
      }
    } catch {
      // Fallback a valores por defecto en caso de error de análisis JSON
    }

    return { ...DEFAULT_STORE_SETTINGS };
  }

  saveSettings(newSettings: StoreSettings): void {
    this.settings.set(newSettings);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      } catch {
        // En caso de cuota excedida en localStorage
      }
    }
  }

  resetToDefaults(): StoreSettings {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_STORE_SETTINGS));
    this.saveSettings(defaults);
    return defaults;
  }

  showToast(message: string, durationMs = 3000): void {
    this.toastMessage.set(message);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (this.toastMessage() === message) {
          this.toastMessage.set(null);
        }
      }, durationMs);
    }
  }
}
