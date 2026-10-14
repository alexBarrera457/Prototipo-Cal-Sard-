import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../../services/cookie-consent';
import { I18nService } from '../../services/i18n';

@Component({
  selector: 'app-cookie-banner',
  imports: [RouterLink],
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.css',
})
export class CookieBanner {
  public readonly cookieService = inject(CookieConsentService);
  public readonly i18n = inject(I18nService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  public readonly analyticsChecked = signal(false);
  public readonly marketingChecked = signal(false);
  private configureTriggerElement: HTMLElement | null = null;

  acceptAll(): void {
    this.cookieService.acceptAll();
  }

  rejectNonEssential(): void {
    this.cookieService.rejectNonEssential();
  }

  openPreferences(trigger?: HTMLElement): void {
    this.configureTriggerElement =
      trigger ?? (typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null);

    const currentConsent = this.cookieService.consent();
    this.analyticsChecked.set(currentConsent?.analytics ?? false);
    this.marketingChecked.set(currentConsent?.marketing ?? false);

    this.cookieService.openPreferences();
    this.focusModal();
  }

  closePreferences(): void {
    this.cookieService.closePreferences();
    if (this.configureTriggerElement && typeof this.configureTriggerElement.focus === 'function') {
      this.configureTriggerElement.focus();
      this.configureTriggerElement = null;
    }
  }

  saveCustomPreferences(): void {
    this.cookieService.savePreferences({
      analytics: this.analyticsChecked(),
      marketing: this.marketingChecked(),
    });
    this.configureTriggerElement = null;
  }

  toggleAnalytics(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.analyticsChecked.set(input.checked);
  }

  toggleMarketing(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.marketingChecked.set(input.checked);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.cookieService.showPreferences()) {
      this.closePreferences();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.cookieService.showPreferences()) {
      return;
    }

    const modal = this.elementRef.nativeElement.querySelector(
      '.cookie-preferences-dialog',
    ) as HTMLElement | null;
    if (!modal) {
      return;
    }

    const focusables = Array.from(
      modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);

    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (!active || active === first || !modal.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (!active || active === last || !modal.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  private focusModal(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const doFocus = () => {
      const modal = this.elementRef.nativeElement.querySelector(
        '.cookie-preferences-dialog',
      ) as HTMLElement | null;
      if (!modal) return;

      const firstBtn = modal.querySelector<HTMLElement>('button, input');
      firstBtn?.focus();
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(doFocus);
    } else {
      doFocus();
    }
  }
}
