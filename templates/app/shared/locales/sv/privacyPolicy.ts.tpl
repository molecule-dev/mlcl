/**
 * Swedish — Integritetspolicy.
 *
 * Innehållet hålls separat från UI-översättningar så att
 * det kan underhållas oberoende. Värdet är en HTML-sträng
 * som renderas via innerHTML i sidfotens modala fönster.
 */

import type { PrivacyPolicyContent } from '../types.js'

export const privacyPolicy: PrivacyPolicyContent = {
  'content.privacyPolicy': `
    <p><strong>Sammanfattning: Vi spårar dig inte på något sätt. Vi delar eller säljer inte din information. Vi använder den kontaktinformation du frivilligt ger oss för att kommunicera med dig och skicka information om {{appName}}.</strong></p>
    <p>På {{appName}} värdesätter vi våra besökares integritet. Detta dokument om integritetspolicy innehåller vilka typer av information som samlas in och registreras av {{appName}} och hur vi använder den.</p>
    <p>Om du har ytterligare frågor eller behöver mer information om vår integritetspolicy, tveka inte att kontakta oss.</p>
    <p>Denna integritetspolicy gäller endast för våra onlineaktiviteter och är giltig för besökare på vår webbplats avseende den information som de delat och/eller samlat in i {{appName}}. Denna policy gäller inte för någon information som samlas in offline eller via andra kanaler än denna webbplats.</p>
    <h2>Samtycke</h2>
    <p>Genom att använda vår webbplats samtycker du härmed till vår integritetspolicy och godkänner dess villkor.</p>
    <h2>Information vi samlar in</h2>
    <p>Att tillhandahålla personlig information är helt valfritt. Det är helt upp till dig.</p>
    <p>Den personliga information som du ombeds tillhandahålla, och skälen till varför du ombeds tillhandahålla den, kommer att klargöras för dig vid den tidpunkt vi ber dig att tillhandahålla din personliga information.</p>
    <p>Om du kontaktar oss direkt kan vi ta emot ytterligare information om dig såsom ditt namn, e-postadress, telefonnummer, innehållet i meddelandet och/eller bilagor du kan skicka till oss, och all annan information du väljer att tillhandahålla.</p>
    <p>När du registrerar dig för ett konto kan vi be om din kontaktinformation, inklusive uppgifter som namn, e-postadress, telefonnummer, företagsnamn och adress.</p>
    <h2>Hur vi använder din information</h2>
    <p>Om du väljer att tillhandahålla din personliga information kan den användas för följande:</p>
    <ul>
      <li>Personalisering inom applikationen</li>
      <li>Kommunicera med dig, inklusive för kundservice, för att ge dig uppdateringar och annan information relaterad till webbplatsen, och för marknadsförings- och kampanjändamål</li>
      <li>Skicka e-post till dig</li>
      <li>Förebygga bedrägerier</li>
    </ul>
    <h2>Loggfiler</h2>
    <p>API:et följer standardiserade loggningsrutiner. Den loggade informationen inkluderar internetprotokoll (IP)-adresser, webbläsartyper (användaragenter), datum- och tidsstämplar samt hänvisande/utgångssidor. Dessa är inte kopplade till någon personligt identifierbar information. Syftet med informationen är felsökning, säkerhet och att hålla webbplatsen igång.</p>
    <h2>Cookies</h2>
    <p>Applikationen använder en enda webbläsarcookie för att säkert hålla dig inloggad för förfrågningar till API:et.</p>
    <p>Vi använder inte cookies för att spåra användarbeteende.</p>
    <p>Vi använder eller tillåter inga cookies eller skript från tredje part.</p>
    <h2>GDPR dataskyddsrättigheter</h2>
    <p>Varje användare har rätt till följande:</p>
    <p>Rätten till tillgång – Du har rätt att begära kopior av dina personuppgifter.</p>
    <p>Rätten till rättelse – Du har rätt att begära att vi rättar information som du anser är felaktig. Du har också rätt att begära att vi kompletterar information som du anser är ofullständig.</p>
    <p>Rätten till radering – Du har rätt att begära att vi raderar dina personuppgifter.</p>
    <p>Rätten till begränsning av behandling – Du har rätt att begära att vi begränsar behandlingen av dina personuppgifter.</p>
    <p>Rätten att invända mot behandling – Du har rätt att invända mot vår behandling av dina personuppgifter.</p>
    <p>Rätten till dataportabilitet – Du har rätt att begära att vi överför de uppgifter vi samlat in till en annan organisation, eller direkt till dig.</p>
    <p>Om du gör en begäran har vi en månad på oss att svara dig. Om du vill utöva någon av dessa rättigheter, vänligen kontakta oss.</p>
    <h2>Barns information</h2>
    <p>{{appName}} samlar inte medvetet in någon personligt identifierbar information från barn under 13 år. Om du tror att ditt barn har lämnat denna typ av information på vår webbplats uppmanar vi dig starkt att kontakta oss omedelbart och vi kommer att göra vårt bästa för att snabbt ta bort sådan information från våra register.</p>`,
}
