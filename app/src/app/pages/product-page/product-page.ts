import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductDetail } from '../../components/product-detail/product-detail';
import { ProductsService, StoreProduct } from '../../services/products';

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

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private requestIndex = 0;

  constructor() {
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
        } else {
          this.notFound.set(true);
          this.product.set(null);
          this.updateMetaForNotFound();
        }
      });
    });
  }

  backToStore(): void {
    void this.router.navigate(['/tienda-online']);
  }

  private updateMetaForProduct(product: StoreProduct): void {
    const pageTitle = `${product.name} | Cal Sardà`;
    this.title.setTitle(pageTitle);

    const description = product.shortDescription || product.description;
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: product.image });
    this.meta.updateTag({ property: 'og:type', content: 'product' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: product.image });
  }

  private updateMetaForNotFound(): void {
    this.title.setTitle('Producto no encontrado | Cal Sardà');
    this.meta.updateTag({
      name: 'description',
      content: 'El producto solicitado no existe o no está disponible en la tienda de Cal Sardà.',
    });
  }
}
