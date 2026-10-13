import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect } from 'vitest';
import { BlogDetailPage } from './blog-detail-page';
import { BlogService } from '../../services/blog';
import { SeoService } from '../../services/seo';

describe('BlogDetailPage', () => {
  let fixture: ComponentFixture<BlogDetailPage>;
  let component: BlogDetailPage;

  const setupTest = async (slugParam: string | null) => {
    await TestBed.configureTestingModule({
      imports: [BlogDetailPage],
      providers: [
        provideRouter([]),
        BlogService,
        SeoService,
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap(slugParam ? { slug: slugParam } : {})),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('renders article details when slug is valid', async () => {
    await setupTest('el-arte-del-cafe-tostado-artesanal');

    expect(component.article()).not.toBeNull();
    expect(component.notFound()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.article-title')?.textContent;
    expect(title).toContain('El arte del café tostado artesanal');

    const paragraphs = compiled.querySelectorAll('.article-content p');
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders not found state when slug does not exist', async () => {
    await setupTest('articulo-desconocido');

    expect(component.article()).toBeNull();
    expect(component.notFound()).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.not-found-title')?.textContent).toContain(
      'Artículo no encontrado',
    );
  });
});
