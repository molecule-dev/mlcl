/**
 * Bosnian — Politika privatnosti.
 *
 * Sadrzaj se cuva odvojeno od UI prijevoda kako bi se
 * mogao odrzavati nezavisno. Vrijednost je HTML string
 * koji se prikazuje putem innerHTML u Footer modalu.
 */

import type { PrivacyPolicyContent } from '../types.js'

export const privacyPolicy: PrivacyPolicyContent = {
  'content.privacyPolicy': `
    <p><strong>Ukratko: Ne pratimo vas ni na koji nacin. Ne dijelimo niti prodajemo vase informacije. Koristimo kontakt informacije koje nam opciono pruzite da komuniciramo s vama i saljemo vam informacije o {{appName}}.</strong></p>
    <p>U {{appName}} cijenimo privatnost nasih posjetilaca. Ovaj dokument Politike privatnosti sadrzi vrste informacija koje {{appName}} prikuplja i biljezi te kako ih koristimo.</p>
    <p>Ako imate dodatnih pitanja ili trebate vise informacija o nasoj Politici privatnosti, ne oklijevajte da nas kontaktirate.</p>
    <p>Ova Politika privatnosti odnosi se samo na nase online aktivnosti i vazi za posjetioce nase web stranice u vezi s informacijama koje su podijelili i/ili prikupili u {{appName}}. Ova politika ne odnosi se na informacije prikupljene offline ili putem kanala koji nisu ova web stranica.</p>
    <h2>Saglasnost</h2>
    <p>Koristenjem nase web stranice ovim pristajete na nasu Politiku privatnosti i slazete se s njenim uslovima.</p>
    <h2>Informacije koje prikupljamo</h2>
    <p>Pruzanje licnih informacija je potpuno opciono. U potpunosti je vasa odluka.</p>
    <p>Licne informacije koje se od vas traze da pruzite, i razlozi zasto se od vas trazi da ih pruzite, bit ce vam jasni u trenutku kada od vas zatrazimo da pruzite svoje licne informacije.</p>
    <p>Ako nas kontaktirate direktno, mozemo primiti dodatne informacije o vama kao sto su vase ime, email adresa, broj telefona, sadrzaj poruke i/ili prilozi koje nam mozete poslati, te bilo koje druge informacije koje odlucite pruziti.</p>
    <p>Kada se registrujete za racun, mozemo traziti vase kontakt informacije, ukljucujuci stavke kao sto su ime, email adresa, broj telefona, naziv kompanije i adresa.</p>
    <h2>Kako koristimo vase informacije</h2>
    <p>Ako odlucite pruziti svoje licne informacije, one se mogu koristiti za sljedece:</p>
    <ul>
      <li>Personalizacija unutar aplikacije</li>
      <li>Komunikacija s vama, ukljucujuci korisnicku podrsku, pruzanje azuriranja i drugih informacija u vezi s web stranicom, te u marketinske i promotivne svrhe</li>
      <li>Slanje emailova</li>
      <li>Sprecavanje prevara</li>
    </ul>
    <h2>Log datoteke</h2>
    <p>API prati standardne procedure logiranja. Informacije koje se biljeze ukljucuju adrese internet protokola (IP), tipove preglednika (korisnicki agenti), datumske i vremenske oznake, te stranice upucivanja/izlaza. Ove informacije nisu povezane s bilo kojim informacijama koje su licno prepoznatljive. Svrha informacija je otklanjanje gresaka, sigurnost i odrzavanje rada stranice.</p>
    <h2>Kolacici</h2>
    <p>Aplikacija koristi jedan kolacic preglednika kako bi vas sigurno odrzala prijavljenim za zahtjeve upucene API-ju.</p>
    <p>Ne koristimo kolacice za pracenje ponasanja korisnika.</p>
    <p>Ne koristimo niti dozvoljavamo kolacice ili skripte od trecih strana.</p>
    <h2>GDPR prava zastite podataka</h2>
    <p>Svaki korisnik ima pravo na sljedece:</p>
    <p>Pravo na pristup – Imate pravo zatraziti kopije vasih licnih podataka.</p>
    <p>Pravo na ispravku – Imate pravo zatraziti da ispravimo bilo koju informaciju za koju smatrate da je netacna. Takodjer imate pravo zatraziti da dopunimo informaciju za koju smatrate da je nepotpuna.</p>
    <p>Pravo na brisanje – Imate pravo zatraziti da izbrisemo vase licne podatke.</p>
    <p>Pravo na ogranicenje obrade – Imate pravo zatraziti da ogranicimo obradu vasih licnih podataka.</p>
    <p>Pravo na prigovor na obradu – Imate pravo prigovoriti nasoj obradi vasih licnih podataka.</p>
    <p>Pravo na prenosivost podataka – Imate pravo zatraziti da podatke koje smo prikupili prenesemo drugoj organizaciji ili direktno vama.</p>
    <p>Ako podnesete zahtjev, imamo mjesec dana da vam odgovorimo. Ako zelite koristiti bilo koje od ovih prava, molimo kontaktirajte nas.</p>
    <h2>Informacije o djeci</h2>
    <p>{{appName}} svjesno ne prikuplja nikakve licno prepoznatljive informacije od djece mladzje od 13 godina. Ako mislite da je vase dijete pruzilo ovakvu vrstu informacija na nasoj web stranici, snazno vas potcicemo da nas odmah kontaktirate i ulozit cemo sve napore da takve informacije brzo uklonimo iz nasih evidencija.</p>`,
}
