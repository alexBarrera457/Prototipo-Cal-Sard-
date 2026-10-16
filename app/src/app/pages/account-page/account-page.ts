import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, type UserAddress, type FiscalData } from '../../services/auth';
import { I18nService } from '../../services/i18n';
import { OrdersService, type Order, type OrderStatus } from '../../services/orders';
import { CartService } from '../../services/cart';
import { InvoicingService } from '../../services/invoicing';

export type AccountTab = 'perfil' | 'direcciones' | 'pedidos';

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

  // Formulario de inicio de sesión
  email = '';
  password = '';
  showPassword = false;
  loginDemoCompleted = false;
  recoveryNotice = false;
  recoverySuccess = false;
  errorMessage = '';

  constructor() {
    // Al cambiar el usuario autenticado, recargar sus pedidos
    effect(() => {
      const user = this.auth.currentUser();
      if (user?.email) {
        void this.loadCustomerOrders(user.email);
      } else {
        this.customerOrders.set([]);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (user?.email) {
      await this.loadCustomerOrders(user.email);
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
   * Genera y abre el diálogo de impresión/descarga de factura simplificada en PDF.
   */
  downloadInvoice(order: Order): void {
    const invoice = this.invoicingService.generateInvoice(order);
    this.invoicingService.printInvoice(invoice);
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
