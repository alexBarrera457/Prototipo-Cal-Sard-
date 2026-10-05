import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CartService } from '../../services/cart';
import { ProductsService, StoreProduct } from '../../services/products';

@Component({
  selector: 'app-product-detail',
  imports: [],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnChanges {
  @Input() product: StoreProduct = {
    name: '',
    category: '',
    description: '',
    price: 0,
    number: '',
    image: '',
    shortDescription: '',
  };

  @Output() backToStore = new EventEmitter<void>();

  activeImageIndex = 0;
  quantity = 1;
  addedToCartMessage = '';

  constructor(
    private cartService: CartService,
    private productsService: ProductsService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product']) {
      this.activeImageIndex = 0;
    }
  }

  get galleryImages(): string[] {
    return this.product.images?.length ? this.product.images : [this.product.image];
  }

  get activeImage(): string {
    return this.galleryImages[this.activeImageIndex] ?? this.product.image;
  }

  selectImage(index: number): void {
    if (index >= 0 && index < this.galleryImages.length) {
      this.activeImageIndex = index;
    }
  }

  showPreviousImage(): void {
    this.activeImageIndex =
      (this.activeImageIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
  }

  showNextImage(): void {
    this.activeImageIndex = (this.activeImageIndex + 1) % this.galleryImages.length;
  }

  formatPrice(): string {
    return this.product.priceLabel ?? this.productsService.formatPrice(this.product.price);
  }

  hideUnavailableProductImage(event: Event): void {
    (event.currentTarget as HTMLImageElement).hidden = true;
  }

  increaseQuantity(): void {
    this.quantity++;
    this.addedToCartMessage = '';
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
      this.addedToCartMessage = '';
    }
  }

  addToCart(): void {
    for (let i = 0; i < this.quantity; i++) {
      this.cartService.addToCart(this.product.name, this.product.price);
    }

    const unitLabel = this.quantity === 1 ? 'unidad añadida' : 'unidades añadidas';
    this.addedToCartMessage = `${this.quantity} ${unitLabel} al carrito.`;
  }

  goBack(): void {
    this.backToStore.emit();
  }
}
