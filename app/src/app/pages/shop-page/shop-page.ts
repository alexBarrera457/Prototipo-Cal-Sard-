import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductDetail } from '../../components/product-detail/product-detail';
import { Store } from '../../components/store/store';
import { getProductSlug, ProductsService, StoreProduct } from '../../services/products';

@Component({
  selector: 'app-shop-page',
  imports: [ProductDetail, RouterLink, Store],
  templateUrl: './shop-page.html',
  styleUrl: './shop-page.css',
})
export class ShopPage {
  selectedProduct = signal<StoreProduct | null>(null);
  searchTerm = '';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productsService = inject(ProductsService);
  private productRequest = 0;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.searchTerm = params.get('buscar') ?? '';
      const productNumber = params.get('producto');
      const request = ++this.productRequest;

      if (productNumber) {
        void this.productsService.getProductByNumber(productNumber).then((product) => {
          if (request === this.productRequest && product) {
            void this.router.navigate(['/tienda-online/producto', getProductSlug(product)], {
              replaceUrl: true,
            });
          }
        });
      }
    });
  }

  showProduct(product: StoreProduct): void {
    void this.router.navigate(['/tienda-online/producto', getProductSlug(product)]);
  }

  hideProduct(): void {
    this.selectedProduct.set(null);
    void this.router.navigate(['/tienda-online']);
  }

  clearSearch(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { buscar: null, producto: null },
      queryParamsHandling: 'merge',
    });
  }
}
