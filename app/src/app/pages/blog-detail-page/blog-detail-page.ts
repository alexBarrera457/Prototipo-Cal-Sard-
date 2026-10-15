import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { BlogPost } from '@cal-sarda/domain';
import { BlogService } from '../../services/blog';
import { I18nService } from '../../services/i18n';
import { SeoService } from '../../services/seo';

@Component({
  selector: 'app-blog-detail-page',
  imports: [RouterLink],
  templateUrl: './blog-detail-page.html',
  styleUrl: './blog-detail-page.css',
})
export class BlogDetailPage {
  readonly article = signal<BlogPost | null>(null);
  readonly notFound = signal(false);
  public readonly i18n = inject(I18nService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogService = inject(BlogService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.seo.removeJsonLd('blog-post');
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.setNotFoundState();
        return;
      }

      const found = this.blogService.getArticleBySlug(slug);
      if (found) {
        this.article.set(found);
        this.notFound.set(false);
        this.updateSeoForArticle(found);
      } else {
        this.setNotFoundState();
      }
    });
  }

  backToBlog(): void {
    void this.router.navigate(['/blog']);
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const locale = this.i18n.currentLang() === 'ca' ? 'ca-ES' : 'es-ES';
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateString;
    }
  }

  private updateSeoForArticle(article: BlogPost): void {
    const canonicalUrl = `/blog/${article.slug}`;
    const imageUrl = article.coverImage.startsWith('http')
      ? article.coverImage
      : `https://calsarda.com${article.coverImage.startsWith('/') ? '' : '/'}${article.coverImage}`;

    this.seo.setMeta({
      title: `${article.title} | Blog Cal Sardà`,
      description: article.excerpt,
      image: article.coverImage,
      url: canonicalUrl,
      type: 'article',
    });

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.excerpt,
      image: [imageUrl],
      datePublished: article.publishedAt,
      author: {
        '@type': 'Person',
        name: article.author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Cal Sardà',
        logo: {
          '@type': 'ImageObject',
          url: 'https://calsarda.com/images/products/cafe.jpg',
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://calsarda.com${canonicalUrl}`,
      },
    };

    this.seo.setJsonLd('blog-post', schema);
  }

  private setNotFoundState(): void {
    this.article.set(null);
    this.notFound.set(true);
    this.seo.removeJsonLd('blog-post');
    this.seo.setMeta({
      title: 'Artículo no encontrado | Blog Cal Sardà',
      description: 'El artículo solicitado no existe en el blog de Cal Sardà.',
    });
  }
}
