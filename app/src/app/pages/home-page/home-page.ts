import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Hero } from '../../components/hero/hero';
import { I18nService } from '../../services/i18n';
import { SeoService } from '../../services/seo';
import { ProductsService, type StoreProduct } from '../../services/products';
import { CartService } from '../../services/cart';

type HomeCategory = {
  label: string;
  title: string;
  search: string;
  image: string;
  alt: string;
};

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, Hero, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit {
  public readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  public readonly productsService = inject(ProductsService);
  public readonly cartService = inject(CartService);

  readonly featuredProducts = signal<StoreProduct[]>([]);
  readonly isLoadingFeatured = signal<boolean>(true);
  readonly toastMessage = signal<string | null>(null);

  readonly categories: HomeCategory[] = [
    {
      label: 'Café de siempre',
      title: 'Café Sardà',
      search: 'CAFÉ GOURMET',
      image: '/images/products/cafe.jpg',
      alt: 'Café Sardà seleccionado en la tienda',
    },
    {
      label: 'Para abrir el apetito',
      title: 'Conservas del mar',
      search: 'CONSERVAS DE MAR',
      image: '/images/products/conservas.png',
      alt: 'Conservas gourmet del mar',
    },
    {
      label: 'A granel',
      title: 'Frutos secos',
      search: 'FRUTOS SECOS',
      image: '/images/products/frutos-secos.jpg',
      alt: 'Selección de frutos secos a granel',
    },
    {
      label: 'Para compartir',
      title: 'Dulces y turrones',
      search: 'DULCES DE FIESTAS',
      image: '/images/products/dulces-navidad.jpg',
      alt: 'Dulces tradicionales y turrones',
    },
  ];

  constructor() {
    this.seo.setMeta({
      title: 'Cal Sardà | Productos de siempre desde 1930',
      description:
        'Desde 1930, Cal Sardà selecciona productos gourmet, dulces tradicionales, conservas y frutos secos en el barrio de la Sagrada Familia, Barcelona.',
      url: '/',
      image: '/images/products/cafe.jpg',
      type: 'website',
    });
    this.seo.setLocalBusinessSchema();

    this.destroyRef.onDestroy(() => {
      this.seo.removeJsonLd('local-business');
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadFeatured();
  }

  async loadFeatured(): Promise<void> {
    this.isLoadingFeatured.set(true);
    try {
      const items = await this.productsService.getFeaturedProducts();
      this.featuredProducts.set(items);
    } catch {
      this.featuredProducts.set([]);
    } finally {
      this.isLoadingFeatured.set(false);
    }
  }

  addToCart(product: StoreProduct, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.cartService.addToCart(product.name, product.price, 1, product.number, product.image);
    const addedText =
      this.i18n.currentLang() === 'ca'
        ? `${product.name} afegit a la cistella!`
        : `¡${product.name} añadido a la cesta!`;
    this.showToast(addedText);
  }

  showToast(text: string): void {
    this.toastMessage.set(text);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3200);
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) return '0,00 €';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }
}
