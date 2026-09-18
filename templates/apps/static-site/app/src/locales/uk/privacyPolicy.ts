/**
 * Ukrainian — Polityka konfidentsiinosti.
 *
 * Vmist zberihaietsja okremo vid perekladiv interfejsu, shchob joho
 * mozhna bulo pidtrymuvaty nezalezhno. Znachennia — tse HTML-riadok,
 * shcho vidobrazhaietsja cherez innerHTML u modali Footer.
 */

import type { PrivacyPolicyContent } from '../types.js'

export const privacyPolicy: PrivacyPolicyContent = {
  'content.privacyPolicy': `
    <p><strong>Korotko: My ne vidstezhuyemo vas u zhodnyy sposib. My ne peredayemo i ne prodayemo vashu informatsiyu. My vykorystovuyemo kontaktnu informatsiyu, yaku vy za bazhanniam nadayete nam, dlya zvyazku z vamy ta nadsilanniya vam informatsii pro {{appName}}.</strong></p>
    <p>U {{appName}} my tsinuyemo konfidentsiynist nashykh vidviduvachiv. Tsey dokument Polityky konfidentsiynosti mistyt typy informatsii, yaka zbyrayetsya ta fiksuyet'sya {{appName}}, i te, yak my yiyi vykorystovuyemo.</p>
    <p>Yakshcho u vas ye dodatkovi pytannya abo vam potribna dodatkova informatsiia pro nashu Polityku konfidentsiynosti, ne vahaitesya zvyazatysya z namy.</p>
    <p>Tsya Polityka konfidentsiynosti zastosovuyet'sya lyshe do nashykh onlayn-diy i ye diysnoy dlya vidviduvachiv nashoho veb-saytu shchodo informatsii, yakoyu vony podililysia ta/abo zibranoi u {{appName}}. Tsya polityka ne zastosovuyet'sya do budyakoi informatsii, zibranoi oflain abo cherez inshi kanaly, krim tsyoho veb-saytu.</p>
    <h2>Zghoda</h2>
    <p>Korystuyuchys nashym veb-saytom, vy tsym samym nadayete zghodu na nashu Polityku konfidentsiynosti ta pohodzhuyetesya z yiyi umovamy.</p>
    <h2>Informatsiia, yaku my zbyraiemo</h2>
    <p>Nadannia osobystoi informatsii ye tskilkom dobrovilnym. Tse povnistyu zalezhyt vid vas.</p>
    <p>Osobysta informatsiia, yaku vas prosiat nadaty, ta prychyny, chomu vas prosiat yiyi nadaty, budut chutko poyasneni vam u toy moment, koly my poprosymo vas nadaty vashu osobystu informatsiyu.</p>
    <p>Yakshcho vy zvyazhuyet'sya z namy bezposerednio, my mozhemo otrymaty dodatkovu informatsiyu pro vas, taku yak vashe imya, adresa elektronnoi poshty, nomer telefonu, zmist povidomlennya ta/abo vkladennya, yaki vy mozhete nam nadislaty, ta budy-yaku inshu informatsiyu, yaku vy mozhete obrati nadaty.</p>
    <p>Koly vy reyestruyete oblikovyy zapys, my mozhemo zapytyty vashu kontaktnu informatsiyu, vklyuchayuchy taki dani, yak imya, adresa elektronnoi poshty, nomer telefonu, nazva kompanii ta adresa.</p>
    <h2>Yak my vykorystovuyemo vashu informatsiyu</h2>
    <p>Yakshcho vy vyrishyte nadaty svoyu osobystu informatsiyu, vona mozhe buty vykorystana dlya nastupnoho:</p>
    <ul>
      <li>Personalizatsiia v mezhakh dodatku</li>
      <li>Zvyazok z vamy, vklyuchayuchy obsluhovuvannia kliientiv, nadannia vam onovlen ta inshoi informatsii, povyazanoi z veb-saytom, a takozh dlya marketynhovykh ta reklamnykh tsilei</li>
      <li>Nadsilannia vam elektronykh lystiv</li>
      <li>Zapobihannia shakhraistvu</li>
    </ul>
    <h2>Faily zhurnaliv</h2>
    <p>API dotrymuyet'sya standartnykh protsedur zhurnaliuvannia. Informatsiia, yaka zhurnaliuyet'sya, vklyuchaye adresy internet-protokolu (IP), typy brauzeriv (korystuvats'ki ahenty), mitky daty ta chasu ta storinky perekhodiv/vykhodiv. Vony ne povyazani z zhodonoyu informatsiyeyu, yaka ye osobysto identyfikovonoyu. Meta informatsii — tse nalahodzhennia, bezpeka ta pidtrymka roboty saytu.</p>
    <h2>Faily cookie</h2>
    <p>Dodatok vykorystovuye odyn fayl cookie brauzera dlya bezpechnoho zberezhennia vashoi avtoryzatsii dlya zapytiv do API.</p>
    <p>My ne vykorystovuyemo faily cookie dlya vidstezhennia povedinky korystuvachiv.</p>
    <p>My ne vykorystovuyemo i ne dozvolyaiemo zhodni faily cookie abo skrypty vid tretikh storin.</p>
    <h2>Prava zakhystu danykh GDPR</h2>
    <p>Kozhen korystuvach maye pravo na nastupne:</p>
    <p>Pravo na dostup — Vy mayete pravo zapytuvaty kopii vashykh osobystykh danykh.</p>
    <p>Pravo na vypravlennia — Vy mayete pravo vymaghaty, shchob my vypravyly budy-yaku informatsiyu, yaku vy vvazhayete netochnoyu. Vy takozh mayete pravo vymaghaty, shchob my dopovnyly informatsiyu, yaku vy vvazhayete nepovnoyu.</p>
    <p>Pravo na vydalennia — Vy mayete pravo vymaghaty, shchob my vydalyly vashi osobysti dani.</p>
    <p>Pravo na obmezhennia obrobky — Vy mayete pravo vymaghaty, shchob my obmezhyly obrobku vashykh osobystykh danykh.</p>
    <p>Pravo na zaperechennia proty obrobky — Vy mayete pravo zaperechuvaty proty obrobky vashykh osobystykh danykh.</p>
    <p>Pravo na perenesennnia danykh — Vy mayete pravo vymaghaty, shchob my peredaly dani, yaki my zibraly, inshiy orhanizatsii abo bezposerednio vam.</p>
    <p>Yakshcho vy podaste zapyt, u nas ye odyn misyats, shchob vidpovisti vam. Yakshcho vy bazhayete skorystatysya budy-yakym iz tsykh prav, budy laska, zvyazhit'sya z namy.</p>
    <h2>Informatsiia pro ditei</h2>
    <p>{{appName}} svidomo ne zbiraye zhodnoi osobystoi informatsii, shcho identyfikuye osobu, vid ditei vikom do 13 rokiv. Yakshcho vy vvazhayete, shcho vasha dytyna nadala takoho rodu informatsiyu na nashomu veb-sayti, my nastiino rekomenduiemo vam naihaino zvyazatysya z namy, i my dokhademo vsikh zusyl, shchob operatyvno vydalyty takyho rodu informatsiyu z nashykh zapysiv.</p>`,
}
