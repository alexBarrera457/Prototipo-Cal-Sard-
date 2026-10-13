import { Injectable } from '@angular/core';
import type { BlogPost } from '@cal-sarda/domain';

export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    slug: 'el-arte-del-cafe-tostado-artesanal',
    title:
      'El arte del café tostado artesanal: la herencia torrefactora de Cal Sardà desde la posguerra',
    excerpt:
      'Descubre cómo seleccionamos y tostamos el café en grano desde 1930 en Barcelona, manteniendo el equilibrio entre cuerpo, aroma y tueste lento que conquistó a generaciones en la calle Marina.',
    coverImage: '/images/products/cafe.jpg',
    publishedAt: '2026-09-15',
    readingTimeMinutes: 4,
    tags: ['Café gourmet', 'Historia', 'Obrador'],
    author: 'Marta Izquierdo Sardà',
    content: [
      'En la Barcelona de la posguerra, el aroma del café recién tostado era mucho más que una bebida: era una señal de renacimiento, un punto de encuentro y un consuelo cotidiano para los vecinos del barrio.',
      'Fundada en 1930, Cal Sardà comenzó seleccionando orígenes de café cuando el abastecimiento era un verdadero reto logístico. Nuestros antepasados aprendieron a calibrar a ojo, olfato y oído el punto exacto de calor en el bombo de tueste, escuchando el crujido característico del grano cuando libera sus aceites esenciales.',
      'Hoy conservamos esa misma filosofía artesanal. Trabajamos con partidas seleccionadas de café Arábica de altura y Robusta de gran cuerpo procedentes de cooperativas sostenibles. Nuestro tueste medio-intenso respeta los matices a chocolate negro, frutos secos tostados y caramelo, sin amarguras agresivas ni artificios.',
      'Para disfrutarlo plenamente en casa, recomendamos moler el grano en el momento exacto de la preparación y utilizar agua mineral de mineralización débil entre 90 y 94 grados Celsius. Ya sea en cafetera italiana moka, filtro o émbolo, cada taza conserva la memoria viva de nuestra tienda centenaria en la calle Marina.',
    ],
  },
  {
    slug: 'guia-maridaje-embutidos-catalanes-vinos-cavas',
    title: 'Guía para maridar embutidos catalanes con vinos y cavas de proximidad',
    excerpt:
      'Una propuesta para armonizar fuet artesano, llonganissa de Vic, butifarra negra y jamón de bellota con los mejores vinos del Montsant, Priorat y cavas Brut Nature del Penedès.',
    coverImage: '/images/products/frutos-secos.jpg',
    publishedAt: '2026-09-28',
    readingTimeMinutes: 5,
    tags: ['Embutidos', 'Bodega', 'Maridaje'],
    author: 'Equipo Cal Sardà',
    content: [
      'La gastronomía catalana se fundamenta en la honestidad de la despensa y la paciencia del curado. El embutido tradicional no es simplemente un aperitivo; es la expresión del clima, las hierbas aromáticas y el saber hacer secular de nuestros obradores comarcales.',
      'El Fuet y la Llonganissa de Vic destacan por su grasa entreverada dulce y el ligero toque a pimienta negra molida. Para limpiar el paladar y realzar su untuosidad, el maridaje ideal es un Cava Brut Nature Reserva del Penedès: su burbuja fina y acidez viva equilibran la grasa natural en cada bocado.',
      'Para las butifarras de perol y la butifarra negra con piñones, recomendamos vinos tintos jóvenes o con crianza breve de la D.O. Montsant o D.O. Terra Alta elaborados con uva Garnacha y Cariñena. Su fruta roja madura y notas balsámicas abrazan la profundidad especiada del embutido cocido.',
      'Finalmente, el jamón ibérico de bellota y el lomo curado exigen copas con mayor estructura: un tinto con crianza de la D.O.Q. Priorat o un vino blanco con crianza sobre lías que aporte untuosidad mineral sin restar protagonismo a la bellota.',
    ],
  },
  {
    slug: 'como-preparar-cesta-regalo-gastronomica-perfecta',
    title: 'Cómo preparar una cesta de regalo gastronómica perfecta',
    excerpt:
      'Claves para combinar texturas dulces y saladas, maridajes equilibrados y empaquetado artesanal para acertar siempre con un regalo con alma.',
    coverImage: '/images/products/dulces-navidad.jpg',
    publishedAt: '2026-10-05',
    readingTimeMinutes: 4,
    tags: ['Cestas gourmet', 'Regalos', 'Guía'],
    author: 'Marta Izquierdo Sardà',
    content: [
      'Regalar gastronomía es regalar momentos compartidos de sobremesa y celebración. Sin embargo, una cesta gourmet memorable no consiste en acumular productos al azar, sino en componer una partitura armónica donde cada elemento complemente al siguiente.',
      'La regla dorada de Cal Sardà es el equilibrio 60/40 entre salado y dulce. Una cesta equilibrada debe comenzar con un buen aperitivo: conservas selectas de mar (como berberechos o mejillones gigantes de las rías), frutos secos tostados al horno y una tabla de embutido noble.',
      'El centro de la experiencia requiere siempre la bebida adecuada: una botella de cava brut para brindar y un vino de la tierra que invite a sentarse a la mesa. Para el broche de oro, el dulce no debe ser excesivo pero sí de máxima categoría: turrón artesano de yema tostada, neulas tradicionales y café recién tostado para cerrar la comida.',
      'Por último, la presentación marca la diferencia: evitamos plásticos brillantes y apostamos por cajas de madera noble reutilizables, viruta vegetal protectora y una tarjeta con dedicatoria manuscrita que transmita el afecto personal de quien regala.',
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private readonly articles: BlogPost[] = INITIAL_BLOG_POSTS;

  getArticles(): BlogPost[] {
    return [...this.articles];
  }

  getArticleBySlug(slug: string): BlogPost | null {
    if (!slug) {
      return null;
    }
    const cleanSlug = slug.trim().toLowerCase();
    return this.articles.find((article) => article.slug.toLowerCase() === cleanSlug) ?? null;
  }
}
