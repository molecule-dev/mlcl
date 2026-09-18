/**
 * Uzbek — Maxfiylik siyosati.
 *
 * Kontent UI tarjimalaridan alohida saqlanadi, shuning uchun
 * uni mustaqil ravishda boshqarish mumkin. Qiymat — Footer
 * modalida innerHTML orqali ko'rsatiladigan HTML satr.
 */

import type { PrivacyPolicyContent } from '../types.js'

export const privacyPolicy: PrivacyPolicyContent = {
  'content.privacyPolicy': `
    <p><strong>Qisqacha aytganda: Biz sizni hech qanday tarzda kuzatmaymiz. Biz sizning ma'lumotlaringizni ulashmaymiz yoki sotmaymiz. Siz bilan bog'lanish va {{appName}} haqida ma'lumot yuborish uchun siz ixtiyoriy ravishda bizga taqdim etgan aloqa ma'lumotlaridan foydalanamiz.</strong></p>
    <p>{{appName}} da biz tashrif buyuruvchilarimizning maxfiyligini qadrlaymiz. Ushbu Maxfiylik siyosati hujjati {{appName}} tomonidan to'plangan va qayd etilgan ma'lumot turlarini va biz ulardan qanday foydalanishimizni o'z ichiga oladi.</p>
    <p>Agar sizda qo'shimcha savollar bo'lsa yoki Maxfiylik siyosatimiz haqida ko'proq ma'lumot kerak bo'lsa, biz bilan bog'lanishdan tortinmang.</p>
    <p>Ushbu Maxfiylik siyosati faqat bizning onlayn faoliyatimizga taalluqli bo'lib, veb-saytimiz tashrif buyuruvchilari uchun ular {{appName}} da ulashgan va/yoki to'plagan ma'lumotlarga nisbatan amal qiladi. Ushbu siyosat oflayn yoki ushbu veb-saytdan boshqa kanallar orqali to'plangan hech qanday ma'lumotga taalluqli emas.</p>
    <h2>Rozilik</h2>
    <p>Bizning veb-saytimizdan foydalanib, siz Maxfiylik siyosatimizga rozilik bildirasiz va uning shartlariga rozi bo'lasiz.</p>
    <h2>Biz to'playdigan ma'lumotlar</h2>
    <p>Shaxsiy ma'lumot taqdim etish to'liq ixtiyoriy. Bu to'liq sizga bog'liq.</p>
    <p>Sizdan taqdim etishingiz so'raladigan shaxsiy ma'lumotlar va ularni taqdim etishingiz so'ralishining sabablari, biz sizdan shaxsiy ma'lumotlaringizni taqdim etishingizni so'ragan paytda sizga aniq tushuntiriladi.</p>
    <p>Agar siz biz bilan to'g'ridan-to'g'ri bog'lansangiz, biz sizning ismingiz, elektron pochta manzilingiz, telefon raqamingiz, xabar mazmuni va/yoki siz yuborishi mumkin bo'lgan ilovalar va siz taqdim etishni tanlashi mumkin bo'lgan boshqa har qanday ma'lumot kabi qo'shimcha ma'lumotlarni olishimiz mumkin.</p>
    <p>Hisob qaydnomasiga ro'yxatdan o'tganingizda, biz sizning aloqa ma'lumotlaringizni, jumladan ism, elektron pochta manzili, telefon raqami, kompaniya nomi va manzil kabi ma'lumotlarni so'rashimiz mumkin.</p>
    <h2>Biz ma'lumotlaringizdan qanday foydalanamiz</h2>
    <p>Agar siz shaxsiy ma'lumotlaringizni taqdim etishni tanlasangiz, ular quyidagilar uchun ishlatilishi mumkin:</p>
    <ul>
      <li>Ilova ichida shaxsiylashtirish</li>
      <li>Siz bilan aloqa qilish, jumladan mijozlarga xizmat ko'rsatish, veb-saytga oid yangilanishlar va boshqa ma'lumotlarni taqdim etish hamda marketing va reklama maqsadlari uchun</li>
      <li>Sizga elektron pochta xabarlarini yuborish</li>
      <li>Firibgarlikning oldini olish</li>
    </ul>
    <h2>Jurnal fayllari</h2>
    <p>API standart jurnallash tartiblariga amal qiladi. Qayd etilgan ma'lumotlar orasida internet protokoli (IP) manzillari, brauzer turlari (foydalanuvchi agentlari), sana va vaqt belgilari va yo'naltiruvchi/chiqish sahifalari mavjud. Bular shaxsiy identifikatsiya qilinishi mumkin bo'lgan hech qanday ma'lumotga bog'lanmagan. Ma'lumotlarning maqsadi — nosozliklarni bartaraf etish, xavfsizlik va saytni ishlashda saqlash.</p>
    <h2>Cookie fayllar</h2>
    <p>Ilova API ga yuborilgan so'rovlar uchun sizni xavfsiz tarzda tizimga kirgan holda saqlash uchun bitta brauzer cookie faylidan foydalanadi.</p>
    <p>Biz foydalanuvchi xatti-harakatlarini kuzatish uchun cookie fayllaridan foydalanmaymiz.</p>
    <p>Biz uchinchi tomon cookie fayllari yoki skriptlaridan foydalanmaymiz va ruxsat bermaymiz.</p>
    <h2>GDPR Ma'lumotlarni himoya qilish huquqlari</h2>
    <p>Har bir foydalanuvchi quyidagi huquqlarga ega:</p>
    <p>Kirish huquqi — Siz shaxsiy ma'lumotlaringizning nusxalarini so'rash huquqiga egasiz.</p>
    <p>Tuzatish huquqi — Siz noto'g'ri deb hisoblagan har qanday ma'lumotni tuzatishimizni so'rash huquqiga egasiz. Siz shuningdek to'liq emas deb hisoblagan ma'lumotlarni to'ldirishimizni so'rash huquqiga ham egasiz.</p>
    <p>O'chirish huquqi — Siz shaxsiy ma'lumotlaringizni o'chirishimizni so'rash huquqiga egasiz.</p>
    <p>Qayta ishlashni cheklash huquqi — Siz shaxsiy ma'lumotlaringizni qayta ishlashni cheklashimizni so'rash huquqiga egasiz.</p>
    <p>Qayta ishlashga e'tiroz bildirish huquqi — Siz shaxsiy ma'lumotlaringizni qayta ishlashimizga e'tiroz bildirish huquqiga egasiz.</p>
    <p>Ma'lumotlar ko'chiruvchanligi huquqi — Siz biz to'plagan ma'lumotlarni boshqa tashkilotga yoki to'g'ridan-to'g'ri sizga o'tkazishimizni so'rash huquqiga egasiz.</p>
    <p>Agar siz so'rov yuborsangiz, sizga javob berish uchun bir oyimiz bor. Agar siz ushbu huquqlardan birini amalga oshirishni xohlasangiz, iltimos biz bilan bog'laning.</p>
    <h2>Bolalar haqida ma'lumot</h2>
    <p>{{appName}} 13 yoshdan kichik bolalardan ataylab hech qanday Shaxsiy Identifikatsiya Ma'lumotlarini to'plamaydi. Agar siz bolangiz bizning veb-saytimizda bunday turdagi ma'lumotlarni taqdim etgan deb hisoblasangiz, biz sizni darhol biz bilan bog'lanishga qat'iy undaymiz va bunday ma'lumotlarni yozuvlarimizdan tezda olib tashlash uchun bor kuchimizni sarflaymiz.</p>`,
}
