import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { BlogPage } from './blog-page';
import { BlogService } from '../../services/blog';
import { SeoService } from '../../services/seo';

describe('BlogPage', () => {
  let component: BlogPage;
  let fixture: ComponentFixture<BlogPage>;
  let blogService: BlogService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogPage],
      providers: [provideRouter([]), BlogService, SeoService],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPage);
    component = fixture.componentInstance;
    blogService = TestBed.inject(BlogService);
    fixture.detectChanges();
  });

  it('renders all blog articles in the list', () => {
    const articles = blogService.getArticles();
    expect(component.articles.length).toBe(articles.length);

    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.article-card');
    expect(cards.length).toBe(articles.length);
  });

  it('renders title and excerpt for each card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const firstTitle = compiled.querySelector('.article-card-title')?.textContent;
    expect(firstTitle).toContain('El arte del café tostado artesanal');
  });
});
