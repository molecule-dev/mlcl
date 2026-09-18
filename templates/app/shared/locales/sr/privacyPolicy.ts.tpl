/**
 * Serbian — Politika privatnosti.
 *
 * Sadržaj se čuva odvojeno od prevoda korisničkog
 * interfejsa kako bi se mogao nezavisno održavati.
 * Vrednost je HTML string prikazan putem innerHTML
 * u modalnom prozoru podnožja.
 */

import type { PrivacyPolicyContent } from '../types.js'

export const privacyPolicy: PrivacyPolicyContent = {
  'content.privacyPolicy': `
    <p><strong>Ukratko: Ne pratimo vas ni na koji način. Ne delimo niti prodajemo vaše informacije. Kontakt informacije koje nam dobrovoljno pružite koristimo za komunikaciju sa vama i slanje informacija o {{appName}}.</strong></p>
    <p>U {{appName}} cenimo privatnost naših posetilaca. Ovaj dokument Politike privatnosti sadrži vrste informacija koje {{appName}} prikuplja i beleži i kako ih koristimo.</p>
    <p>Ako imate dodatna pitanja ili vam je potrebno više informacija o našoj Politici privatnosti, ne oklevajte da nas kontaktirate.</p>
    <p>Ova Politika privatnosti se primenjuje samo na naše onlajn aktivnosti i važi za posetioce naše veb stranice u vezi sa informacijama koje su podelili i/ili prikupili u {{appName}}. Ova politika se ne primenjuje na bilo koje informacije prikupljene van mreže ili putem kanala koji nisu ova veb stranica.</p>
    <h2>Saglasnost</h2>
    <p>Korišćenjem naše veb stranice, ovim pristajete na našu Politiku privatnosti i slažete se sa njenim uslovima.</p>
    <h2>Informacije koje prikupljamo</h2>
    <p>Pružanje ličnih podataka je potpuno opciono. To je u potpunosti vaša odluka.</p>
    <p>Lični podaci koje se od vas traži da pružite, i razlozi zašto se od vas traži da ih pružite, biće vam jasno objašnjeni u trenutku kada vas zamolimo da pružite vaše lične podatke.</p>
    <p>Ako nas kontaktirate direktno, možemo primiti dodatne informacije o vama kao što su vaše ime, adresa e-pošte, broj telefona, sadržaj poruke i/ili prilozi koje nam možete poslati, i sve druge informacije koje odaberete da pružite.</p>
    <p>Kada se registrujete za nalog, možemo zatražiti vaše kontakt informacije, uključujući stavke kao što su ime, adresa e-pošte, broj telefona, naziv kompanije i adresa.</p>
    <h2>Kako koristimo vaše informacije</h2>
    <p>Ako odaberete da pružite vaše lične podatke, oni mogu biti korišćeni za sledeće:</p>
    <ul>
      <li>Personalizacija unutar aplikacije</li>
      <li>Komunikacija sa vama, uključujući korisničku podršku, pružanje ažuriranja i drugih informacija vezanih za veb stranicu, i u marketinške i promotivne svrhe</li>
      <li>Slanje e-poruka</li>
      <li>Sprečavanje prevare</li>
    </ul>
    <h2>Datoteke evidencije</h2>
    <p>API prati standardne procedure evidentiranja. Evidentirane informacije uključuju adrese internet protokola (IP), tipove pregledača (korisnički agenti), datumske i vremenske oznake, i stranice upućivanja/izlaza. Ove informacije nisu povezane sa bilo kojim lično prepoznatljivim informacijama. Svrha ovih informacija je za otklanjanje grešaka, bezbednost i održavanje rada sajta.</p>
    <h2>Kolačići</h2>
    <p>Aplikacija koristi jedan kolačić pregledača da vas bezbedno drži prijavljenim za zahteve upućene ka API-ju.</p>
    <p>Ne koristimo kolačiće za praćenje ponašanja korisnika.</p>
    <p>Ne koristimo niti dozvoljavamo kolačiće ili skripte trećih strana.</p>
    <h2>GDPR prava zaštite podataka</h2>
    <p>Svaki korisnik ima pravo na sledeće:</p>
    <p>Pravo na pristup – Imate pravo da zatražite kopije vaših ličnih podataka.</p>
    <p>Pravo na ispravku – Imate pravo da zatražite da ispravimo bilo koje informacije za koje smatrate da su netačne. Takođe imate pravo da zatražite da dopunimo informacije za koje smatrate da su nepotpune.</p>
    <p>Pravo na brisanje – Imate pravo da zatražite da obrišemo vaše lične podatke.</p>
    <p>Pravo na ograničenje obrade – Imate pravo da zatražite da ograničimo obradu vaših ličnih podataka.</p>
    <p>Pravo na prigovor na obradu – Imate pravo da prigovorite našoj obradi vaših ličnih podataka.</p>
    <p>Pravo na prenosivost podataka – Imate pravo da zatražite da podatke koje smo prikupili prenesemo drugoj organizaciji, ili direktno vama.</p>
    <p>Ako podnesete zahtev, imamo mesec dana da vam odgovorimo. Ako želite da ostvarite bilo koje od ovih prava, molimo vas da nas kontaktirate.</p>
    <h2>Informacije o deci</h2>
    <p>{{appName}} svesno ne prikuplja lične identifikacione informacije od dece mlađe od 13 godina. Ako smatrate da je vaše dete pružilo ovu vrstu informacija na našoj veb stranici, snažno vas ohrabrujemo da nas odmah kontaktirate i mi ćemo uložiti sve napore da takve informacije promptno uklonimo iz naših evidencija.</p>`,
}
