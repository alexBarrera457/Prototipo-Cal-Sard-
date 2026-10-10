import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { SeoService } from './seo';
import type { StoreProduct } from './products';

describe('SeoService', () => {
  let service: SeoService;
  let meta: Meta;
  let title: Title;
  let doc: Document;

  const mockProduct: StoreProduct = {
    number: '01',
    name: 'Café 100% Robusta',
    category: 'CAFÉ GOURMET',
    description: 'Cafè Sardà variedad Robusta (250 g)',
    shortDescription: '5,25 € (250 g)',
    price: 5.25,
    image: '/images/products/catalog/cafe-robusta.jpg',
    images: ['/images/products/catalog/cafe-robusta.jpg'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoService, Meta, Title],
    });
    service = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
    title = TestBed.inject(Title);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    service.removeJsonLd('local-business');
    service.removeJsonLd('product');
    service.removeJsonLd('test-custom');
  });

  it('sets canonical title, meta description, Open Graph and Twitter Card tags', () => {
    service.setMeta({
      title: 'Historia familiar',
      description: 'Más de 90 años de historia.',
      url: '/historia',
      image: '/images/history.jpg',
      type: 'article',
    });

    expect(title.getTitle()).toBe('Historia familiar | Cal Sardà');
    expect(meta.getTag("name='description'")?.content).toBe('Más de 90 años de historia.');
    expect(meta.getTag("property='og:title'")?.content).toBe('Historia familiar | Cal Sardà');
    expect(meta.getTag("property='og:type'")?.content).toBe('article');
    expect(meta.getTag("property='og:url'")?.content).toBe('https://calsarda.com/historia');
    expect(meta.getTag("property='og:image'")?.content).toBe(
      'https://calsarda.com/images/history.jpg',
    );
    expect(meta.getTag("name='twitter:card'")?.content).toBe('summary_large_image');
    expect(meta.getTag("name='twitter:title'")?.content).toBe('Historia familiar | Cal Sardà');
  });

  it('injects LocalBusiness Store schema into document head', () => {
    service.setLocalBusinessSchema();

    const script = doc.getElementById('jsonld-local-business') as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.type).toBe('application/ld+json');

    const data = JSON.parse(script?.textContent || '{}');
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('Store');
    expect(data.name).toBe('Cal Sardà');
    expect(data.telephone).toBe('+34932325508');
    expect(data.address.streetAddress).toBe('Calle Marina, 237');
    expect(data.address.postalCode).toBe('08013');
    expect(data.geo.latitude).toBe(41.403612);
  });

  it('injects and removes Product schema with offers and ratings', () => {
    service.setProductSchema(mockProduct);

    let script = doc.getElementById('jsonld-product') as HTMLScriptElement | null;
    expect(script).not.toBeNull();

    const data = JSON.parse(script?.textContent || '{}');
    expect(data['@type']).toBe('Product');
    expect(data.name).toBe('Café 100% Robusta');
    expect(data.offers.price).toBe('5.25');
    expect(data.offers.priceCurrency).toBe('EUR');
    expect(data.offers.availability).toBe('https://schema.org/InStock');
    expect(data.aggregateRating.ratingValue).toBe('4.9');

    service.removeJsonLd('product');
    script = doc.getElementById('jsonld-product') as HTMLScriptElement | null;
    expect(script).toBeNull();
  });
});
