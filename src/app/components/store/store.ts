import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart';
import { searchStoreProducts, StoreProduct, storeProducts } from '../../services/products';

@Component({
  selector: 'app-store',
  imports: [RouterLink],
  templateUrl: './store.html',
  styleUrl: './store.css'
})
export class Store {

  products = storeProducts;
  @Input() searchTerm = '';

  @Output() productSelected = new EventEmitter<StoreProduct>();

  constructor(private cartService: CartService) {}

  get filteredProducts(): StoreProduct[] {
    return this.searchTerm.trim() ? searchStoreProducts(this.searchTerm) : this.products;
  }

  addToCart(product: StoreProduct): void {
    this.cartService.addToCart(product.name, product.price);
  }

  showProduct(product: StoreProduct): void {
    this.productSelected.emit(product);
  }

}
