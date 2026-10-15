import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CartService } from '../../services/cart';
import { I18nService } from '../../services/i18n';
import {
  isGlutenFree,
  isLactoseFree,
  ProductsService,
  StoreProduct,
} from '../../services/products';

@Component({
  selector: 'app-product-detail',
  imports: [NgOptimizedImage],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnChanges {
  public readonly i18n = inject(I18nService);

  get isGlutenFree(): boolean {
    return isGlutenFree(this.product);
  }

  get isLactoseFree(): boolean {
    return isLactoseFree(this.product);
  }

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
    this.cartService.addToCart(
      this.product.name,
      this.product.price,
      this.quantity,
      this.product.number,
      this.product.image,
    );

    const unitLabel =
      this.quantity === 1
        ? this.i18n.t('product.added_single')
        : this.i18n.t('product.added_multiple');
    this.addedToCartMessage = `${this.quantity} ${unitLabel}`;
  }

  goBack(): void {
    this.backToStore.emit();
  }
}
