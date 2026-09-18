/**
 * Finnish — Privacy Policy.
 *
 * Content is kept separate from UI translations so it can be
 * maintained independently. Value is an HTML string rendered
 * via innerHTML in the Footer modal.
 */

import type { PrivacyPolicyContent } from '../types.js'

export const privacyPolicy: PrivacyPolicyContent = {
  'content.privacyPolicy': `
    <p><strong>Yhteenveto: Emme seuraa sinua millään tavalla. Emme jaa tai myy tietojasi. Käytämme valinnaisesti antamiasi yhteystietoja kommunikoidaksemme kanssasi ja lähettääksemme sinulle tietoa {{appName}}-palvelusta.</strong></p>
    <p>{{appName}}-palvelussa arvostamme vierailijoidemme yksityisyyttä. Tämä tietosuojakäytäntö sisältää tietoa siitä, millaisia tietoja {{appName}} kerää ja tallentaa sekä miten niitä käytetään.</p>
    <p>Jos sinulla on lisäkysymyksiä tai tarvitset lisätietoa tietosuojakäytännöstämme, älä epäröi ottaa meihin yhteyttä.</p>
    <p>Tämä tietosuojakäytäntö koskee ainoastaan verkkotoimintaamme ja on voimassa verkkosivustomme vierailijoille heidän {{appName}}-palvelussa jakamansa ja/tai keräämänsä tiedon osalta. Tämä käytäntö ei koske tietoja, jotka on kerätty offline-tilassa tai muiden kanavien kautta kuin tämän verkkosivuston.</p>
    <h2>Suostumus</h2>
    <p>Käyttämällä verkkosivustoamme hyväksyt tietosuojakäytäntömme ja suostut sen ehtoihin.</p>
    <h2>Keräämämme tiedot</h2>
    <p>Henkilötietojen antaminen on täysin vapaaehtoista. Se on kokonaan sinun päätettävissäsi.</p>
    <p>Henkilötiedot, joita sinua pyydetään antamaan, ja syyt, miksi sinua pyydetään antamaan ne, selvitetään sinulle siinä vaiheessa, kun pyydämme henkilötietojasi.</p>
    <p>Jos otat meihin suoraan yhteyttä, saatamme vastaanottaa lisätietoja sinusta, kuten nimesi, sähköpostiosoitteesi, puhelinnumerosi, viestin sisällön ja/tai liitteet, jotka saatat lähettää meille, sekä muut tiedot, jotka päätät antaa.</p>
    <p>Kun rekisteröidyt tilille, saatamme pyytää yhteystietojasi, kuten nimeä, sähköpostiosoitetta, puhelinnumeroa, yrityksen nimeä ja osoitetta.</p>
    <h2>Miten käytämme tietojasi</h2>
    <p>Jos päätät antaa henkilötietojasi, niitä voidaan käyttää seuraaviin tarkoituksiin:</p>
    <ul>
      <li>Personointi sovelluksessa</li>
      <li>Yhteydenpito kanssasi, mukaan lukien asiakaspalvelu, päivitysten ja muun verkkosivustoon liittyvän tiedon tarjoaminen sekä markkinointi- ja mainostarkoitukset</li>
      <li>Sähköpostien lähettäminen sinulle</li>
      <li>Petosten estäminen</li>
    </ul>
    <h2>Lokitiedostot</h2>
    <p>API noudattaa vakiomuotoisia lokituskäytäntöjä. Lokitettavat tiedot sisältävät IP-osoitteita, selaintyyppejä (käyttäjäagentteja), päivämäärä- ja aikaleimoja sekä viittaus-/poistumissivuja. Näitä ei ole yhdistetty mihinkään henkilökohtaisesti tunnistettavaan tietoon. Tietojen tarkoitus on virheenkorjaus, turvallisuus ja sivuston toiminnan ylläpitäminen.</p>
    <h2>Evästeet</h2>
    <p>Sovellus käyttää yhtä selaimen evästettä pitääkseen sinut turvallisesti kirjautuneena API:lle tehtävissä pyynnöissä.</p>
    <p>Emme käytä evästeitä käyttäjien käyttäytymisen seuraamiseen.</p>
    <p>Emme käytä tai salli kolmansien osapuolten evästeitä tai skriptejä.</p>
    <h2>GDPR-tietosuojaoikeudet</h2>
    <p>Jokaisella käyttäjällä on oikeus seuraaviin:</p>
    <p>Oikeus saada pääsy tietoihin – Sinulla on oikeus pyytää kopioita henkilötiedoistasi.</p>
    <p>Oikeus oikaisuun – Sinulla on oikeus pyytää, että korjaamme tiedot, jotka uskot virheellisiksi. Sinulla on myös oikeus pyytää, että täydennämme tiedot, jotka uskot puutteellisiksi.</p>
    <p>Oikeus poistamiseen – Sinulla on oikeus pyytää, että poistamme henkilötietosi.</p>
    <p>Oikeus käsittelyn rajoittamiseen – Sinulla on oikeus pyytää, että rajoitamme henkilötietojesi käsittelyä.</p>
    <p>Oikeus vastustaa käsittelyä – Sinulla on oikeus vastustaa henkilötietojesi käsittelyä.</p>
    <p>Oikeus tietojen siirrettävyyteen – Sinulla on oikeus pyytää, että siirrämme keräämämme tiedot toiselle organisaatiolle tai suoraan sinulle.</p>
    <p>Jos teet pyynnön, meillä on kuukausi aikaa vastata sinulle. Jos haluat käyttää mitä tahansa näistä oikeuksista, ota meihin yhteyttä.</p>
    <h2>Lasten tiedot</h2>
    <p>{{appName}} ei tietoisesti kerää henkilökohtaisesti tunnistettavia tietoja alle 13-vuotiailta lapsilta. Jos uskot, että lapsesi on antanut tällaisia tietoja verkkosivustollamme, kehotamme sinua ottamaan meihin välittömästi yhteyttä, ja teemme parhaamme poistaaksemme tällaiset tiedot nopeasti rekistereistämme.</p>`,
}
