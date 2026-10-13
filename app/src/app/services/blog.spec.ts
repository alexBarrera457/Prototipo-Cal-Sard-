import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { BlogService, INITIAL_BLOG_POSTS } from './blog';

describe('BlogService', () => {
  let service: BlogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BlogService],
    });
    service = TestBed.inject(BlogService);
  });

  it('returns all initial launch articles', () => {
    const articles = service.getArticles();
    expect(articles.length).toBe(3);
    expect(articles[0].slug).toBe('el-arte-del-cafe-tostado-artesanal');
    expect(articles[1].slug).toBe('guia-maridaje-embutidos-catalanes-vinos-cavas');
    expect(articles[2].slug).toBe('como-preparar-cesta-regalo-gastronomica-perfecta');
  });

  it('finds an article by exact slug', () => {
    const article = service.getArticleBySlug('el-arte-del-cafe-tostado-artesanal');
    expect(article).not.toBeNull();
    expect(article?.author).toBe('Marta Izquierdo Sardà');
    expect(article?.readingTimeMinutes).toBe(4);
    expect(article?.content.length).toBeGreaterThan(0);
  });

  it('returns null when an article slug does not exist', () => {
    const article = service.getArticleBySlug('articulo-inexistente-123');
    expect(article).toBeNull();
  });
});
