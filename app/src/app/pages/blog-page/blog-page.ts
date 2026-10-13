import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BlogPost } from '@cal-sarda/domain';
import { BlogService } from '../../services/blog';
import { SeoService } from '../../services/seo';

@Component({
  selector: 'app-blog-page',
  imports: [RouterLink],
  templateUrl: './blog-page.html',
  styleUrl: './blog-page.css',
})
export class BlogPage {
  private readonly blogService = inject(BlogService);
  private readonly seo = inject(SeoService);

  readonly articles: BlogPost[] = this.blogService.getArticles();

  constructor() {
    this.seo.setMeta({
      title: 'Blog gastronómico y recetas de obrador | Cal Sardà',
      description:
        'Historias de obrador, guías de maridaje, café de especialidad y secretos gastronómicos desde 1930 en Barcelona.',
      url: '/blog',
      image: '/images/products/cafe.jpg',
      type: 'website',
    });
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateString;
    }
  }
}
