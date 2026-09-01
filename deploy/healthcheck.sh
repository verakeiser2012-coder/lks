#!/bin/bash
# Проверка, что сайт отвечает. Если нет — поднять и написать письмо.
#
# Чего эта проверка НЕ умеет: она живёт на том же сервере, поэтому не заметит
# ни падения самого сервера, ни блокировки, ни проблем с сетью снаружи.
# Она ловит только случай «сервер жив, приложение легло» — самый частый.
# Внешний монитор всё равно нужен отдельно.
#
# Cron: */5 * * * * /root/healthcheck.sh >> /root/db-backups/health.log 2>&1

STATE=/root/.site-health-state
URL="http://127.0.0.1:3000/"

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: levkeiser.com' "$URL")

# 401 — нормальный ответ, пока сайт под паролем
if [ "$code" = "200" ] || [ "$code" = "401" ] || [ "$code" = "302" ]; then
  if [ -f "$STATE" ]; then
    rm -f "$STATE"
    node /var/www/site/deploy/send-alert.js "восстановился" "Сайт снова отвечает, код $code." 2>/dev/null
    echo "$(date -Is) ok $code — восстановился"
  fi
  exit 0
fi

echo "$(date -Is) ПРОБЛЕМА: код $code"

# Уже сообщали — не спамим письмами каждые пять минут
if [ -f "$STATE" ]; then
  echo "$(date -Is) письмо уже отправлено ранее, молчим"
  exit 1
fi

pm2 restart site >/dev/null 2>&1
sleep 8
code2=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H 'Host: levkeiser.com' "$URL")

if [ "$code2" = "200" ] || [ "$code2" = "401" ] || [ "$code2" = "302" ]; then
  node /var/www/site/deploy/send-alert.js "сайт падал и поднят" \
    "Приложение не отвечало (код $code), перезапущено автоматически. Сейчас отвечает: $code2. Стоит посмотреть pm2 logs site." 2>/dev/null
  echo "$(date -Is) перезапуск помог: $code2"
  exit 0
fi

touch "$STATE"
node /var/www/site/deploy/send-alert.js "САЙТ ЛЕЖИТ" \
  "Приложение не отвечает (код $code), автоматический перезапуск не помог (код $code2). Нужны руки." 2>/dev/null
echo "$(date -Is) перезапуск НЕ помог: $code2"
exit 1
