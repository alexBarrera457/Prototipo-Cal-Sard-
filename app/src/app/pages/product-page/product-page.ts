import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductDetail } from '../../components/product-detail/product-detail';
import { getProductSlug, ProductsService, StoreProduct } from '../../services/products';
import { I18nService } from '../../services/i18n';
import { SeoService } from '../../services/seo';
import { CartService } from '../../services/cart';

@Component({
  selector: 'app-product-page',
  imports: [ProductDetail, RouterLink],
  templateUrl: './product-page.html',
  styleUrl: './product-page.css',
})
export class ProductPage {
  readonly product = signal<StoreProduct | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly recommendedPairings = signal<StoreProduct[]>([]);
  readonly pairingToast = signal<string | null>(null);

  public readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  public readonly productsService = inject(ProductsService);
  public readonly cartService = inject(CartService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private requestIndex = 0;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.seo.removeJsonLd('product');
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      const request = ++this.requestIndex;

      if (!slug) {
        this.loading.set(false);
        this.notFound.set(true);
        this.updateMetaForNotFound();
        return;
      }

      this.loading.set(true);
      this.notFound.set(false);

      void this.productsService.getProductBySlugOrNumber(slug).then((product) => {
        if (request !== this.requestIndex) {
          return;
        }

        this.loading.set(false);
        if (product) {
          this.product.set(product);
          this.updateMetaForProduct(product);
          void this.loadPairings(product);
        } else {
          this.notFound.set(true);
          this.product.set(null);
          this.recommendedPairings.set([]);
          this.updateMetaForNotFound();
        }
      });
    });
  }

  async loadPairings(product: StoreProduct): Promise<void> {
    try {
      const pairings = await this.productsService.getPairingsForProduct(product);
      this.recommendedPairings.set(pairings);
    } catch {
      this.recommendedPairings.set([]);
    }
  }

  addPairingToCart(item: StoreProduct): void {
    this.cartService.addToCart(item.name, item.price, 1, item.number, item.image);
    const msg =
      this.i18n.currentLang() === 'ca'
        ? `${item.name} afegit a la cistella!`
        : `¡${item.name} añadido a la cesta!`;
    this.showToast(msg);
  }

  showToast(text: string): void {
    this.pairingToast.set(text);
    setTimeout(() => {
      this.pairingToast.set(null);
    }, 3200);
  }

  formatPrice(price: number): string {
    return this.productsService.formatPrice(price);
  }

  backToStore(): void {
    void this.router.navigate(['/tienda-online']);
  }

  private updateMetaForProduct(product: StoreProduct): void {
    const slug = getProductSlug(product);
    const description = product.shortDescription || product.description;

    this.seo.setMeta({
      title: product.name,
      description,
      image: product.image,
      url: `/tienda-online/producto/${slug}`,
      type: 'product',
    });
    this.seo.setProductSchema(product);
  }

  private updateMetaForNotFound(): void {
    this.seo.removeJsonLd('product');
    this.seo.setMeta({
      title: 'Producto no encontrado | Cal Sardà',
      description:
        'El producto solicitado no existe o no está disponible en la tienda de Cal Sardà.',
    });
  }
}
