import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import type { StoreProduct } from './products';
import { getProductSlug } from './products';

export interface SeoMetaConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image';
}

export const DEFAULT_SEO_CONFIG = {
  baseUrl: 'https://calsarda.com',
  siteName: 'Cal Sardà',
  title: 'Cal Sardà | Productos de siempre desde 1930',
  description:
    'Desde 1930, Cal Sardà selecciona productos gourmet, turrones, vinos, chocolates, conservas y frutos secos en el corazón de Barcelona.',
  image: 'https://calsarda.com/images/products/cafe.jpg',
};

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  /**
   * Configura las etiquetas meta canónicas, Open Graph y Twitter Cards.
   */
  setMeta(config: SeoMetaConfig = {}): void {
    const fullTitle = config.title
      ? config.title.includes('Cal Sardà')
        ? config.title
        : `${config.title} | Cal Sardà`
      : DEFAULT_SEO_CONFIG.title;

    const description = config.description || DEFAULT_SEO_CONFIG.description;
    const url = config.url
      ? config.url.startsWith('http')
        ? config.url
        : `${DEFAULT_SEO_CONFIG.baseUrl}${config.url.startsWith('/') ? '' : '/'}${config.url}`
      : DEFAULT_SEO_CONFIG.baseUrl;

    let image = config.image || DEFAULT_SEO_CONFIG.image;
    if (!image.startsWith('http')) {
      image = `${DEFAULT_SEO_CONFIG.baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
    }

    const type = config.type || 'website';
    const card = config.twitterCard || 'summary_large_image';

    // HTML Title
    this.title.setTitle(fullTitle);

    // Standard Meta
    this.meta.updateTag({ name: 'description', content: description });

    // Open Graph
    this.meta.updateTag({ property: 'og:site_name', content: DEFAULT_SEO_CONFIG.siteName });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });

    // Twitter Cards
    this.meta.updateTag({ name: 'twitter:card', content: card });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  /**
   * Inyecta o actualiza un bloque JSON-LD estructurado de schema.org en el <head>.
   */
  setJsonLd(id: string, schema: Record<string, unknown>): void {
    if (!this.document?.head) {
      return;
    }
    const scriptId = `jsonld-${id}`;
    let script = this.document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema, null, 2);
  }

  /**
   * Elimina un bloque JSON-LD por su identificador.
   */
  removeJsonLd(id: string): void {
    if (!this.document) {
      return;
    }
    const scriptId = `jsonld-${id}`;
    const script = this.document.getElementById(scriptId);
    if (script) {
      if (typeof script.remove === 'function') {
        script.remove();
      } else if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
  }

  /**
   * Inyecta los datos estructurados de schema.org tipo LocalBusiness / Store para la tienda física.
   */
  setLocalBusinessSchema(): void {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'Cal Sardà',
      alternateName: 'Cal Sarda Barcelona',
      description: 'Comercio tradicional y productos gourmet desde 1930 en Barcelona.',
      image: `${DEFAULT_SEO_CONFIG.baseUrl}/images/products/cafe.jpg`,
      '@id': `${DEFAULT_SEO_CONFIG.baseUrl}/#store`,
      url: DEFAULT_SEO_CONFIG.baseUrl,
      telephone: '+34932325508',
      email: 'sarda@calsarda.com',
      priceRange: '€€',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Calle Marina, 237',
        addressLocality: 'Barcelona',
        postalCode: '08013',
        addressRegion: 'Barcelona',
        addressCountry: 'ES',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 41.403612,
        longitude: 2.174351,
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:30',
          closes: '14:30',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '16:30',
          closes: '20:30',
        },
      ],
      hasMap: 'https://maps.google.com/?q=Carrer+de+Marina,+237,+08013+Barcelona',
    };

    this.setJsonLd('local-business', schema);
  }

  /**
   * Inyecta los datos estructurados de schema.org tipo Product para una ficha de producto.
   */
  setProductSchema(product: StoreProduct, canonicalUrl?: string): void {
    const url =
      canonicalUrl ??
      `${DEFAULT_SEO_CONFIG.baseUrl}/tienda-online/producto/${getProductSlug(product)}`;
    let imageUrl = product.image;
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${DEFAULT_SEO_CONFIG.baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: [imageUrl],
      description: product.shortDescription || product.description,
      sku: product.number,
      category: product.category,
      brand: {
        '@type': 'Brand',
        name: 'Cal Sardà',
      },
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'EUR',
        price: product.price.toFixed(2),
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: 'Cal Sardà',
        },
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '24',
        bestRating: '5',
        worstRating: '1',
      },
    };

    this.setJsonLd('product', schema);
  }
}
