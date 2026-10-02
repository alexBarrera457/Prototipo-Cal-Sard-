import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductDetail } from '../../components/product-detail/product-detail';
import { Store } from '../../components/store/store';
import { StoreProduct, storeProducts } from '../../services/products';

@Component({
  selector: 'app-shop-page',
  imports: [ProductDetail, RouterLink, Store],
  templateUrl: './shop-page.html',
  styleUrl: './shop-page.css'
})
export class ShopPage {
  selectedProduct: StoreProduct | null = null;
  searchTerm = '';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.searchTerm = params.get('buscar') ?? '';
        const productNumber = params.get('producto');
        this.selectedProduct = productNumber
          ? storeProducts.find((product) => product.number === productNumber) ?? null
          : null;
      });
  }

  showProduct(product: StoreProduct): void {
    this.selectedProduct = product;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { producto: product.number },
      queryParamsHandling: 'merge'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  hideProduct(): void {
    this.selectedProduct = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { producto: null },
      queryParamsHandling: 'merge'
    });
  }

  clearSearch(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { buscar: null, producto: null },
      queryParamsHandling: 'merge'
    });
  }
}
