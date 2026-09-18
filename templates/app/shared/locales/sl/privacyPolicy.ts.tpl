/**
 * Slovenian — Pravilnik o zasebnosti.
 *
 * Vsebina je ločena od prevodov uporabniškega vmesnika,
 * da jo je mogoče vzdrževati neodvisno. Vrednost je
 * HTML niz, prikazan prek innerHTML v modalnem oknu noge.
 */

import type { PrivacyPolicyContent } from '../types.js'

export const privacyPolicy: PrivacyPolicyContent = {
  'content.privacyPolicy': `
    <p><strong>Povzetek: Vas ne sledimo na noben način. Vaših podatkov ne delimo ali prodajamo. Kontaktne podatke, ki nam jih prostovoljno posredujete, uporabljamo za komunikacijo z vami in za pošiljanje informacij o {{appName}}.</strong></p>
    <p>Pri {{appName}} cenimo zasebnost naših obiskovalcev. Ta dokument o pravilniku zasebnosti vsebuje vrste informacij, ki jih {{appName}} zbira in beleži, ter kako jih uporabljamo.</p>
    <p>Če imate dodatna vprašanja ali potrebujete več informacij o našem Pravilniku o zasebnosti, nas ne oklevajte kontaktirati.</p>
    <p>Ta Pravilnik o zasebnosti velja samo za naše spletne dejavnosti in je veljaven za obiskovalce naše spletne strani v zvezi z informacijami, ki so jih delili in/ali zbirali v {{appName}}. Ta pravilnik ne velja za nobene informacije, zbrane brez povezave ali prek drugih kanalov kot ta spletna stran.</p>
    <h2>Soglasje</h2>
    <p>Z uporabo naše spletne strani s tem privolite v naš Pravilnik o zasebnosti in se strinjate z njegovimi pogoji.</p>
    <h2>Informacije, ki jih zbiramo</h2>
    <p>Posredovanje osebnih podatkov je povsem neobvezno. Odločitev je v celoti vaša.</p>
    <p>Osebni podatki, ki jih prosimo, da jih posredujete, in razlogi, zakaj vas prosimo, da jih posredujete, vam bodo pojasnjeni v trenutku, ko vas bomo prosili za posredovanje vaših osebnih podatkov.</p>
    <p>Če nas kontaktirate neposredno, lahko prejmemo dodatne informacije o vas, kot so vaše ime, e-poštni naslov, telefonska številka, vsebina sporočila in/ali priponke, ki nam jih lahko pošljete, ter vse druge informacije, ki jih želite posredovati.</p>
    <p>Ko se registrirate za račun, vas lahko prosimo za kontaktne podatke, vključno s podatki, kot so ime, e-poštni naslov, telefonska številka, ime podjetja in naslov.</p>
    <h2>Kako uporabljamo vaše podatke</h2>
    <p>Če se odločite posredovati svoje osebne podatke, se lahko uporabijo za naslednje:</p>
    <ul>
      <li>Personalizacija znotraj aplikacije</li>
      <li>Komunikacija z vami, vključno za storitve za stranke, za zagotavljanje posodobitev in drugih informacij, povezanih s spletno stranjo, ter za trženje in promocijske namene</li>
      <li>Pošiljanje e-poštnih sporočil</li>
      <li>Preprečevanje goljufij</li>
    </ul>
    <h2>Dnevniške datoteke</h2>
    <p>API sledi standardnim postopkom beleženja. Zabeležene informacije vključujejo naslove internetnega protokola (IP), vrste brskalnikov (uporabniški agenti), datumske in časovne žige ter napotilne/izhodne strani. Te niso povezane z nobeno osebno prepoznavno informacijo. Namen teh informacij je odpravljanje napak, varnost in vzdrževanje delovanja spletne strani.</p>
    <h2>Piškotki</h2>
    <p>Aplikacija uporablja en sam piškotek brskalnika, da vas varno ohranja prijavljenega za zahteve, poslane na API.</p>
    <p>Ne uporabljamo piškotkov za sledenje vedenju uporabnikov.</p>
    <p>Ne uporabljamo in ne dovoljujemo nobenih piškotkov ali skriptov tretjih oseb.</p>
    <h2>Pravice varstva podatkov po GDPR</h2>
    <p>Vsak uporabnik je upravičen do naslednjega:</p>
    <p>Pravica do dostopa – Imate pravico zahtevati kopije svojih osebnih podatkov.</p>
    <p>Pravica do popravka – Imate pravico zahtevati, da popravimo vse informacije, za katere menite, da so netočne. Imate tudi pravico zahtevati, da dopolnimo informacije, za katere menite, da so nepopolne.</p>
    <p>Pravica do izbrisa – Imate pravico zahtevati, da izbrišemo vaše osebne podatke.</p>
    <p>Pravica do omejitve obdelave – Imate pravico zahtevati, da omejimo obdelavo vaših osebnih podatkov.</p>
    <p>Pravica do ugovora obdelavi – Imate pravico ugovarjati naši obdelavi vaših osebnih podatkov.</p>
    <p>Pravica do prenosljivosti podatkov – Imate pravico zahtevati, da podatke, ki smo jih zbrali, prenesemo v drugo organizacijo ali neposredno vam.</p>
    <p>Če podate zahtevo, imamo en mesec časa, da vam odgovorimo. Če želite uveljaviti katero koli od teh pravic, nas prosim kontaktirajte.</p>
    <h2>Informacije o otrocih</h2>
    <p>{{appName}} zavestno ne zbira nobenih osebno prepoznavnih informacij od otrok, mlajših od 13 let. Če menite, da je vaš otrok posredoval tovrstne informacije na naši spletni strani, vas močno spodbujamo, da nas takoj kontaktirate, in storili bomo vse, da takšne informacije čim prej odstranimo iz naših evidenc.</p>`,
}
