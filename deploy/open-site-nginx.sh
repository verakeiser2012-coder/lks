#!/bin/bash
# День открытия, шаги 7–9 плана (notes/opening-day-plan.md):
# снять пароль «Preview» в nginx, проверить все 18 доменов, убрать пользователя bank.
#
# Запуск на сервере от root:  bash /var/www/site/deploy/open-site-nginx.sh
# Проверка без изменений:     bash /var/www/site/deploy/open-site-nginx.sh --check
#
# Почему отдельный скрипт, а не правка руками: auth_basic стоит в пяти server-блоках,
# и пропустить один — значит оставить часть доменов под паролем. Скрипт снимает все
# разом, а потом сам проверяет, что каждый домен отвечает как задумано.
#
# Откат: cp /root/nginx-site.bak-<дата> /etc/nginx/sites-enabled/site && nginx -t && systemctl reload nginx
set -euo pipefail

CONF=/etc/nginx/sites-enabled/site
HTPASSWD=/etc/nginx/.htpasswd
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

# Ожидаемые ответы. Канонические домены отдают сайт (200; у магазина главная — 302 в каталог),
# остальные приложение само переводит на канонический (301). Список совпадает с
# src/config/domains.js — если там что-то поменяется, поправить и здесь.
declare -A EXPECT=(
  [levkeiser.com]=200
  [levkeiser.shop]=302
  [xn--b1afbatee0ch.xn--p1ai]=200
  [djlevka.store]=301 [djlevka.online]=301 [djlevka.ru]=301 [djlevka.com]=301 [djlevka.shop]=301
  [levkeiser.ru]=301 [levkeiser.store]=301 [levkeiser.online]=301
  [levkeyser.online]=301 [levkeyser.ru]=301 [levkeyser.com]=301 [levkeyser.shop]=301 [levkeyser.store]=301
  [xn--b1afbatee0ch.shop]=301 [xn--b1afbatee0ch.com]=301
)

check_domains() {
  local fail=0
  echo "== Проверка доменов (снаружи, через https) =="
  for d in "${!EXPECT[@]}"; do
    local want=${EXPECT[$d]}
    local out
    out=$(curl -s -o /dev/null -m 15 -w "%{http_code} %{redirect_url}" "https://$d/" || echo "000")
    local code=${out%% *}
    local loc=${out#* }
    if [ "$code" = "$want" ]; then
      printf "  ok    %-28s %s %s\n" "$d" "$code" "$loc"
    else
      printf "  FAIL  %-28s %s (ждали %s) %s\n" "$d" "$code" "$want" "$loc"
      fail=1
    fi
  done | sort -k1,1 -k2
  return 0
}

if [ "$CHECK_ONLY" = 1 ]; then
  echo "Только проверка, конфиг не трогаю. Сейчас в конфиге auth_basic: $(grep -c 'auth_basic "Preview"' "$CONF") блок(ов)."
  check_domains
  exit 0
fi

BAK="/root/nginx-site.bak-$(date +%F-%H%M)"
cp "$CONF" "$BAK"
echo "Бэкап конфига: $BAK"

BEFORE=$(grep -c 'auth_basic "Preview"' "$CONF" || true)
if [ "$BEFORE" = 0 ]; then
  echo "В конфиге уже нет auth_basic — пароль снят раньше. Только проверяю домены."
else
  # Убираем обе строки пароля во всех блоках. Больше ничего в конфиге не трогаем.
  sed -i -e '/^\s*auth_basic "Preview";\s*$/d' -e '/^\s*auth_basic_user_file \/etc\/nginx\/\.htpasswd;\s*$/d' "$CONF"
  AFTER=$(grep -c 'auth_basic' "$CONF" || true)
  echo "Снято блоков: $BEFORE, осталось упоминаний auth_basic: $AFTER"
  if ! nginx -t; then
    echo "nginx -t не прошёл — возвращаю бэкап"
    cp "$BAK" "$CONF"
    nginx -t
    exit 1
  fi
  systemctl reload nginx
  echo "nginx перезагружен"
fi

check_domains

echo "== robots.txt и sitemap.xml снаружи =="
for p in /robots.txt /sitemap.xml; do
  printf "  %-14s %s\n" "$p" "$(curl -s -o /dev/null -m 15 -w '%{http_code}' https://levkeiser.com$p)"
done

# Шаг 9: пользователь bank больше не нужен — пароля нет вовсе.
if [ -f "$HTPASSWD" ] && grep -q '^bank:' "$HTPASSWD"; then
  htpasswd -D "$HTPASSWD" bank >/dev/null 2>&1 && echo "Пользователь bank удалён из .htpasswd" || echo "Не удалось удалить bank из .htpasswd (не критично: файл больше не используется)"
fi

echo "Готово. Если что-то FAIL — откат: cp $BAK $CONF && nginx -t && systemctl reload nginx"
