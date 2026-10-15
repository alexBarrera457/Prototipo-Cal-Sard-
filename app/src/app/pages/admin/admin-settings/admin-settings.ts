import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreSettingsService, type StoreSettings } from '../../../services/store-settings';
import { I18nService } from '../../../services/i18n';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.css',
})
export class AdminSettings {
  readonly storeSettingsService = inject(StoreSettingsService);
  readonly i18n = inject(I18nService);

  readonly isSaving = signal<boolean>(false);

  // Modelo reactivo mutable enlazado a los formularios
  formData: StoreSettings = this.cloneSettings(this.storeSettingsService.settings());

  private cloneSettings(source: StoreSettings): StoreSettings {
    return JSON.parse(JSON.stringify(source));
  }

  saveSettings(): void {
    this.isSaving.set(true);
    try {
      this.storeSettingsService.saveSettings(this.formData);
      const msg = this.i18n.t('admin.settings_saved_toast');
      this.storeSettingsService.showToast(msg);
    } finally {
      this.isSaving.set(false);
    }
  }

  resetDefaults(): void {
    const defaults = this.storeSettingsService.resetToDefaults();
    this.formData = this.cloneSettings(defaults);
    const msg = this.i18n.t('admin.settings_reset_toast');
    this.storeSettingsService.showToast(msg);
  }
}
