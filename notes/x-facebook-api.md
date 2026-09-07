# X и Facebook как англоязычные витрины — разбор API (06.09.2026)

Пункт 14 очереди «Делаю я сам» в PLAN.md. Вопрос был: можно ли постить туда из нашего
календаря автоматически, как в Telegram и VK.

## X (Twitter)

- С 6 февраля 2026 у X нет бесплатного тарифа: только оплата за использование, кредиты
  списываются за каждый запрос. Старые тарифы Basic ($200/мес) и Pro ($5 000/мес) закрыты
  и переведены на ту же схему к сентябрю 2026.
- Цена сама по себе копеечная: пост без ссылки ≈ $0.015, пост со ссылкой ≈ $0.20.
  При 3–4 постах в неделю это $1–3 в месяц.
- **Блокер не цена, а оплата:** кредиты покупаются картой, российская не пройдёт.
  Это та же стена, что у Spotify Premium, Printful и Meta Ads — закрывается только картой
  банка СНГ (пункт 1 «Сейчас важнее всего»).
- До карты: постить в X руками через Claude in Chrome (вход пользователя, я публикую).
  Это те же 3–4 поста в неделю, что и в календаре, — переносим текст, EN-подпись уже есть.

## Facebook Page

- Публикация на страницу через Graph API требует прав `pages_manage_posts` +
  `pages_read_engagement` + `pages_show_list`, а они выдаются только после **App Review
  Meta** (записи экрана, политика конфиденциальности на домене) и **Business
  Verification** (документы ИП).
- Приложение может быть то же, что для Instagram Login: в 2026 весь доступ к Instagram
  API идёт через аккаунт Business/Creator, привязанный к странице Facebook. То есть
  одна регистрация Meta закрывает и Instagram, и Facebook — это подтверждает план
  «FB Page через тот же Meta-app».
- Пока регистрация Meta не пройдена (ждём французскую eSIM для не-российского номера),
  путь тот же, что у X: руками через браузер.

## Итог для плана

1. Автопостинг в X и Facebook откладывается до карты СНГ (X) и регистрации Meta (FB).
2. Обе площадки ведём вручную по календарю: пост подтверждён → я публикую через
   Claude in Chrome под входом пользователя. Коннектор в календаре для X/FB не пишем —
   код без ключей проверить нельзя.
3. Когда появится карта: X — купить кредиты на $10, этого хватит на полгода; коннектор
   по образцу telegram/vk займёт один вечер.

Источники: [Postproxy — X API pricing 2026](https://postproxy.dev/blog/x-api-pricing-2026/),
[SocialCrawl — X API 2026](https://www.socialcrawl.dev/blog/x-twitter-api-2026),
[Meta — Pages API getting started](https://developers.facebook.com/docs/pages-api/getting-started/),
[Facebook Page API permissions & App Review 2026](https://singhamandeep.com/facebook-page-api-permissions-app-review/),
[Instagram Graph API 2026](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/).
