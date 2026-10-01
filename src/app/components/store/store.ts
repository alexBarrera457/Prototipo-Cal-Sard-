import { Component, EventEmitter, Output } from '@angular/core';
import { CartService } from '../../services/cart';
import { StoreProduct, storeProducts } from '../../services/products';

@Component({
  selector: 'app-store',
  imports: [],
  templateUrl: './store.html',
  styleUrl: './store.css'
})
export class Store {

  products = storeProducts;

  @Output() productSelected = new EventEmitter<StoreProduct>();

  constructor(private cartService: CartService) {}

  addToCart(product: StoreProduct): void {
    this.cartService.addToCart(product.name, product.price);
  }

  showProduct(product: StoreProduct): void {
    this.productSelected.emit(product);
  }

}