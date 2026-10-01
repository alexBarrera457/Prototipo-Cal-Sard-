import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta } from '@angular/platform-browser';

type PageDefinition = {
  eyebrow: string;
  title: string;
  intro: string;
  highlight: string;
  stats: Array<{ label: string; value: string }>;
  cards: Array<{ title: string; text: string }>;
  faqItems?: Array<{ question: string; answer: string }>;
  galleryImages?: Array<{ src: string; alt: string; caption: string }>;
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
  imports: [RouterLink],
  templateUrl: './brand-page.html',
  styleUrl: './brand-page.css'
})
export class BrandPage {

  page!: PageDefinition;

  private readonly pages: Record<string, PageDefinition> = {
    historia: {
      eyebrow: 'Història',
      title: 'Una història familiar al cor de la Sagrada Família.',
      intro: 'Des de 1930, Cal Sardà forma part de la vida del barri. Els fills de Jaume i Flora van fer créixer el negoci i, el 1958, Jaume va impulsar la primera reforma del local per convertir-lo en el colmado que el veïnat coneixia.',
      highlight: 'Quatre generacions de productes de qualitat i tracte proper.',
      stats: [
        { label: 'Al barri des de', value: '1930' },
        { label: 'Generacions', value: '4' },
        { label: 'Lloc', value: 'Sagrada Família' }
      ],
      cards: [
        {
          title: 'La primera reforma',
          text: 'Cap als anys cinquanta, la botiga va arribar a tenir catorze treballadors, molts d’ells familiars i amics de Belianes, el poble natal de Jaume Sardà Güell. El 1958 el local es va transformar en el colmado del barri.'
        },
        {
          title: 'El colmado gourmet',
          text: 'La botiga va deixar enrere la venda de verdura i bacallà per centrar-se en el cafè i en queviures de qualitat i proximitat, com les galetes, els torrons i els fruits secs a granel.'
        },
        {
          title: 'Una història que continua',
          text: 'Maria Sardà Sardà, filla de Jaume, va començar a treballar al negoci i n’és avui la propietària. Continua atenent els clients i coneixent els seus gustos i preferències.'
        }
      ],
      cta: {
        label: 'Visita la botiga',
        route: '/botiga-en-linia'
      }
    },
    'botiga-en-linia': {
      eyebrow: 'Botiga en línia',
      title: 'Productes de sempre, seleccionats amb cura.',
      intro: 'A Cal Sardà trobaràs productes gurmet com torrons, vins, xocolates, conserves i fruits secs. Una selecció per gaudir a casa, completar la taula o preparar un regal.',
      highlight: 'Compra en línia i tria enviament o recollida a la botiga.',
      stats: [],
      cards: [
        {
          title: 'Torrons i xocolates',
          text: 'Dolços tradicionals i xocolates gurmet per compartir i celebrar.'
        },
        {
          title: 'Vins i licors',
          text: 'Una selecció per acompanyar àpats, trobades i ocasions especials.'
        },
        {
          title: 'Conserves i fruits secs',
          text: 'Conserves i fruits secs de qualitat, també disponibles a granel.'
        }
      ],
      cta: {
        label: 'Veure productes',
        route: '/',
        fragment: 'tienda'
      }
    },
    galeria: {
      eyebrow: 'Galeria',
      title: 'Un espai que captura el nostre dia a dia.',
      intro: 'Darrere de Cal Sardà hi ha un ambient de botiga de barri, de trobada i de cura. La galeria recull moments, productes i detalls que expliquen la nostra identitat i el nostre tarannà.',
      highlight: 'Sabor, història i autenticitat en cada instant.',
      stats: [],
      cards: [],
      galleryImages: [
        {
          src: '/images/history.jpg',
          alt: 'Un detall de la història de Cal Sardà',
          caption: 'Una història familiar al barri de la Sagrada Família.'
        },
        {
          src: '/images/hero.jpg',
          alt: 'Imatge de benvinguda de Cal Sardà',
          caption: 'Els productes de sempre, des de 1930.'
        }
      ],
      cta: {
        label: 'Contacta amb nosaltres',
        route: '/contacte'
      }
    },
    newsletter: {
      eyebrow: 'Newsletter',
      title: 'Les novetats de Cal Sardà, directament al teu correu.',
      intro: 'Deixa’ns la teva adreça i s’obrirà un correu preparat per demanar que t’afegim a la newsletter. No t’hi subscriurem automàticament: la gestió encara s’ha de connectar amb el servei de correu del negoci.',
      highlight: 'Subscripció pendent de confirmació per correu.',
      stats: [],
      cards: [],
      newsletter: true,
      cta: {
        label: 'Anar a la home',
        route: '/'
      }
    },
    'descobreix-el-territori': {
      eyebrow: 'Descobreix el territori',
      title: 'Sabors de la terra, amb identitat pròpia.',
      intro: 'Cal Sardà selecciona productes gurmet i especialitats de diferents procedències. Consulta’ns a la botiga per conèixer l’origen i la disponibilitat de cada producte.',
      highlight: 'Origen i disponibilitat: demana’ns informació sobre cada producte.',
      stats: [],
      cards: [
        {
          title: 'Qualitat per origen',
          text: 'Triem proveïdors i elaboracions amb història, rigor i un vincle real amb el territori.'
        },
        {
          title: 'Temporada i autenticitat',
          text: 'La millor selecció arriba en el moment adequat, amb sabor i frescor.'
        },
        {
          title: 'La taula com a ritual',
          text: 'Cada producte és una invitació a crear moments de convivència, gaudi i cultura gastronòmica.'
        }
      ],
      cta: {
        label: 'Veure lots',
        route: '/lots-i-cistelles-gurmet'
      }
    },
    'lots-per-a-empreses': {
      eyebrow: 'Lots per a empreses',
      title: 'Regals i solucions gourmet per a la teva empresa.',
      intro: 'Preparem lots personalitzats amb una selecció de productes gurmet, com conserves de mar, vins, xocolates i dolços tradicionals de Nadal.',
      highlight: 'Personalitzem el lot i el preparem llest per regalar.',
      stats: [],
      cards: [
        {
          title: 'A mida',
          text: 'T’ajudem a crear una combinació de productes ajustada a l’ocasió i a les necessitats de la teva empresa.'
        },
        {
          title: 'Selecció gurmet',
          text: 'Pots triar entre conserves, vins, xocolates gurmet i dolços tradicionals nadalencs.'
        },
        {
          title: 'Recollida o enviament',
          text: 'Recull els lots al nostre establiment o demana que els enviem directament a la teva empresa.'
        }
      ],
      cta: {
        label: 'Parlem del teu encàrrec',
        route: '/contacte'
      }
    },
    'lots-i-cistelles-gurmet': {
      eyebrow: 'Lots i cistelles gourmet',
      title: 'Les millors combinacions per compartir i regalar.',
      intro: 'Preparem lots personalitzats amb la combinació de productes que tens al cap i ajustats al teu pressupost.',
      highlight: 'Explica’ns si el vols dolç, salat o combinat, què no hi pot faltar i com t’agradaria presentar-lo.',
      stats: [],
      cards: [
        {
          title: 'Tria el tipus de lot',
          text: 'Pensa si prefereixes un lot dolç, salat o combinat i indica’ns quins productes t’agradaria incloure.'
        },
        {
          title: 'Indica el pressupost',
          text: 'Ens adaptem al pressupost que tinguis en ment i et proposem diferents combinacions de productes.'
        },
        {
          title: 'Escull la presentació',
          text: 'Pots demanar una caixa o un conjunt d’articles embolicats amb paper transparent perquè es vegin els productes.'
        }
      ],
      cta: {
        label: 'Demana un pressupost sense compromís',
        route: '/contacte'
      }
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Resolem els teus dubtes sobre comandes i enviaments.',
      intro: 'Informació pràctica sobre recollida, enviament a domicili, pagament i incidències.',
      highlight: 'Si necessites més informació, escriu-nos a sarda@calsarda.com.',
      stats: [],
      cards: [],
      faqItems: [
        {
          question: 'Puc recollir la meva comanda a la botiga?',
          answer: 'Sí. Fes el pagament en línia i recull la comanda a la botiga sense cap cost addicional.'
        },
        {
          question: 'Hi ha una comanda mínima?',
          answer: 'No hi ha una comanda mínima, tant si tries la recollida a la botiga com si demanes l’enviament.'
        },
        {
          question: 'Quant costa el servei a domicili?',
          answer: 'El cost indicat per Barcelona, Lleida, Tarragona i Girona és de 7,99 €. Per a la resta de la península és de 8,99 €. Per consultar les tarifes d’enviament a Europa, contacta amb nosaltres.'
        },
        {
          question: 'On puc rebre la meva comanda?',
          answer: 'Enviem productes a tota la península. Els gelats i l’orxata només es reparteixen a Barcelona, perquè cal garantir que arribin en bones condicions. També fem enviaments a Europa; consulta’ns les tarifes.'
        },
        {
          question: 'Puc demanar orxata o gelats si visc fora de Barcelona?',
          answer: 'De moment, no. El servei a domicili d’aquests productes està limitat a Barcelona per garantir-ne la qualitat durant el transport.'
        },
        {
          question: 'Puc fer una comanda per WhatsApp?',
          answer: 'Sí. Escriu-nos al 93 232 55 08. Les comandes per WhatsApp es paguen a la botiga en recollir-les o amb targeta en el moment del lliurament a domicili.'
        },
        {
          question: 'Com puc pagar una comanda en línia?',
          answer: 'Les comandes web es paguen amb targeta bancària. A la botiga pots pagar en efectiu, amb targeta o amb Apple Pay.'
        },
        {
          question: 'Quan rebré la comanda?',
          answer: 'El termini orientatiu d’entrega és d’unes 48 hores.'
        },
        {
          question: 'Què faig si hi ha un error en la comanda?',
          answer: 'Si reps una comanda incorrecta, posa’t en contacte amb nosaltres tan aviat com sigui possible perquè puguem gestionar la incidència.'
        },
        {
          question: 'Puc retornar un producte?',
          answer: 'Les devolucions s’accepten si un article arriba en mal estat, per exemple, si s’ha trencat. Cal comprovar-ho en el moment de l’entrega.'
        },
        {
          question: 'Qui farà el lliurament?',
          answer: 'A Barcelona, el lliurament el fa un repartidor contractat per Cal Sardà. A la resta de la península, els enviaments es gestionen amb GLS.'
        },
        {
          question: 'Quines opcions tinc per fer una comanda?',
          answer: 'Pots comprar en línia i recollir la comanda a la botiga, comprar en línia i rebre-la a casa, o fer la comanda per WhatsApp o telèfon i triar entre recollida o lliurament.'
        }
      ],
      cta: {
        label: 'Contactar',
        route: '/contacte'
      }
    },
    blog: {
      eyebrow: 'Blog',
      title: 'Històries i novetats de Cal Sardà.',
      intro: 'Aquest espai està preparat per compartir novetats, històries de producte i propostes gastronòmiques.',
      highlight: 'Els articles es publicaran aquí quan estiguin disponibles.',
      stats: [],
      cards: [],
      emptyMessage: 'Encara no hi ha articles publicats. Mentrestant, descobreix la història de la botiga o contacta amb nosaltres.',
      cta: {
        label: 'Descobreix la història',
        route: '/historia'
      }
    },
    'avis-legal': {
      eyebrow: 'Avís legal',
      title: 'Informació legal i condicions de la nostra web.',
      intro: 'Titular del lloc web: Cal Sardà. NIF 47912103K. Domicili: carrer Marina, 237, 08013 Barcelona. Correu electrònic: sarda@calsarda.com.',
      highlight: 'L’ús d’aquest lloc web implica l’acceptació dels termes de l’avís legal, sense perjudici dels drets que corresponguin a les persones consumidores.',
      legalNote: 'Resum informatiu. Abans de publicar, cal revisar i completar el text legal vigent amb assessorament adequat.',
      stats: [
        { label: 'Dades', value: 'Públiques' },
        { label: 'Ús', value: 'Lícit' },
        { label: 'Responsabilitat', value: 'Informativa' }
      ],
      cards: [
        {
          title: 'Propietat del portal',
          text: 'Els textos, imatges i dissenys són titularitat de Cal Sardà o de tercers que n’han autoritzat l’ús. La seva utilització requereix respectar els drets corresponents.'
        },
        {
          title: 'Informació del web',
          text: 'Cal Sardà procura mantenir la informació actualitzada i es reserva el dret de modificar els continguts. No assumeix responsabilitat pel contingut dels enllaços externs.'
        },
        {
          title: 'Normativa aplicable',
          text: 'Els possibles conflictes relatius al web es regeixen pel dret de l’Estat espanyol, respectant els drets que legalment corresponguin a les persones consumidores.'
        }
      ],
      cta: {
        label: 'Contactar',
        route: '/contacte'
      }
    },
    'politica-de-privacitat': {
      eyebrow: 'Política de privacitat',
      title: 'Protecció de dades i ús responsable de la informació.',
      intro: 'Cal Sardà tracta les dades personals per oferir i gestionar els seus productes i serveis. La base del tractament és el consentiment i, quan correspongui, l’execució del servei o contracte.',
      highlight: 'Pots exercir els drets d’accés, rectificació, supressió, limitació, oposició i portabilitat contactant amb Cal Sardà.',
      legalNote: 'Resum informatiu. Abans de publicar, cal revisar i completar el text legal vigent amb assessorament adequat.',
      stats: [
        { label: 'Tractament', value: 'Lícit' },
        { label: 'Seguretat', value: 'Prioritat' },
        { label: 'Consulta', value: 'Disponible' }
      ],
      cards: [
        {
          title: 'Finalitat i conservació',
          text: 'Les dades es fan servir per prestar i facturar productes i serveis, i per enviar informació comercial quan hi ha consentiment. Es conserven mentre duri la relació o durant els terminis legals aplicables.'
        },
        {
          title: 'Destinataris',
          text: 'Les dades no es comuniquen a tercers, excepte quan ho exigeixi la llei o sigui necessari per a la finalitat del tractament.'
        },
        {
          title: 'Exercici de drets',
          text: 'Per exercir els teus drets o demanar més informació, escriu a sarda@calsarda.com. També pots presentar una reclamació davant l’Agència Espanyola de Protecció de Dades.'
        }
      ],
      cta: {
        label: 'Consultar contactes',
        route: '/contacte'
      }
    },
    'politica-de-cookies': {
      eyebrow: 'Política de cookies',
      title: 'Informació sobre l’ús de cookies i perfils de navegació.',
      intro: 'Les cookies són petits fitxers que s’emmagatzemen al navegador. Aquest lloc utilitza cookies tècniques pròpies i cookies de tercers per analitzar la interacció amb el web.',
      highlight: 'Pots retirar el consentiment o restringir i esborrar les cookies des de la configuració del navegador.',
      legalNote: 'Resum informatiu. La política definitiva ha de reflectir les cookies realment instal·lades i les opcions de consentiment actives al lloc.',
      stats: [
        { label: 'Cookies', value: 'Necessàries' },
        { label: 'Analítica', value: 'Opcional' },
        { label: 'Control', value: 'Total' }
      ],
      cards: [
        {
          title: 'Cookies tècniques',
          text: 'Les cookies tècniques pròpies permeten el funcionament bàsic del lloc web i de les seves opcions.'
        },
        {
          title: 'Cookies d’anàlisi',
          text: 'Les cookies de tercers poden aportar informació sobre la interacció amb el web per ajudar a millorar la navegació.'
        },
        {
          title: 'Consentiment i retirada',
          text: 'El consentiment s’obté mitjançant l’avís de cookies del web. Pots retirar-lo en qualsevol moment o gestionar les cookies des del navegador.'
        }
      ],
      cta: {
        label: 'Inici',
        route: '/'
      }
    },
    'condicions-generals': {
      eyebrow: 'Condicions generals',
      title: 'Condicions de compra, ús i servei que regeixen la nostra activitat.',
      intro: 'Les condicions publicades al web regulen la compra de productes a Cal Sardà, titularitat de Marta Izquierdo Sardà, NIF 47912103K, amb domicili al carrer Marina, 237, 08013 Barcelona.',
      highlight: 'Abans de comprar, revisa les condicions completes i la informació de cada producte al web oficial.',
      legalNote: 'Resum informatiu. Abans de publicar, cal revisar i completar les condicions de compra vigents amb assessorament adequat.',
      stats: [
        { label: 'Compra', value: 'Segura' },
        { label: 'Servei', value: 'Proper' },
        { label: 'Comunicació', value: 'Clara' }
      ],
      cards: [
        {
          title: 'Procés de compra',
          text: 'Abans de confirmar una comanda, l’usuari pot revisar els productes, les quantitats, els preus, els impostos, les despeses d’enviament i el termini previst.'
        },
        {
          title: 'Pagament i confirmació',
          text: 'La comanda es confirma quan Cal Sardà rep el pagament. La informació de preus i enviaments s’ha de comprovar durant el procés de compra.'
        },
        {
          title: 'Ajuda',
          text: 'Per consultar condicions de lliurament, incidències o devolucions, contacta amb Cal Sardà abans de fer la compra.'
        }
      ],
      cta: {
        label: 'Contacta',
        route: '/contacte'
      }
    },
    'mapa-web': {
      eyebrow: 'Mapa web',
      title: 'Tots els racons del nostre web, ordenats i accessibles.',
      intro: 'Aquí tens una visió clara de les seccions principals i complementàries del web, per trobar amb agilitat la informació que busques.',
      highlight: 'Navegació clara i ràpida per a la informació essencial.',
      stats: [],
      cards: [],
      siteLinks: [
        { label: 'Inici', route: '/' },
        { label: 'Història', route: '/historia' },
        { label: 'Botiga en línia', route: '/botiga-en-linia' },
        { label: 'Galeria', route: '/galeria' },
        { label: 'Contacte', route: '/contacte' },
        { label: 'Newsletter', route: '/newsletter-184400' },
        { label: 'Descobreix el territori', route: '/descobreix-el-territori' },
        { label: 'Lots per a empreses', route: '/lots-per-a-empreses' },
        { label: 'Lots i cistelles gurmet', route: '/lots-i-cistelles-gurmet' },
        { label: 'Preguntes freqüents', route: '/faq' },
        { label: 'Blog', route: '/blog' },
        { label: 'Avís legal', route: '/avis-legal' },
        { label: 'Política de privacitat', route: '/politica-de-privacitat' },
        { label: 'Política de cookies', route: '/politica-de-cookies' },
        { label: 'Condicions generals', route: '/condicions-generals' }
      ],
      cta: {
        label: 'Inici',
        route: '/'
      }
    }
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly meta: Meta,
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

  prepareNewsletterRequest(event: SubmitEvent): void {
    event.preventDefault();

    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const email = String(new FormData(form).get('email'));
    const subject = 'Sol·licitud d’alta a la newsletter de Cal Sardà';
    const body = `Si us plau, afegiu aquesta adreça a la newsletter: ${email}`;

    window.location.href = `mailto:sarda@calsarda.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

}
