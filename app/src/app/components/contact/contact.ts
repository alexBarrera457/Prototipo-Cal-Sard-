import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-contact',
  imports: [],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {

  @Input() showPageTitle = false;

  prepareEmail(event: SubmitEvent): void {
    event.preventDefault();

    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const formData = new FormData(form);
    const subject = String(formData.get('subject'));
    const body = [
      `Nombre: ${String(formData.get('name'))}`,
      `Correo: ${String(formData.get('email'))}`,
      '',
      String(formData.get('message'))
    ].join('\n');
    const mailto = `mailto:sarda@calsarda.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  }

}
