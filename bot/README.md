# Бот «Коллегам за копеечку»

`kollegam-bot.js` — приёмная для клиентов услуги: анкета, файлы по трекам, статус этапа.
Без зависимостей, Node 18+, long polling. На VPS крутится под pm2 как `kollegam-bot`,
файлы клиентов лежат в `/var/www/kollegam-data/clients/<chat_id>/files/<трек>/`.

## Запуск на VPS
```
cd /var/www/site && pm2 start bot/kollegam-bot.js --name kollegam-bot && pm2 save
```
`bot/.env` на сервере: `BOT_TOKEN`, `ADMIN_CHAT_ID` (узнать через /whoami в боте), `DATA_DIR=/var/www/kollegam-data`.

## Команды администратора (пишет только ADMIN_CHAT_ID)
- `/clients` — список клиентов, этап, сколько файлов
- `/stage <id> <текст>` — сменить этап, клиент получит уведомление
- `/msg <id> <текст>` — написать клиенту от бота
- `/tracks <id>` + названия построчно (или .txt с такой подписью) — задать список треков для кнопок
- `/send <id>` ответом на файл — переслать клиенту документ (таблицу, памятку)

## Забрать файлы клиентов на компьютер
```
powershell -File bot/pull.ps1
```
Копирует `/var/www/kollegam-data/clients` в `Desktop\Коллегам\клиенты\`.

## Админ-консоль с компьютера (делает Claude)
```
ssh -i ~/.ssh/id_ed25519_djlevka_vps_new root@5.42.118.236 "cd /var/www/site && node bot/admin.js clients"
```
Команды admin.js: `clients`, `log <id> [n]`, `stage <id> <текст>`, `msg <id> <текст>`, `send <id> <файл> [подпись]`,
`tracks <id> <файл.txt>`. Файлы для отправки клиентам кладутся в `/var/www/kollegam-data/outbox/` через scp.
Учёт клиентов: `Desktop\Коллегам\Учёт клиентов.md`.
