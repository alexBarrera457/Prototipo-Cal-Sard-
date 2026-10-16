import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CustomersService,
  type CustomerRecord,
  type CustomerType,
} from '../../../services/customers';
import { I18nService } from '../../../services/i18n';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin-customers.html',
  styleUrl: './admin-customers.css',
})
export class AdminCustomers {
  readonly customersService = inject(CustomersService);
  readonly i18n = inject(I18nService);

  readonly searchQuery = signal<string>('');
  searchQueryModel = '';
  readonly recurrenceFilter = signal<'todos' | 'recurrentes' | 'esporadicos'>('todos');
  readonly typeFilter = signal<'todos' | 'particular' | 'empresa' | 'hosteleria'>('todos');

  readonly selectedCustomer = signal<CustomerRecord | null>(null);
  readonly toastMessage = signal<string | null>(null);

  notesDraft = '';
  typeDraft: CustomerType = 'particular';

  readonly filteredCustomers = computed(() => {
    const list = this.customersService.customers();
    const query = this.searchQuery().trim().toLowerCase();
    const recFilter = this.recurrenceFilter();
    const tFilter = this.typeFilter();

    return list.filter((c) => {
      // 1. Filtro recurrente vs esporádico
      if (recFilter === 'recurrentes' && !c.isRecurrent) return false;
      if (recFilter === 'esporadicos' && c.isRecurrent) return false;

      // 2. Filtro por tipo
      if (tFilter !== 'todos' && c.type !== tFilter) return false;

      // 3. Buscador por nombre, email o teléfono
      if (query) {
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesEmail = c.email.toLowerCase().includes(query);
        const matchesPhone = c.phone.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }

      return true;
    });
  });

  readonly totalCustomersCount = computed(() => this.customersService.customers().length);

  readonly recurrentCustomersCount = computed(
    () => this.customersService.customers().filter((c) => c.isRecurrent).length,
  );

  readonly totalRevenueLTV = computed(() =>
    this.customersService.customers().reduce((sum, c) => sum + c.totalSpent, 0),
  );

  readonly averageLTV = computed(() => {
    const total = this.totalCustomersCount();
    if (total === 0) return 0;
    return Math.round((this.totalRevenueLTV() / total) * 100) / 100;
  });

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }

  clearSearch(): void {
    this.searchQueryModel = '';
    this.searchQuery.set('');
  }

  setRecurrenceFilter(val: 'todos' | 'recurrentes' | 'esporadicos'): void {
    this.recurrenceFilter.set(val);
  }

  setTypeFilter(val: 'todos' | 'particular' | 'empresa' | 'hosteleria'): void {
    this.typeFilter.set(val);
  }

  openCustomerDetail(customer: CustomerRecord): void {
    this.selectedCustomer.set(customer);
    this.notesDraft = customer.internalNotes || '';
    this.typeDraft = customer.type || 'particular';
  }

  closeCustomerDetail(): void {
    this.selectedCustomer.set(null);
  }

  saveCustomerChanges(): void {
    const current = this.selectedCustomer();
    if (!current) return;

    this.customersService.updateInternalNotes(current.email, this.notesDraft);
    this.customersService.updateCustomerType(current.email, this.typeDraft);

    // Actualizar vista del modal
    const updated = this.customersService.getCustomerByEmail(current.email);
    if (updated) {
      this.selectedCustomer.set(updated);
    }

    this.showToast(`Ficha de cliente de ${current.name} actualizada.`);
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 3000);
  }

  getTypeLabel(type: CustomerType): string {
    switch (type) {
      case 'empresa':
        return '🏢 Empresa';
      case 'hosteleria':
        return '🍽️ Hostelería';
      case 'particular':
      default:
        return '👤 Particular';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'entregado':
        return 'badge-status-delivered';
      case 'enviado':
      case 'listo_recogida':
        return 'badge-status-ready';
      case 'en_preparacion':
        return 'badge-status-prep';
      case 'cancelado':
        return 'badge-status-cancel';
      default:
        return 'badge-status-pending';
    }
  }
}
