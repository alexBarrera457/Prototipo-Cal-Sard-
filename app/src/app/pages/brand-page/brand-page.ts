import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { HistoryBookComponent } from '../../components/history-book/history-book';
import { CartService } from '../../services/cart';

export type GiftLotProduct = {
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  priceLabel: string;
  image: string;
  imageFit?: 'cover' | 'contain';
};

export type PageDefinition = {
  eyebrow: string;
  title: string;
  intro: string;
  highlight: string;
  stats: Array<{ label: string; value: string }>;
  cards: Array<{ title: string; text: string }>;
  faqItems?: Array<{ question: string; answer: string }>;
  galleryImages?: Array<{ src: string; alt: string; caption: string }>;
  giftLots?: GiftLotProduct[];
  siteLinks?: Array<{ label: string; route: string }>;
  newsletter?: boolean;
  emptyMessage?: string;
  legalNote?: string;
  cta?: {
    label: string;
    route: string;
    fragment?: string;
  };
};

@Component({
  selector: 'app-brand-page',
  imports: [RouterLink, HistoryBookComponent],
  templateUrl: './brand-page.html',
  styleUrl: './brand-page.css'
})
export class BrandPage {

  page!: PageDefinition;
  lastAddedGiftLotSlug: string | null = null;

  private readonly pages: Record<string, PageDefinition> = {
    historia: {
      eyebrow: 'Historia',
      title: 'Nuestra historia',
      intro: 'Más de 90 años al servicio del barrio',
      highlight: '',
      stats: [],
      cards: [],
      cta: {
        label: 'Visita la tienda',
        route: '/tienda-online'
      }
    },
    'botiga-en-linia': {
      eyebrow: 'Tienda online',
      title: 'Productos de siempre, seleccionados con cuidado.',
      intro: 'En Cal Sardà encontrarás productos gourmet como turrones, vinos, chocolates, conservas y frutos secos. Una selección para disfrutar en casa, completar la mesa o preparar un regalo.',
      highlight: 'Elige entre envío a domicilio o recogida en tienda.',
      stats: [],
      cards: [
        {
          title: 'Turrones y chocolates',
          text: 'Dulces tradicionales y chocolates gourmet para compartir y celebrar.'
        },
        {
          title: 'Vinos y licores',
          text: 'Una selección para acompañar comidas, reuniones y ocasiones especiales.'
        },
        {
          title: 'Conservas y frutos secos',
          text: 'Conservas y frutos secos de calidad, también disponibles a granel.'
        }
      ],
      cta: {
        label: 'Ver productos',
        route: '/',
        fragment: 'tienda'
      }
    },
    galeria: {
      eyebrow: 'Galería',
      title: 'Un espacio que recoge nuestro día a día.',
      intro: 'Cal Sardà es una tienda de barrio, un lugar de encuentro y cuidado. Esta galería reúne momentos, productos y detalles que reflejan nuestra identidad y nuestro carácter.',
      highlight: 'Sabor, historia y autenticidad en cada momento.',
      stats: [],
      cards: [],
      galleryImages: [
        {
          src: '/images/gallery/passi-01.jpg',
          alt: 'Fachada de la tienda Cal Sardà',
          caption: 'La tienda en la calle Marina, en el barrio de la Sagrada Familia.'
        },
        {
          src: '/images/gallery/passi-02.jpg',
          alt: 'Interior de Cal Sardà con estantes llenos de productos',
          caption: 'Un colmado de barrio con una selección gourmet.'
        },
        {
          src: '/images/gallery/passi-04.jpg',
          alt: 'Estantes con productos de Cal Sardà',
          caption: 'Productos por descubrir en cada rincón de la tienda.'
        },
        {
          src: '/images/gallery/passi-05.jpg',
          alt: 'Atención en la tienda Cal Sardà',
          caption: 'El trato cercano forma parte de nuestra historia.'
        }
      ],
      cta: {
        label: 'Contacta con nosotros',
        route: '/contacto'
      }
    },
    newsletter: {
      eyebrow: 'Boletín',
      title: 'Las novedades de Cal Sardà, directamente en tu correo.',
      intro: 'Déjanos tu dirección y se abrirá un correo preparado para solicitar que te añadamos al boletín. No te suscribiremos automáticamente: aún hay que conectar el servicio de correo del negocio.',
      highlight: 'La suscripción requiere confirmación por correo.',
      stats: [],
      cards: [],
      newsletter: true,
      cta: {
        label: 'Ir al inicio',
        route: '/'
      }
    },
    'descobreix-el-territori': {
      eyebrow: 'Descubre el territorio',
      title: 'Sabores de la tierra con identidad propia.',
      intro: 'Cal Sardà selecciona productos gourmet y especialidades de distintos lugares. Pregúntanos en la tienda por el origen y la disponibilidad de cada producto.',
      highlight: 'Consulta el origen y la disponibilidad de cada producto.',
      stats: [],
      cards: [
        {
          title: 'Calidad de origen',
          text: 'Elegimos proveedores y elaboraciones con historia, rigor y un vínculo real con el territorio.'
        },
        {
          title: 'Temporada y autenticidad',
          text: 'La mejor selección llega en el momento adecuado, con sabor y frescura.'
        },
        {
          title: 'La mesa como ritual',
          text: 'Cada producto invita a crear momentos de convivencia, disfrute y cultura gastronómica.'
        }
      ],
      galleryImages: [
        {
          src: '/images/gallery/mapa-gastronomic-catala-optimizado.jpg',
          alt: 'Mapa gastronómico de Cataluña',
          caption: 'Un mapa para descubrir sabores y productos del territorio.'
        }
      ],
      cta: {
        label: 'Ver lotes',
        route: '/lotes-y-cestas-gourmet'
      }
    },
    'lots-per-a-empreses': {
      eyebrow: 'Lotes para empresas',
      title: 'Lotes para empresas',
      intro: 'En Cal Sardà contamos con un servicio totalmente a medida de preparación de lotes personalizados, elaborados a partir de los mejores productos gourmet. Entre la amplia selección encontrarás conservas de mar, vinos, chocolates gourmet y dulces tradicionales navideños.',
      highlight: 'Creamos un lote a medida, listo para regalar y adaptado a tu presupuesto.',
      stats: [],
      cards: [
        {
          title: 'Cuéntanos tu idea',
          text: '¿Lo prefieres dulce, salado o combinado? Dinos qué productos no pueden faltar y para qué ocasión es.'
        },
        {
          title: 'Ajustamos el presupuesto',
          text: 'Nos adaptamos al precio que te vaya mejor y te enviaremos una propuesta detallada sin compromiso.'
        },
        {
          title: 'Elige cómo presentarlo',
          text: 'Puedes escoger una caja o presentar los productos envueltos en papel transparente. Recoge el lote en la tienda o recíbelo en tu empresa.'
        }
      ],
      galleryImages: [
        {
          src: '/images/business-gifts/lotes-empresas-cestas.jpg',
          alt: 'Lote gourmet con cava Sardà, chocolates, embutidos y dulces',
          caption: 'Una selección variada para compartir.'
        },
        {
          src: '/images/business-gifts/lotes-empresas-detalle.jpg',
          alt: 'Detalle de productos gourmet reunidos en una cesta para regalar',
          caption: 'Combinaciones personalizadas según cada ocasión.'
        },
        {
          src: '/images/business-gifts/lotes-empresas-regalo.jpg',
          alt: 'Cesta gourmet preparada con productos dulces y salados',
          caption: 'Una presentación cuidada, lista para regalar.'
        }
      ],
      cta: {
        label: 'Solicita tu presupuesto',
        route: '/contacto'
      }
    },
    'lots-i-cistelles-gurmet': {
      eyebrow: 'Lotes y cestas gourmet',
      title: 'Lotes y cestas gourmet',
      intro: 'Elige los productos y personalizamos un lote a medida según tu presupuesto. Aquí encontrarás varias propuestas con un precio cerrado.',
      highlight: 'Los estampados de las cajas decoradas pueden variar en cada campaña de Navidad.',
      stats: [],
      cards: [
        {
          title: 'Dulce, salado o combinado',
          text: 'Cuéntanos qué tipo de lote te apetece y qué productos no pueden faltar.'
        },
        {
          title: 'A tu presupuesto',
          text: 'Nos adaptamos al precio que te vaya mejor: hay muchas combinaciones posibles.'
        },
        {
          title: 'La presentación que prefieras',
          text: 'Elige una caja o un conjunto de artículos envueltos en papel transparente para que se vean los productos.'
        }
      ],
      giftLots: [
        {
          slug: 'caja-lote-llenala-con-lo-que-quieras',
          name: 'Caja lote: llénala con lo que quieras',
          description: 'Caja Sardà vacía para llenar con lo que quieras de la página web.',
          category: 'Personalizable',
          price: 2.05,
          priceLabel: '2,05 €',
          image: '/images/gift-lots/caja-lote-llenala-con-lo-que-quieras.jpg',
          imageFit: 'contain'
        },
        {
          slug: 'lote-de-embutidos-catalanes',
          name: 'Lote de embutidos catalanes',
          description: 'Lote de embutidos catalanes gourmet.',
          category: 'Salado',
          price: 45,
          priceLabel: '45 €',
          image: '/images/gift-lots/lote-de-embutidos-catalanes.jpg'
        },
        {
          slug: 'lote-de-productos-catalanes',
          name: 'Lote de productos catalanes',
          description: 'Lote de productos catalanes y sobrasada de Mallorca.',
          category: 'Dulce y salado',
          price: 40,
          priceLabel: '40 €',
          image: '/images/gift-lots/lote-de-productos-catalanes.jpg'
        },
        {
          slug: 'lote-de-productos-catalanes-artesanos',
          name: 'Lote de productos catalanes artesanos',
          description: 'Lote de productos catalanes mixto.',
          category: 'Dulce y salado',
          price: 40,
          priceLabel: '40 €',
          image: '/images/gift-lots/lote-de-productos-catalanes-artesanos.jpg'
        },
        {
          slug: 'lote-dulces-catalanes-merce-2026',
          name: 'Lote dulces catalanes Mercè 2026',
          description: 'Lote de productos catalanes Mercè.',
          category: 'Dulce',
          price: 29.85,
          priceLabel: '29,85 €',
          image: '/images/gift-lots/lote-dulces-catalanes-merce-2026.jpg'
        },
        {
          slug: 'lote-especial-chocolate-gourmet',
          name: 'Lote especial chocolate gourmet',
          description: 'Un lote para los amantes del chocolate en todos sus formatos.',
          category: 'Dulce',
          price: 47,
          priceLabel: '47 €',
          image: '/images/gift-lots/lote-especial-chocolate-gourmet.jpg'
        },
        {
          slug: 'lote-gourmet-clasico',
          name: 'Lote gourmet clásico',
          description: 'Surtido selecto de dulces con nuestro cava Sardà.',
          category: 'Dulce',
          price: 84,
          priceLabel: '84 €',
          image: '/images/gift-lots/lote-gourmet-clasico.jpg'
        },
        {
          slug: 'lote-gourmet-dulce-con-cava',
          name: 'Lote gourmet dulce con cava',
          description: 'Surtido selecto de dulces con nuestro cava Sardà.',
          category: 'Dulce',
          price: 70,
          priceLabel: '70 €',
          image: '/images/gift-lots/lote-gourmet-dulce-con-cava.jpg'
        },
        {
          slug: 'lote-gourmet-navidad',
          name: 'Lote gourmet Navidad',
          description: 'Surtido selecto de dulces navideños.',
          category: 'Navidad',
          price: 45,
          priceLabel: '45 €',
          image: '/images/gift-lots/lote-gourmet-navidad.jpg'
        },
        {
          slug: 'lote-gourmet-tradicional',
          name: 'Lote gourmet tradicional',
          description: 'Productos dulces y salados: una opción perfecta para hacer un detalle en cualquier momento del año.',
          category: 'Dulce y salado',
          price: 60,
          priceLabel: '60 €',
          image: '/images/gift-lots/lote-gourmet-tradicional.jpg'
        },
        {
          slug: 'lote-gourmet-variado',
          name: 'Lote gourmet variado',
          description: 'Surtido selecto.',
          category: 'Dulce y salado',
          price: 74,
          priceLabel: '74 €',
          image: '/images/gift-lots/lote-gourmet-variado.jpg'
        },
        {
          slug: 'lote-navidad-gourmet',
          name: 'Lote Navidad gourmet',
          description: 'Los básicos de la Navidad con conservas para el aperitivo.',
          category: 'Navidad',
          price: 80,
          priceLabel: '80 €',
          image: '/images/gift-lots/lote-navidad-gourmet.jpg'
        },
        {
          slug: 'lote-productos-tradicionales-de-navidad',
          name: 'Lote productos tradicionales de Navidad',
          description: 'Dulces y salados: panettone, barquillos tradicionales y turrón de quicos y praliné.',
          category: 'Navidad',
          price: 85,
          priceLabel: '85 €',
          image: '/images/gift-lots/lote-productos-tradicionales-de-navidad.jpg'
        },
        {
          slug: 'lote-salado-para-regalo',
          name: 'Lote salado para regalo',
          description: 'Sobrasada, foie, olivas arbequinas y torradetes.',
          category: 'Salado',
          price: 37,
          priceLabel: '37 €',
          image: '/images/gift-lots/lote-salado-para-regalo.jpg'
        },
        {
          slug: 'lote-selecto-productos-artesanos',
          name: 'Lote selecto de productos artesanos',
          description: 'Surtido de productos artesanales.',
          category: 'Dulce y salado',
          price: 79,
          priceLabel: '79 €',
          image: '/images/gift-lots/lote-selecto-productos-artesanos.jpg'
        },
        {
          slug: 'lote-turron-y-cava-rosado',
          name: 'Lote turrón y cava rosado',
          description: 'Turrón acompañado de cava rosado.',
          category: 'Dulce',
          price: 47,
          priceLabel: '47 €',
          image: '/images/gift-lots/lote-turron-y-cava-rosado.jpg'
        },
        {
          slug: 'lote-vino-blanco-para-regalar',
          name: 'Lote vino blanco para regalar',
          description: 'Vino blanco Albariño Lagar de Cervera.',
          category: 'Bodega',
          price: 24.5,
          priceLabel: '24,50 €',
          image: '/images/gift-lots/lote-vino-blanco-para-regalar.jpg'
        }
      ],
      cta: {
        label: 'Pide presupuesto sin compromiso',
        route: '/contacto'
      }
    },
    faq: {
      eyebrow: 'Preguntas frecuentes',
      title: 'Resolvemos tus dudas sobre pedidos y envíos.',
      intro: 'Información práctica sobre recogida, envío a domicilio, pago e incidencias.',
      highlight: 'Si necesitas más información, escríbenos a sarda@calsarda.com.',
      stats: [],
      cards: [],
      faqItems: [
        {
          question: '¿Puedo recoger mi pedido en la tienda?',
          answer: 'La tienda online está en preparación. Este prototipo solo permite preparar una vista previa: no envía pedidos ni realiza cobros.'
        },
        {
          question: '¿Hay un pedido mínimo?',
          answer: 'No hay un pedido mínimo, tanto si eliges recogerlo en la tienda como si solicitas el envío.'
        },
        {
          question: '¿Cuánto cuesta el envío a domicilio?',
          answer: 'El coste indicado para Barcelona, Lleida, Tarragona y Girona es de 7,99 €. Para el resto de la península es de 8,99 €. Para consultar las tarifas de envío a Europa, contacta con nosotros.'
        },
        {
          question: '¿Dónde puedo recibir mi pedido?',
          answer: 'Enviamos productos a toda la península. Los helados y la horchata solo se reparten en Barcelona para garantizar que lleguen en buenas condiciones. También hacemos envíos a Europa; consúltanos las tarifas.'
        },
        {
          question: '¿Puedo pedir horchata o helados si vivo fuera de Barcelona?',
          answer: 'De momento, no. El servicio a domicilio de estos productos está limitado a Barcelona para garantizar su calidad durante el transporte.'
        },
        {
          question: '¿Puedo hacer un pedido por WhatsApp?',
          answer: 'Sí. Escríbenos al 93 232 55 08. Los pedidos por WhatsApp se pagan en la tienda al recogerlos o con tarjeta en el momento de la entrega a domicilio.'
        },
        {
          question: '¿Cómo puedo pagar un pedido online?',
          answer: 'Este prototipo todavía no procesa pagos. En la tienda física puedes pagar en efectivo, con tarjeta o con Apple Pay.'
        },
        {
          question: '¿Cuándo recibiré mi pedido?',
          answer: 'El plazo orientativo de entrega es de unas 48 horas.'
        },
        {
          question: '¿Qué hago si hay un error en mi pedido?',
          answer: 'Si recibes un pedido incorrecto, ponte en contacto con nosotros lo antes posible para que podamos gestionar la incidencia.'
        },
        {
          question: '¿Puedo devolver un producto?',
          answer: 'Se aceptan devoluciones si un artículo llega en mal estado, por ejemplo, si se ha roto. Hay que comprobarlo en el momento de la entrega.'
        },
        {
          question: '¿Quién realizará la entrega?',
          answer: 'En Barcelona, la entrega la realiza un repartidor contratado por Cal Sardà. En el resto de la península, los envíos se gestionan con GLS.'
        },
        {
          question: '¿Qué opciones tengo para hacer un pedido?',
          answer: 'Puedes comprar online y recoger el pedido en la tienda, recibirlo en casa o hacer el pedido por WhatsApp o teléfono y elegir entre recogida y entrega.'
        }
      ],
      cta: {
        label: 'Contactar',
        route: '/contacto'
      }
    },
    blog: {
      eyebrow: 'Blog',
      title: 'Historias y novedades de Cal Sardà.',
      intro: 'Este espacio está preparado para compartir novedades, historias de productos y propuestas gastronómicas.',
      highlight: 'Los artículos se publicarán aquí cuando estén disponibles.',
      stats: [],
      cards: [],
      emptyMessage: 'Todavía no hay artículos publicados. Mientras tanto, descubre la historia de la tienda o contacta con nosotros.',
      cta: {
        label: 'Descubre la historia',
        route: '/historia'
      }
    },
    'avis-legal': {
      eyebrow: 'Aviso legal',
      title: 'Información legal y condiciones de nuestra web.',
      intro: 'Titular del sitio web: Cal Sardà. NIF 47912103K. Domicilio: calle Marina, 237, 08013 Barcelona. Correo electrónico: sarda@calsarda.com.',
      highlight: 'El uso de este sitio web implica la aceptación de los términos del aviso legal, sin perjuicio de los derechos que correspondan a las personas consumidoras.',
      legalNote: 'Resumen informativo. Antes de publicar, hay que revisar y completar el texto legal vigente con asesoramiento adecuado.',
      stats: [
        { label: 'Datos', value: 'Públicos' },
        { label: 'Uso', value: 'Lícito' },
        { label: 'Responsabilidad', value: 'Informativa' }
      ],
      cards: [
        {
          title: 'Propiedad del portal',
          text: 'Los textos, imágenes y diseños son propiedad de Cal Sardà o de terceros que han autorizado su uso. Su utilización debe respetar los derechos correspondientes.'
        },
        {
          title: 'Información de la web',
          text: 'Cal Sardà procura mantener la información actualizada y se reserva el derecho a modificar los contenidos. No asume responsabilidad por el contenido de los enlaces externos.'
        },
        {
          title: 'Normativa aplicable',
          text: 'Los posibles conflictos relativos a la web se rigen por el derecho del Estado español, respetando los derechos que correspondan legalmente a las personas consumidoras.'
        }
      ],
      cta: {
        label: 'Contactar',
        route: '/contacto'
      }
    },
    'politica-de-privacitat': {
      eyebrow: 'Política de privacidad',
      title: 'Protección de datos y uso responsable de la información.',
      intro: 'Cal Sardà trata los datos personales para ofrecer y gestionar sus productos y servicios. La base del tratamiento es el consentimiento y, cuando corresponda, la ejecución del servicio o contrato.',
      highlight: 'Puedes ejercer tus derechos de acceso, rectificación, supresión, limitación, oposición y portabilidad contactando con Cal Sardà.',
      legalNote: 'Resumen informativo. Antes de publicar, hay que revisar y completar el texto legal vigente con asesoramiento adecuado.',
      stats: [
        { label: 'Tratamiento', value: 'Lícito' },
        { label: 'Seguridad', value: 'Prioritaria' },
        { label: 'Consultas', value: 'Disponibles' }
      ],
      cards: [
        {
          title: 'Finalidad y conservación',
          text: 'Los datos se utilizan para prestar y facturar productos y servicios, y para enviar información comercial cuando existe consentimiento. Se conservan mientras dure la relación o durante los plazos legales aplicables.'
        },
        {
          title: 'Destinatarios',
          text: 'Los datos no se comunican a terceros, salvo cuando lo exija la ley o sea necesario para la finalidad del tratamiento.'
        },
        {
          title: 'Ejercicio de derechos',
          text: 'Para ejercer tus derechos o pedir más información, escribe a sarda@calsarda.com. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos.'
        }
      ],
      cta: {
        label: 'Consultar contacto',
        route: '/contacto'
      }
    },
    'politica-de-cookies': {
      eyebrow: 'Política de cookies',
      title: 'Información sobre el uso de cookies y perfiles de navegación.',
      intro: 'Las cookies son pequeños archivos que se almacenan en el navegador. Este sitio utiliza cookies técnicas propias y de terceros para analizar la interacción con la web.',
      highlight: 'Puedes retirar el consentimiento o restringir y borrar las cookies desde la configuración del navegador.',
      legalNote: 'Resumen informativo. La política definitiva debe reflejar las cookies realmente instaladas y las opciones de consentimiento activas en el sitio.',
      stats: [
        { label: 'Cookies', value: 'Necesarias' },
        { label: 'Analítica', value: 'Opcional' },
        { label: 'Control', value: 'Total' }
      ],
      cards: [
        {
          title: 'Cookies técnicas',
          text: 'Las cookies técnicas propias permiten el funcionamiento básico del sitio web y sus opciones.'
        },
        {
          title: 'Cookies de análisis',
          text: 'Las cookies de terceros pueden aportar información sobre la interacción con la web para ayudar a mejorar la navegación.'
        },
        {
          title: 'Consentimiento y retirada',
          text: 'El consentimiento se obtiene mediante el aviso de cookies de la web. Puedes retirarlo en cualquier momento o gestionar las cookies desde el navegador.'
        }
      ],
      cta: {
        label: 'Inicio',
        route: '/'
      }
    },
    'condicions-generals': {
      eyebrow: 'Condiciones generales',
      title: 'Condiciones de compra, uso y servicio que rigen nuestra actividad.',
      intro: 'Las condiciones publicadas en la web regulan la compra de productos a Cal Sardà, titularidad de Marta Izquierdo Sardà, NIF 47912103K, con domicilio en la calle Marina, 237, 08013 Barcelona.',
      highlight: 'Antes de comprar, revisa las condiciones completas y la información de cada producto en la web oficial.',
      legalNote: 'Resumen informativo. Antes de publicar, hay que revisar y completar las condiciones de compra vigentes con asesoramiento adecuado.',
      stats: [
        { label: 'Compra', value: 'Segura' },
        { label: 'Servicio', value: 'Cercano' },
        { label: 'Comunicación', value: 'Clara' }
      ],
      cards: [
        {
          title: 'Proceso de compra',
          text: 'Antes de confirmar un pedido, el usuario puede revisar los productos, las cantidades, los precios, los impuestos, los gastos de envío y el plazo previsto.'
        },
        {
          title: 'Pago y confirmación',
          text: 'El pedido se confirma cuando Cal Sardà recibe el pago. La información sobre precios y envíos debe comprobarse durante el proceso de compra.'
        },
        {
          title: 'Ayuda',
          text: 'Para consultar las condiciones de entrega, incidencias o devoluciones, contacta con Cal Sardà antes de comprar.'
        }
      ],
      cta: {
        label: 'Contacta',
        route: '/contacto'
      }
    },
    'mapa-web': {
      eyebrow: 'Mapa web',
      title: 'Todas las secciones de nuestra web, ordenadas y accesibles.',
      intro: 'Aquí tienes una visión clara de las secciones principales y complementarias de la web para encontrar rápidamente la información que buscas.',
      highlight: 'Navegación clara y rápida para acceder a la información esencial.',
      stats: [],
      cards: [],
      siteLinks: [
        { label: 'Inicio', route: '/' },
        { label: 'Historia', route: '/historia' },
        { label: 'Tienda online', route: '/tienda-online' },
        { label: 'Galería', route: '/galeria' },
        { label: 'Contacto', route: '/contacto' },
        { label: 'Boletín', route: '/boletin' },
        { label: 'Descubre el territorio', route: '/descubre-el-territorio' },
        { label: 'Lotes para empresas', route: '/lotes-para-empresas' },
        { label: 'Lotes y cestas gourmet', route: '/lotes-y-cestas-gourmet' },
        { label: 'Preguntas frecuentes', route: '/faq' },
        { label: 'Blog', route: '/blog' },
        { label: 'Aviso legal', route: '/aviso-legal' },
        { label: 'Política de privacidad', route: '/politica-de-privacidad' },
        { label: 'Política de cookies', route: '/politica-de-cookies' },
        { label: 'Condiciones generales', route: '/condiciones-generales' }
      ],
      cta: {
        label: 'Inicio',
        route: '/'
      }
    }
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly meta: Meta,
    private readonly cartService: CartService,
    destroyRef: DestroyRef
  ) {
    this.route.data
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(data => {
        const slug = data['page']
          ?? this.route.snapshot.routeConfig?.path
          ?? 'historia';
        this.page = this.pages[slug] ?? this.pages['historia'];
        this.meta.updateTag({
          name: 'description',
          content: this.page.intro
        });
      });
  }

  scrollToBusinessProcess(event: MouseEvent): void {
    event.preventDefault();
    document.getElementById('como-funciona')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  addGiftLotToCart(product: GiftLotProduct): void {
    this.cartService.addToCart(product.name, product.price);
    this.lastAddedGiftLotSlug = product.slug;
  }

  prepareNewsletterRequest(event: SubmitEvent): void {
    event.preventDefault();

    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const email = String(new FormData(form).get('email'));
    const subject = 'Solicitud de alta en el boletín de Cal Sardà';
    const body = `Por favor, añade esta dirección al boletín: ${email}`;

    window.location.href = `mailto:sarda@calsarda.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

}
