import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductDetail } from '../../components/product-detail/product-detail';
import { Store } from '../../components/store/store';
import { ProductsService, StoreProduct } from '../../services/products';

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
      this.selectedProduct.set(null);

      if (productNumber) {
        void this.productsService.getProductByNumber(productNumber).then((product) => {
          if (request === this.productRequest) {
            this.selectedProduct.set(product);
          }
        });
      }
    });
  }

  showProduct(product: StoreProduct): void {
    this.selectedProduct.set(product);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { producto: product.number },
      queryParamsHandling: 'merge',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  hideProduct(): void {
    this.selectedProduct.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { producto: null },
      queryParamsHandling: 'merge',
    });
  }

  clearSearch(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { buscar: null, producto: null },
      queryParamsHandling: 'merge',
    });
  }
}
