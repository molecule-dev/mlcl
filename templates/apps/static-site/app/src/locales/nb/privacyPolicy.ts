/**
 * Norwegian Bokmål — Personvernerklæring.
 *
 * Innhold holdes adskilt fra UI-oversettelser slik at det
 * kan vedlikeholdes uavhengig. Verdien er en HTML-streng
 * som vises via innerHTML i Footer-modalen.
 */

import type { PrivacyPolicyContent } from '../types.js'

export const privacyPolicy: PrivacyPolicyContent = {
  'content.privacyPolicy': `
    <p><strong>Kort oppsummert: Vi sporer deg ikke på noen måte. Vi deler eller selger ikke informasjonen din. Vi bruker kontaktinformasjonen du eventuelt gir oss til å kommunisere med deg og sende deg informasjon om {{appName}}.</strong></p>
    <p>Hos {{appName}} verdsetter vi personvernet til våre besøkende. Dette personvernerklæringsdokumentet inneholder typene informasjon som samles inn og registreres av {{appName}} og hvordan vi bruker den.</p>
    <p>Hvis du har ytterligere spørsmål eller trenger mer informasjon om vår personvernerklæring, ikke nøl med å kontakte oss.</p>
    <p>Denne personvernerklæringen gjelder kun for våre nettaktiviteter og er gyldig for besøkende på nettstedet vårt med hensyn til informasjonen de har delt og/eller samlet inn i {{appName}}. Denne erklæringen gjelder ikke for informasjon som er samlet inn frakoblet eller via andre kanaler enn dette nettstedet.</p>
    <h2>Samtykke</h2>
    <p>Ved å bruke nettstedet vårt samtykker du herved til vår personvernerklæring og godtar vilkårene.</p>
    <h2>Informasjon vi samler inn</h2>
    <p>Å oppgi personlig informasjon er helt valgfritt. Det er helt opp til deg.</p>
    <p>Den personlige informasjonen du blir bedt om å oppgi, og grunnene til at du blir bedt om å oppgi den, vil bli gjort tydelig for deg på tidspunktet vi ber deg om å oppgi din personlige informasjon.</p>
    <p>Hvis du kontakter oss direkte, kan vi motta tilleggsinformasjon om deg som navn, e-postadresse, telefonnummer, innholdet i meldingen og/eller vedlegg du kan sende oss, og annen informasjon du velger å oppgi.</p>
    <p>Når du registrerer deg for en konto, kan vi be om kontaktinformasjonen din, inkludert elementer som navn, e-postadresse, telefonnummer, firmanavn og adresse.</p>
    <h2>Hvordan vi bruker informasjonen din</h2>
    <p>Hvis du velger å oppgi din personlige informasjon, kan den brukes til følgende:</p>
    <ul>
      <li>Personalisering i applikasjonen</li>
      <li>Kommunisere med deg, inkludert kundeservice, gi deg oppdateringer og annen informasjon relatert til nettstedet, og for markedsførings- og reklameformål</li>
      <li>Sende deg e-poster</li>
      <li>Forhindre svindel</li>
    </ul>
    <h2>Loggfiler</h2>
    <p>API-et følger standard loggingsprosedyrer. Informasjonen som logges inkluderer internettprotokolladresser (IP), nettlesertyper (brukeragenter), dato- og tidsstempler, og henvisnings-/avslutningssider. Disse er ikke knyttet til noen personlig identifiserbar informasjon. Formålet med informasjonen er feilsøking, sikkerhet og å holde nettstedet i drift.</p>
    <h2>Informasjonskapsler</h2>
    <p>Applikasjonen bruker én nettleserinformasjonskapsel for å holde deg sikkert innlogget for forespørsler til API-et.</p>
    <p>Vi bruker ikke informasjonskapsler til å spore brukeratferd.</p>
    <p>Vi bruker eller tillater ingen informasjonskapsler eller skript fra tredjeparter.</p>
    <h2>GDPR-databeskyttelsesrettigheter</h2>
    <p>Hver bruker har rett til følgende:</p>
    <p>Retten til innsyn – Du har rett til å be om kopier av dine personopplysninger.</p>
    <p>Retten til retting – Du har rett til å be om at vi retter informasjon du mener er unøyaktig. Du har også rett til å be om at vi fullfører informasjon du mener er ufullstendig.</p>
    <p>Retten til sletting – Du har rett til å be om at vi sletter dine personopplysninger.</p>
    <p>Retten til å begrense behandling – Du har rett til å be om at vi begrenser behandlingen av dine personopplysninger.</p>
    <p>Retten til å protestere mot behandling – Du har rett til å protestere mot vår behandling av dine personopplysninger.</p>
    <p>Retten til dataportabilitet – Du har rett til å be om at vi overfører dataene vi har samlet inn til en annen organisasjon, eller direkte til deg.</p>
    <p>Hvis du sender inn en forespørsel, har vi én måned til å svare deg. Hvis du ønsker å utøve noen av disse rettighetene, vennligst kontakt oss.</p>
    <h2>Barns informasjon</h2>
    <p>{{appName}} samler ikke bevisst inn personlig identifiserbar informasjon fra barn under 13 år. Hvis du tror at barnet ditt har oppgitt slik informasjon på nettstedet vårt, oppfordrer vi deg sterkt til å kontakte oss umiddelbart, og vi vil gjøre vårt beste for å fjerne slik informasjon fra våre registre omgående.</p>`,
}
