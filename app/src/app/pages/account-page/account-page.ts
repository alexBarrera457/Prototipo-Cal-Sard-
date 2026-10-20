import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Invoice, TaxBreakdownItem } from '@cal-sarda/domain';
import {
  AuthService,
  type UserAddress,
  type FiscalData,
  type CustomerPreferences,
  type CutThicknessPreference,
  type PackagingPreference,
  type NotificationChannelPreference,
} from '../../services/auth';
import { I18nService } from '../../services/i18n';
import { OrdersService, type Order, type OrderStatus } from '../../services/orders';
import { CartService } from '../../services/cart';
import { InvoicingService } from '../../services/invoicing';
import { FavoritesService } from '../../services/favorites';
import type { StoreProduct } from '../../services/products';

export type AccountTab =
  'perfil' | 'direcciones' | 'pedidos' | 'preferencias' | 'favoritos' | 'facturas';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  templateUrl: './account-page.html',
  styleUrl: './account-page.css',
})
export class AccountPage implements OnInit {
  public readonly auth = inject(AuthService);
  public readonly i18n = inject(I18nService);
  public readonly ordersService = inject(OrdersService);
  public readonly cartService = inject(CartService);
  public readonly invoicingService = inject(InvoicingService);
  public readonly favoritesService = inject(FavoritesService);

  // Pestaña activa en el área privada
  readonly activeTab = signal<AccountTab>('pedidos');

  // Pedidos del cliente autenticado
  readonly customerOrders = signal<Order[]>([]);
  readonly loadingOrders = signal<boolean>(false);
  readonly expandedOrderRef = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);

  // Edición de Perfil
  readonly isEditingProfile = signal<boolean>(false);
  editName = '';
  editPhone = '';
  readonly profileSaving = signal<boolean>(false);
  readonly profileError = signal<string | null>(null);

  // Cambio de Contraseña
  readonly isChangingPassword = signal<boolean>(false);
  currentPasswordInput = '';
  newPasswordInput = '';
  confirmPasswordInput = '';
  readonly passwordSaving = signal<boolean>(false);
  readonly passwordError = signal<string | null>(null);

  // Libreta de Direcciones
  readonly isEditingAddress = signal<boolean>(false);
  readonly editingAddressId = signal<string | null>(null);
  addrAlias = '';
  addrStreet = '';
  addrPostalCode = '';
  addrCity = '';
  addrProvince = 'Barcelona';
  addrIsDefault = false;
  readonly addressSaving = signal<boolean>(false);
  readonly addressError = signal<string | null>(null);

  // Datos Fiscales (NIF/CIF)
  readonly isEditingFiscal = signal<boolean>(false);
  fiscalCompany = '';
  fiscalTaxId = '';
  fiscalAddress = '';
  fiscalPostalCode = '';
  fiscalCity = '';
  readonly fiscalSaving = signal<boolean>(false);
  readonly fiscalError = signal<string | null>(null);

  // Preferencias y Obrador
  readonly commonAllergens = [
    'Gluten',
    'Lactosa',
    'Frutos secos',
    'Huevo',
    'Soja',
    'Sulfitos',
    'Pescado / Marisco',
    'Sésamo',
  ];
  readonly prefAllergens = signal<string[]>([]);
  readonly prefCutThickness = signal<CutThicknessPreference>('muy_fino');
  readonly prefPackaging = signal<PackagingPreference>('vacio_100g');
  readonly prefChannel = signal<NotificationChannelPreference>('whatsapp');
  prefObradorNotes = '';
  readonly preferenceSaving = signal<boolean>(false);
  readonly preferenceError = signal<string | null>(null);
  readonly preferenceSuccess = signal<boolean>(false);

  // Favoritos / Cesta Habitual
  readonly favoriteProductsList = signal<StoreProduct[]>([]);
  readonly loadingFavorites = signal<boolean>(false);

  // Facturas y Justificantes Fiscales
  readonly selectedFiscalYear = signal<string>('all');
  readonly selectedInvoiceForModal = signal<Invoice | null>(null);

  readonly customerInvoices = computed<Invoice[]>(() => {
    const orders = this.customerOrders();
    const fiscal = this.auth.currentUser()?.fiscalData;
    return orders.map((order) => this.invoicingService.generateInvoice(order, fiscal));
  });

  readonly availableFiscalYears = computed<string[]>(() => {
    const invoices = this.customerInvoices();
    const yearsSet = new Set<string>();
    for (const inv of invoices) {
      if (inv.issuedAt) {
        const year = new Date(inv.issuedAt).getFullYear().toString();
        if (!isNaN(Number(year))) {
          yearsSet.add(year);
        }
      }
    }
    const currentYear = new Date().getFullYear().toString();
    yearsSet.add(currentYear);
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  });

  readonly filteredInvoices = computed<Invoice[]>(() => {
    const invoices = this.customerInvoices();
    const selected = this.selectedFiscalYear();
    if (selected === 'all') {
      return invoices;
    }
    return invoices.filter((inv) => {
      const year = new Date(inv.issuedAt).getFullYear().toString();
      return year === selected;
    });
  });

  readonly invoiceAggregates = computed(() => {
    const list = this.filteredInvoices();
    let totalInvoiced = 0;
    let totalBase = 0;
    let totalVat = 0;
    for (const inv of list) {
      totalInvoiced += inv.total;
      totalBase += inv.subtotalBase;
      totalVat += inv.totalVat;
    }
    const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
    return {
      count: list.length,
      totalInvoiced: round(totalInvoiced),
      totalBase: round(totalBase),
      totalVat: round(totalVat),
    };
  });

  // Formulario de inicio de sesión
  email = '';
  password = '';
  showPassword = false;
  loginDemoCompleted = false;
  recoveryNotice = false;
  recoverySuccess = false;
  errorMessage = '';

  constructor() {
    // Al cambiar el usuario autenticado, recargar sus pedidos y preferencias
    effect(() => {
      const user = this.auth.currentUser();
      if (user?.email) {
        void this.loadCustomerOrders(user.email);
        this.loadUserPreferences();
      } else {
        this.customerOrders.set([]);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (user?.email) {
      await this.loadCustomerOrders(user.email);
      this.loadUserPreferences();
    }
  }

  loadUserPreferences(): void {
    const prefs = this.auth.currentUser()?.preferences;
    if (prefs) {
      this.prefAllergens.set(prefs.allergens ? [...prefs.allergens] : []);
      this.prefCutThickness.set(prefs.cutThickness || 'muy_fino');
      this.prefPackaging.set(prefs.packaging || 'vacio_100g');
      this.prefChannel.set(prefs.preferredChannel || 'whatsapp');
      this.prefObradorNotes = prefs.obradorNotes || '';
    } else {
      this.prefAllergens.set([]);
      this.prefCutThickness.set('muy_fino');
      this.prefPackaging.set('vacio_100g');
      this.prefChannel.set('whatsapp');
      this.prefObradorNotes = '';
    }
    this.preferenceError.set(null);
    this.preferenceSuccess.set(false);
  }

  toggleAllergen(allergen: string): void {
    const current = this.prefAllergens();
    if (current.includes(allergen)) {
      this.prefAllergens.set(current.filter((a) => a !== allergen));
    } else {
      this.prefAllergens.set([...current, allergen]);
    }
  }

  hasAllergen(allergen: string): boolean {
    return this.prefAllergens().includes(allergen);
  }

  async saveCustomerPreferences(): Promise<void> {
    this.preferenceSaving.set(true);
    this.preferenceError.set(null);
    this.preferenceSuccess.set(false);

    try {
      const res = await this.auth.savePreferences({
        allergens: this.prefAllergens(),
        cutThickness: this.prefCutThickness(),
        packaging: this.prefPackaging(),
        preferredChannel: this.prefChannel(),
        obradorNotes: this.prefObradorNotes.trim(),
      });

      if (res.success) {
        this.preferenceSuccess.set(true);
        this.showToast(this.i18n.t('account.pref_saved_success'));
      } else {
        this.preferenceError.set(res.error || 'Error al guardar preferencias.');
      }
    } catch {
      this.preferenceError.set('Error inesperado al guardar preferencias.');
    } finally {
      this.preferenceSaving.set(false);
    }
  }

  async loadCustomerOrders(email: string): Promise<void> {
    this.loadingOrders.set(true);
    try {
      const orders = await this.ordersService.getOrdersByCustomerEmail(email);
      this.customerOrders.set(orders);
    } finally {
      this.loadingOrders.set(false);
    }
  }

  setTab(tab: AccountTab): void {
    this.activeTab.set(tab);
    if (tab === 'preferencias') {
      this.loadUserPreferences();
    } else if (tab === 'favoritos') {
      void this.loadFavoriteProducts();
    }
  }

  async loadFavoriteProducts(): Promise<void> {
    this.loadingFavorites.set(true);
    try {
      const items = await this.favoritesService.getFavoriteProducts();
      this.favoriteProductsList.set(items);
    } finally {
      this.loadingFavorites.set(false);
    }
  }

  async removeFavorite(productNumber: string): Promise<void> {
    await this.favoritesService.removeFavorite(productNumber);
    this.favoriteProductsList.update((list) => list.filter((p) => p.number !== productNumber));
    this.showToast(this.i18n.t('favorites.toast_removed'));
  }

  async toggleOrderFavorite(productNumber: string): Promise<void> {
    const isNowFav = await this.favoritesService.toggleFavorite(productNumber);
    this.showToast(
      isNowFav ? this.i18n.t('favorites.toast_added') : this.i18n.t('favorites.toast_removed'),
    );
    if (this.activeTab() === 'favoritos') {
      await this.loadFavoriteProducts();
    }
  }

  addFavoriteToCart(product: StoreProduct): void {
    this.cartService.addToCart(product.name, product.price, 1, product.number, product.image);
    this.showToast(
      this.i18n.currentLang() === 'ca'
        ? `${product.name} afegit a la cistella`
        : `${product.name} añadido a la cesta`,
    );
  }

  async addAllFavoritesToCart(): Promise<void> {
    const { addedCount, outOfStockCount } = await this.favoritesService.addAllFavoritesToCart();
    if (addedCount > 0) {
      if (outOfStockCount > 0) {
        this.showToast(this.i18n.t('favorites.toast_some_out_of_stock'));
      } else {
        this.showToast(this.i18n.t('favorites.toast_all_added'));
      }
    }
  }

  startEditProfile(): void {
    const user = this.auth.currentUser();
    this.editName = user?.name ?? '';
    this.editPhone = user?.phone ?? '';
    this.profileError.set(null);
    this.isEditingProfile.set(true);
  }

  cancelEditProfile(): void {
    this.isEditingProfile.set(false);
    this.profileError.set(null);
  }

  async saveProfile(): Promise<void> {
    const trimmedName = this.editName.trim();
    if (!trimmedName) {
      this.profileError.set(
        this.i18n.currentLang() === 'ca'
          ? 'El nom no pot estar buit.'
          : 'El nombre no puede estar vacío.',
      );
      return;
    }

    this.profileSaving.set(true);
    this.profileError.set(null);

    try {
      const result = await this.auth.updateProfile({
        name: trimmedName,
        phone: this.editPhone.trim(),
      });

      if (result.success) {
        this.isEditingProfile.set(false);
        this.showToast(
          this.i18n.currentLang() === 'ca'
            ? 'Perfil actualitzat correctament'
            : 'Perfil actualizado correctamente',
        );
      } else {
        this.profileError.set(result.error ?? 'Error al actualizar el perfil.');
      }
    } finally {
      this.profileSaving.set(false);
    }
  }

  startChangePassword(): void {
    this.currentPasswordInput = '';
    this.newPasswordInput = '';
    this.confirmPasswordInput = '';
    this.passwordError.set(null);
    this.isChangingPassword.set(true);
  }

  cancelChangePassword(): void {
    this.isChangingPassword.set(false);
    this.passwordError.set(null);
  }

  async savePassword(): Promise<void> {
    if (!this.currentPasswordInput) {
      this.passwordError.set(
        this.i18n.currentLang() === 'ca'
          ? 'Introdueix la teva contrasenya actual.'
          : 'Introduce tu contraseña actual.',
      );
      return;
    }

    if (this.newPasswordInput.length < 8) {
      this.passwordError.set(
        this.i18n.currentLang() === 'ca'
          ? 'La nova contrasenya ha de tenir com a mínim 8 caràcters.'
          : 'La nueva contraseña debe tener al menos 8 caracteres.',
      );
      return;
    }

    if (this.newPasswordInput !== this.confirmPasswordInput) {
      this.passwordError.set(
        this.i18n.currentLang() === 'ca'
          ? 'Les noves contrasenyes no coincideixen.'
          : 'Las nuevas contraseñas no coinciden.',
      );
      return;
    }

    this.passwordSaving.set(true);
    this.passwordError.set(null);

    try {
      const result = await this.auth.changePassword(
        this.currentPasswordInput,
        this.newPasswordInput,
      );

      if (result.success) {
        this.isChangingPassword.set(false);
        this.currentPasswordInput = '';
        this.newPasswordInput = '';
        this.confirmPasswordInput = '';
        this.showToast(
          this.i18n.currentLang() === 'ca'
            ? 'Contrasenya canviada amb èxit'
            : 'Contraseña cambiada con éxito',
        );
      } else {
        this.passwordError.set(result.error ?? 'Error al cambiar la contraseña.');
      }
    } finally {
      this.passwordSaving.set(false);
    }
  }

  openNewAddressForm(): void {
    this.editingAddressId.set(null);
    this.addrAlias = '';
    this.addrStreet = '';
    this.addrPostalCode = '';
    this.addrCity = 'Barcelona';
    this.addrProvince = 'Barcelona';
    this.addrIsDefault = (this.auth.currentUser()?.addresses?.length ?? 0) === 0;
    this.addressError.set(null);
    this.isEditingAddress.set(true);
  }

  openEditAddressForm(addr: UserAddress): void {
    this.editingAddressId.set(addr.id);
    this.addrAlias = addr.alias;
    this.addrStreet = addr.street;
    this.addrPostalCode = addr.postalCode;
    this.addrCity = addr.city;
    this.addrProvince = addr.province ?? 'Barcelona';
    this.addrIsDefault = !!addr.isDefault;
    this.addressError.set(null);
    this.isEditingAddress.set(true);
  }

  cancelAddressForm(): void {
    this.isEditingAddress.set(false);
    this.editingAddressId.set(null);
    this.addressError.set(null);
  }

  async saveAddress(): Promise<void> {
    const street = this.addrStreet.trim();
    const postalCode = this.addrPostalCode.trim();
    const city = this.addrCity.trim();
    const alias = this.addrAlias.trim() || 'Dirección';

    if (!street || !postalCode || !city) {
      this.addressError.set(
        this.i18n.currentLang() === 'ca'
          ? 'El carrer, codi postal i ciutat són obligatoris.'
          : 'La calle, código postal y ciudad son obligatorios.',
      );
      return;
    }

    this.addressSaving.set(true);
    this.addressError.set(null);

    try {
      const editId = this.editingAddressId();
      let result;
      if (editId) {
        result = await this.auth.updateAddress(editId, {
          alias,
          street,
          postalCode,
          city,
          province: this.addrProvince.trim(),
          isDefault: this.addrIsDefault,
        });
      } else {
        result = await this.auth.addAddress({
          alias,
          street,
          postalCode,
          city,
          province: this.addrProvince.trim(),
          isDefault: this.addrIsDefault,
        });
      }

      if (result.success) {
        this.isEditingAddress.set(false);
        this.editingAddressId.set(null);
        this.showToast(
          this.i18n.currentLang() === 'ca'
            ? 'Adreça desada amb èxit'
            : 'Dirección guardada con éxito',
        );
      } else {
        this.addressError.set(result.error ?? 'Error al guardar la dirección.');
      }
    } finally {
      this.addressSaving.set(false);
    }
  }

  async deleteAddress(id: string): Promise<void> {
    const result = await this.auth.deleteAddress(id);
    if (result.success) {
      this.showToast(
        this.i18n.currentLang() === 'ca'
          ? 'Adreça eliminada correctament'
          : 'Dirección eliminada correctamente',
      );
    }
  }

  async setDefaultAddress(id: string): Promise<void> {
    const result = await this.auth.setDefaultAddress(id);
    if (result.success) {
      this.showToast(
        this.i18n.currentLang() === 'ca'
          ? 'Adreça predeterminada actualitzada'
          : 'Dirección predeterminada actualizada',
      );
    }
  }

  openEditFiscalForm(): void {
    const user = this.auth.currentUser();
    const fiscal = user?.fiscalData;
    this.fiscalCompany = fiscal?.companyName ?? user?.name ?? '';
    this.fiscalTaxId = fiscal?.taxId ?? '';
    this.fiscalAddress = fiscal?.address ?? user?.address ?? '';
    this.fiscalPostalCode = fiscal?.postalCode ?? user?.postalCode ?? '';
    this.fiscalCity = fiscal?.city ?? user?.city ?? 'Barcelona';
    this.fiscalError.set(null);
    this.isEditingFiscal.set(true);
  }

  cancelEditFiscalForm(): void {
    this.isEditingFiscal.set(false);
    this.fiscalError.set(null);
  }

  async saveFiscalData(): Promise<void> {
    const taxId = this.fiscalTaxId.trim();
    const company = this.fiscalCompany.trim();

    if (!taxId || !company) {
      this.fiscalError.set(
        this.i18n.currentLang() === 'ca'
          ? 'El NIF/CIF i la raó social són obligatoris.'
          : 'El NIF/CIF y la razón social son obligatorios.',
      );
      return;
    }

    this.fiscalSaving.set(true);
    this.fiscalError.set(null);

    try {
      const result = await this.auth.saveFiscalData({
        companyName: company,
        taxId,
        address: this.fiscalAddress.trim(),
        postalCode: this.fiscalPostalCode.trim(),
        city: this.fiscalCity.trim(),
      });

      if (result.success) {
        this.isEditingFiscal.set(false);
        this.showToast(
          this.i18n.currentLang() === 'ca'
            ? 'Dades fiscals desades correctament'
            : 'Datos fiscales guardados correctamente',
        );
      } else {
        this.fiscalError.set(result.error ?? 'Error al guardar los datos fiscales.');
      }
    } finally {
      this.fiscalSaving.set(false);
    }
  }

  toggleOrderDetails(ref?: string): void {
    if (!ref) return;
    this.expandedOrderRef.update((curr) => (curr === ref ? null : ref));
  }

  /**
   * Repite un encargo anterior cargando todos sus productos en la cesta actual.
   */
  reorder(order: Order): void {
    if (!order.items || order.items.length === 0) return;

    for (const item of order.items) {
      this.cartService.addToCart(
        item.name,
        item.price,
        item.quantity,
        item.productNumber,
        item.image,
      );
    }

    this.showToast(this.i18n.t('account.reorder_success'));
  }

  /**
   * Genera y descarga el archivo oficial PDF de la factura simplificada.
   */
  downloadInvoice(item: Order | Invoice): void {
    const invoice =
      'invoiceNumber' in item
        ? item
        : this.invoicingService.generateInvoice(item, this.auth.currentUser()?.fiscalData);
    this.invoicingService.downloadInvoicePdf(invoice);
    this.showToast(this.i18n.t('invoices.toast_pdf_downloaded'));
  }

  /**
   * Abre la factura en modo impresión/previsualización segura sin popup blocker.
   */
  printInvoice(item: Order | Invoice): void {
    const invoice =
      'invoiceNumber' in item
        ? item
        : this.invoicingService.generateInvoice(item, this.auth.currentUser()?.fiscalData);
    this.invoicingService.printInvoice(invoice);
  }

  setFiscalYear(year: string): void {
    this.selectedFiscalYear.set(year);
  }

  openInvoicePreview(invoice: Invoice): void {
    this.selectedInvoiceForModal.set(invoice);
  }

  closeInvoicePreview(): void {
    this.selectedInvoiceForModal.set(null);
  }

  exportInvoicesCsv(): void {
    const invoices = this.filteredInvoices();
    const isCa = this.i18n.currentLang() === 'ca';
    const headers = isCa
      ? [
          'Núm. Factura',
          'Comanda',
          'Data Emissió',
          'Client / Raó Social',
          'NIF / CIF',
          'Base Imposable (€)',
          'IVA Total (€)',
          'Total Factura (€)',
          'Mètode de Pagament',
          'Modalitat',
        ]
      : [
          'Nº Factura',
          'Pedido',
          'Fecha Emisión',
          'Cliente / Razón Social',
          'NIF / CIF',
          'Base Imponible (€)',
          'IVA Total (€)',
          'Total Factura (€)',
          'Método de Pago',
          'Modalidad',
        ];

    const rows = invoices.map((inv) =>
      [
        `"${inv.invoiceNumber}"`,
        `"${inv.orderReference}"`,
        `"${new Date(inv.issuedAt).toLocaleDateString('es-ES')}"`,
        `"${(inv.customer.companyName || inv.customer.name || '').replace(/"/g, '""')}"`,
        `"${(inv.customer.taxId || '').replace(/"/g, '""')}"`,
        inv.subtotalBase.toFixed(2),
        inv.totalVat.toFixed(2),
        inv.total.toFixed(2),
        `"${(inv.paymentMethod || '').replace(/"/g, '""')}"`,
        `"${
          inv.fulfillment === 'delivery'
            ? isCa
              ? 'Repartiment domicili'
              : 'Entrega a domicilio'
            : isCa
              ? 'Recollida obrador'
              : 'Recogida colmado'
        }"`,
      ].join(';'),
    );

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const yearLabel =
            this.selectedFiscalYear() === 'all' ? 'todos' : this.selectedFiscalYear();
          link.setAttribute('href', url);
          link.setAttribute('download', `facturas-cal-sarda-${yearLabel}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(url);
          }
        }
      } catch {
        // Fallback seguro en entornos sin soporte nativo de Blob/URL
      }
    }

    this.showToast(this.i18n.t('invoices.toast_csv_exported'));
  }

  isPickupOrder(order: Order): boolean {
    return order.fulfillment === 'pickup' || order.status === 'listo_recogida';
  }

  isReadyForPickup(order: Order): boolean {
    return order.status === 'listo_recogida';
  }

  getPickupPin(order: Order): string {
    const digits = (order.reference || '').replace(/\D/g, '');
    return digits ? digits.slice(-4).padStart(4, '0') : '1930';
  }

  getStoreTodayHours(): { open: boolean; hours: string; dayName: string } {
    const day = new Date().getDay();
    const isCa = this.i18n.currentLang() === 'ca';
    const dayNamesEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayNamesCa = [
      'Diumenge',
      'Dilluns',
      'Dimarts',
      'Dimecres',
      'Dijous',
      'Divendres',
      'Dissabte',
    ];
    const dayName = isCa ? dayNamesCa[day] : dayNamesEs[day];

    if (day === 0) {
      return {
        open: false,
        hours: isCa ? 'Tancat (descans setmanal)' : 'Cerrado (descanso semanal)',
        dayName,
      };
    }
    if (day === 6) {
      return {
        open: true,
        hours: '08:30 - 14:30',
        dayName,
      };
    }
    return {
      open: true,
      hours: '08:30 - 14:00 · 17:00 - 20:30',
      dayName,
    };
  }

  async copyPickupCode(code: string): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
    } catch {
      // Fallback
    }
    this.showToast(this.i18n.t('pickup.toast_copied'));
  }

  getWhatsAppOnMyWayUrl(order: Order): string {
    const isCa = this.i18n.currentLang() === 'ca';
    const customerName = order.customer?.name || 'Cliente';
    const ref = order.reference || 'Comanda';
    const text = isCa
      ? `Hola Cal Sardà! Sóc en/la ${customerName}. Ja vinc de camí a recollir el meu encàrrec ${ref}.`
      : `Hola Cal Sardà! Soy ${customerName}. Voy de camino a recoger mi encargo ${ref}.`;
    return `https://wa.me/34932325508?text=${encodeURIComponent(text)}`;
  }

  getOrderStep(status?: OrderStatus): number {
    if (!status) return 1;
    switch (status) {
      case 'recibido':
      case 'pending':
      case 'confirmed':
        return 1;
      case 'en_preparacion':
        return 2;
      case 'listo_recogida':
      case 'enviado':
        return 3;
      case 'entregado':
        return 4;
      case 'cancelado':
      default:
        return 0;
    }
  }

  showToast(text: string): void {
    this.toastMessage.set(text);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) return '0,00 €';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  async signIn(form: NgForm): Promise<void> {
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.recoveryNotice = false;
    this.recoverySuccess = false;

    const result = await this.auth.signIn({
      email: this.email,
      password: this.password,
    });

    if (result.success) {
      this.loginDemoCompleted = true;
      form.resetForm();
      this.email = '';
      this.password = '';
    } else {
      this.errorMessage = result.error || 'Error al iniciar sesión.';
    }
  }

  async quickSignIn(email: string, password: string, form?: NgForm): Promise<void> {
    this.email = email;
    this.password = password;
    this.errorMessage = '';
    this.recoveryNotice = false;

    const result = await this.auth.signIn({ email, password });
    if (result.success) {
      this.loginDemoCompleted = true;
      if (form) {
        form.resetForm();
      }
      this.email = '';
      this.password = '';
    } else {
      this.errorMessage = result.error || 'Error al iniciar sesión.';
    }
  }

  async requestPasswordReset(): Promise<void> {
    const targetEmail = this.email.trim();
    if (!targetEmail) {
      this.recoveryNotice = true;
      this.recoverySuccess = false;
      this.errorMessage =
        this.i18n.currentLang() === 'ca'
          ? 'Introdueix primer el teu correu electrònic per sol·licitar el restabliment.'
          : 'Introduce primero tu correo electrónico para solicitar el restablecimiento.';
      return;
    }

    this.errorMessage = '';
    const result = await this.auth.resetPassword(targetEmail);
    this.recoveryNotice = true;
    this.recoverySuccess = result.success;

    if (!result.success) {
      this.errorMessage = result.error || 'No se ha podido enviar el correo de recuperación.';
    }
  }

  async returnToLogin(): Promise<void> {
    this.loginDemoCompleted = false;
    this.recoveryNotice = false;
    this.recoverySuccess = false;
    this.errorMessage = '';
    await this.auth.signOut();
  }
}
