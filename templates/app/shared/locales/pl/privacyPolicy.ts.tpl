/**
 * Polski — Polityka Prywatności.
 *
 * Treść jest przechowywana oddzielnie od tłumaczeń UI, aby mogła
 * być utrzymywana niezależnie. Wartość jest ciągiem HTML
 * renderowanym przez innerHTML w modalu Stopki.
 */

import type { PrivacyPolicyContent } from '../types.js'

export const privacyPolicy: PrivacyPolicyContent = {
  'content.privacyPolicy': `
    <p><strong>W skrócie: Nie śledzimy Cię w żaden sposób. Nie udostępniamy ani nie sprzedajemy Twoich informacji. Wykorzystujemy dane kontaktowe, które opcjonalnie nam podajesz, do komunikacji z Tobą i przesyłania Ci informacji o {{appName}}.</strong></p>
    <p>W {{appName}} cenimy prywatność naszych odwiedzających. Niniejsza Polityka Prywatności zawiera rodzaje informacji, które są gromadzone i rejestrowane przez {{appName}} oraz sposób, w jaki je wykorzystujemy.</p>
    <p>Jeśli masz dodatkowe pytania lub potrzebujesz więcej informacji na temat naszej Polityki Prywatności, nie wahaj się z nami skontaktować.</p>
    <p>Niniejsza Polityka Prywatności dotyczy wyłącznie naszych działań online i jest ważna dla odwiedzających naszą stronę internetową w odniesieniu do informacji, które udostępnili i/lub zebrali w {{appName}}. Niniejsza polityka nie ma zastosowania do żadnych informacji zbieranych offline lub za pośrednictwem kanałów innych niż ta strona internetowa.</p>
    <h2>Zgoda</h2>
    <p>Korzystając z naszej strony internetowej, niniejszym wyrażasz zgodę na naszą Politykę Prywatności i akceptujesz jej warunki.</p>
    <h2>Informacje, które zbieramy</h2>
    <p>Podawanie danych osobowych jest całkowicie opcjonalne. Zależy to wyłącznie od Ciebie.</p>
    <p>Dane osobowe, o podanie których jesteś proszony, oraz powody, dla których jesteś proszony o ich podanie, zostaną Ci wyjaśnione w momencie, gdy poprosimy Cię o podanie Twoich danych osobowych.</p>
    <p>Jeśli skontaktujesz się z nami bezpośrednio, możemy otrzymać dodatkowe informacje o Tobie, takie jak Twoje imię i nazwisko, adres e-mail, numer telefonu, treść wiadomości i/lub załączniki, które możesz nam przesłać, oraz wszelkie inne informacje, które zdecydujesz się podać.</p>
    <p>Podczas rejestracji konta możemy poprosić o Twoje dane kontaktowe, w tym takie elementy jak imię i nazwisko, adres e-mail, numer telefonu, nazwa firmy i adres.</p>
    <h2>Jak wykorzystujemy Twoje informacje</h2>
    <p>Jeśli zdecydujesz się podać swoje dane osobowe, mogą one zostać wykorzystane w następujących celach:</p>
    <ul>
      <li>Personalizacja w ramach aplikacji</li>
      <li>Komunikacja z Tobą, w tym obsługa klienta, dostarczanie aktualizacji i innych informacji związanych ze stroną internetową oraz w celach marketingowych i promocyjnych</li>
      <li>Wysyłanie Ci wiadomości e-mail</li>
      <li>Zapobieganie oszustwom</li>
    </ul>
    <h2>Pliki dziennika</h2>
    <p>API stosuje standardowe procedury rejestrowania. Rejestrowane informacje obejmują adresy protokołu internetowego (IP), typy przeglądarek (user agents), znaczniki daty i czasu oraz strony odsyłające/wyjściowe. Nie są one powiązane z żadnymi informacjami umożliwiającymi identyfikację osoby. Celem tych informacji jest debugowanie, bezpieczeństwo i utrzymanie działania strony.</p>
    <h2>Pliki cookie</h2>
    <p>Aplikacja wykorzystuje pojedynczy plik cookie przeglądarki, aby bezpiecznie utrzymywać Twoje zalogowanie dla żądań kierowanych do API.</p>
    <p>Nie używamy plików cookie do śledzenia zachowań użytkowników.</p>
    <p>Nie używamy ani nie zezwalamy na żadne pliki cookie lub skrypty od podmiotów trzecich.</p>
    <h2>Prawa ochrony danych RODO</h2>
    <p>Każdy użytkownik ma prawo do:</p>
    <p>Prawo dostępu – Masz prawo żądać kopii swoich danych osobowych.</p>
    <p>Prawo do sprostowania – Masz prawo żądać poprawienia wszelkich informacji, które uważasz za niedokładne. Masz również prawo żądać uzupełnienia informacji, które uważasz za niekompletne.</p>
    <p>Prawo do usunięcia – Masz prawo żądać usunięcia swoich danych osobowych.</p>
    <p>Prawo do ograniczenia przetwarzania – Masz prawo żądać ograniczenia przetwarzania swoich danych osobowych.</p>
    <p>Prawo do sprzeciwu wobec przetwarzania – Masz prawo sprzeciwić się przetwarzaniu przez nas Twoich danych osobowych.</p>
    <p>Prawo do przenoszenia danych – Masz prawo żądać przeniesienia zebranych przez nas danych do innej organizacji lub bezpośrednio do Ciebie.</p>
    <p>Jeśli złożysz wniosek, mamy miesiąc na udzielenie odpowiedzi. Jeśli chcesz skorzystać z któregokolwiek z tych praw, skontaktuj się z nami.</p>
    <h2>Informacje dotyczące dzieci</h2>
    <p>{{appName}} nie zbiera świadomie żadnych Danych Osobowych od dzieci poniżej 13 roku życia. Jeśli uważasz, że Twoje dziecko podało tego rodzaju informacje na naszej stronie internetowej, zachęcamy do natychmiastowego kontaktu z nami, a my dołożymy wszelkich starań, aby niezwłocznie usunąć takie informacje z naszych rejestrów.</p>`,
}
