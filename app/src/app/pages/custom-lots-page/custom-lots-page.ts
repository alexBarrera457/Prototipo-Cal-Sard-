import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductsService, type StoreProduct } from '../../services/products';
import { CartService } from '../../services/cart';
import { I18nService } from '../../services/i18n';
import type { CustomLotDefinition, CustomLotItem } from '@cal-sarda/domain';

export interface LotPackagingOption {
  id: string;
  name: string;
  nameCa: string;
  price: number;
  description: string;
  descriptionCa: string;
  icon: string;
  image: string;
}

export const LOT_PACKAGING_OPTIONS: LotPackagingOption[] = [
  {
    id: 'caja-madera',
    name: 'Caja de madera serigrafiada Cal Sardà',
    nameCa: 'Caixa de fusta serigrafiada Cal Sardà',
    price: 8.5,
    description: 'Elegante caja de pino macizo con grabado del logotipo tradicional de 1930.',
    descriptionCa: 'Elegent caixa de pi massís amb gravat del logotip tradicional de 1930.',
    icon: '🪵',
    image: '/images/gift-lots/caja-lote-llenala-con-lo-que-quieras.jpg',
  },
  {
    id: 'cesta-mimbre',
    name: 'Cesta de mimbre tradicional',
    nameCa: 'Cistella de vímet tradicional',
    price: 12.0,
    description: 'Cesta artesana tejida a mano con asas de cuero y base acolchada.',
    descriptionCa: 'Cistella artesana teixida a mà amb nanses de cuir i base encoixinada.',
    icon: '🧺',
    image: '/images/gift-lots/lote-gourmet-tradicional.jpg',
  },
  {
    id: 'estuche-kraft',
    name: 'Estuche de cartón kraft sostenible',
    nameCa: 'Estoig de cartró kraft sostenible',
    price: 4.5,
    description: 'Presentación ecológica y reciclable con lazo de rafia natural.',
    descriptionCa: 'Presentació ecològica i reciclable amb llaç de ràfia natural.',
    icon: '📦',
    image: '/images/gift-lots/lote-de-productos-catalanes-artesanos.jpg',
  },
];

@Component({
  selector: 'app-custom-lots-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './custom-lots-page.html',
  styleUrl: './custom-lots-page.css',
})
export class CustomLotsPage implements OnInit {
  readonly productsService = inject(ProductsService);
  readonly cartService = inject(CartService);
  readonly i18n = inject(I18nService);
  readonly router = inject(Router);

  readonly currentStep = signal<number>(1);
  readonly packagingOptions = LOT_PACKAGING_OPTIONS;
  readonly selectedPackagingId = signal<string>('caja-madera');

  readonly catalog = signal<StoreProduct[]>([]);
  readonly activeSection = signal<string>('todas');
  readonly lotItems = signal<Record<string, number>>({});

  readonly senderName = signal<string>('');
  readonly recipientName = signal<string>('');
  readonly dedication = signal<string>('');
  readonly toastMessage = signal<string | null>(null);

  readonly selectedPackaging = computed(() => {
    const id = this.selectedPackagingId();
    return this.packagingOptions.find((p) => p.id === id) ?? this.packagingOptions[0];
  });

  readonly filteredProducts = computed(() => {
    const all = this.catalog();
    const section = this.activeSection();
    return all.filter((prod) => this.matchesSection(prod, section));
  });

  readonly selectedLotItemsList = computed<Array<{ product: StoreProduct; quantity: number }>>(
    () => {
      const itemsMap = this.lotItems();
      const all = this.catalog();
      const result: Array<{ product: StoreProduct; quantity: number }> = [];

      for (const [key, qty] of Object.entries(itemsMap)) {
        if (qty > 0) {
          const prod = all.find((p) => p.number === key || p.name === key);
          if (prod) {
            result.push({ product: prod, quantity: qty });
          }
        }
      }
      return result;
    },
  );

  readonly itemsCount = computed(() => {
    return Object.values(this.lotItems()).reduce((acc, qty) => acc + qty, 0);
  });

  readonly itemsPrice = computed(() => {
    const list = this.selectedLotItemsList();
    return list.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  });

  readonly totalPrice = computed(() => {
    const pkg = this.selectedPackaging();
    const pkgPrice = pkg ? pkg.price : 0;
    return Math.round((pkgPrice + this.itemsPrice()) * 100) / 100;
  });

  async ngOnInit(): Promise<void> {
    const products = await this.productsService.getProducts();
    // Filtramos productos que tengan precio válido y estén disponibles
    this.catalog.set(products.filter((p) => p.price > 0 && p.inStock !== false));
  }

  selectPackaging(id: string): void {
    this.selectedPackagingId.set(id);
  }

  setSection(section: string): void {
    this.activeSection.set(section);
  }

  getItemQuantity(prod: StoreProduct): number {
    const key = prod.number || prod.name;
    return this.lotItems()[key] || 0;
  }

  addProduct(prod: StoreProduct): void {
    const key = prod.number || prod.name;
    const current = this.getItemQuantity(prod);
    this.lotItems.update((map) => ({
      ...map,
      [key]: current + 1,
    }));
  }

  removeProduct(prod: StoreProduct): void {
    const key = prod.number || prod.name;
    const current = this.getItemQuantity(prod);
    if (current <= 1) {
      this.lotItems.update((map) => {
        const copy = { ...map };
        delete copy[key];
        return copy;
      });
    } else {
      this.lotItems.update((map) => ({
        ...map,
        [key]: current - 1,
      }));
    }
  }

  goToStep(step: number): void {
    if (step === 2 && !this.selectedPackaging()) return;
    if (step === 3 && this.itemsCount() === 0) return;
    this.currentStep.set(step);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  showToast(text: string): void {
    this.toastMessage.set(text);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  matchesSection(prod: StoreProduct, section: string): boolean {
    if (section === 'todas') return true;
    const name = prod.name.toLowerCase();
    const cat = (prod.category || '').toUpperCase();

    if (section === 'embutidos') {
      return (
        cat === 'EMBUTIDOS' ||
        name.includes('jamón') ||
        name.includes('pernil') ||
        name.includes('lomo') ||
        name.includes('llom') ||
        name.includes('secallona') ||
        name.includes('fuet') ||
        name.includes('xoriço') ||
        name.includes('chorizo') ||
        name.includes('botifarra')
      );
    }
    if (section === 'quesos') {
      return name.includes('formatge') || name.includes('queso');
    }
    if (section === 'conservas') {
      return (
        cat === 'CONSERVAS DE MAR' ||
        cat === 'VÍVERES GOURMET' ||
        name.includes('aceite') ||
        name.includes('oli') ||
        name.includes('ventresca') ||
        name.includes('bonito') ||
        name.includes('anxov') ||
        name.includes('espinaler')
      );
    }
    if (section === 'bodega') {
      return (
        cat === 'BODEGA GOURMET' ||
        name.includes('vino') ||
        name.includes('vi ') ||
        name.includes('cava') ||
        name.includes('vermut')
      );
    }
    if (section === 'dulces') {
      return (
        cat === 'DULCES DE FIESTAS' ||
        cat === 'CHOCOLATE GOURMET' ||
        cat === 'GALLETAS Y PASTAS' ||
        name.includes('turrón') ||
        name.includes('torró') ||
        name.includes('chocolate') ||
        name.includes('xocolata') ||
        name.includes('polvor') ||
        name.includes('neules') ||
        name.includes('ametll')
      );
    }
    return true;
  }

  addCustomLotToCart(): void {
    const pkg = this.selectedPackaging();
    const isCa = this.i18n.currentLang() === 'ca';
    const pkgName = isCa ? pkg.nameCa : pkg.name;

    const items: CustomLotItem[] = this.selectedLotItemsList().map((it) => ({
      name: it.product.name,
      price: it.product.price,
      quantity: it.quantity,
    }));

    const customLot: CustomLotDefinition = {
      packagingName: pkgName,
      packagingPrice: pkg.price,
      items,
      dedication: this.dedication().trim() || undefined,
      senderName: this.senderName().trim() || undefined,
      recipientName: this.recipientName().trim() || undefined,
    };

    const lotName = isCa
      ? `Lot a mida Cal Sardà (${pkgName})`
      : `Lote a medida Cal Sardà (${pkgName})`;

    this.cartService.addToCart(lotName, this.totalPrice(), 1, 'CUSTOM-LOT', pkg.image, customLot);

    this.showToast(this.i18n.t('custom_lots.added_toast'));
    this.router.navigate(['/preparar-pedido']);
  }
}
