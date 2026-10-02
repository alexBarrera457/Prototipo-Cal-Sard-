import { Component } from '@angular/core';
import { Meta } from '@angular/platform-browser';

import { Contact } from '../../components/contact/contact';

@Component({
  selector: 'app-contact-page',
  imports: [Contact],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.css'
})
export class ContactPage {

  constructor(meta: Meta) {
    meta.updateTag({
      name: 'description',
      content: 'Contacta con Cal Sardà, tienda de productos gourmet en la calle Marina, 237, Barcelona. Teléfono 932 32 55 08.'
    });
  }

}
