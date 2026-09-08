#!/bin/bash
# Щит от ботов-сканеров в nginx: отсекаем типовой перебор до того, как он дойдёт
# до сайта, и ограничиваем частоту попыток входа в админку.
#
# Что делает:
#   1. Кладёт /etc/nginx/conf.d/bot-shield.conf — карту «мусорных» путей и зоны лимитов.
#   2. Дополняет СУЩЕСТВУЮЩИЕ блоки конфига (новых location не создаёт):
#      - после каждой строки server_name: обрыв соединения для сканеров;
#      - в location /admin/login: лимит попыток входа;
#      - в location /uploads/: запрет чужим сайтам вставлять наши картинки.
#   3. Проверяет конфиг. Не прошло — откатывает всё и выходит.
#
# Запуск на сервере: bash /var/www/site/deploy/add-bot-shield-nginx.sh [--check|--rollback]
set -u

CONF=/etc/nginx/sites-enabled/site
SHIELD=/etc/nginx/conf.d/bot-shield.conf
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="/root/nginx-backup-$STAMP"

[ -f "$CONF" ] || CONF=$(ls /etc/nginx/sites-enabled/* 2>/dev/null | head -1)
[ -f "$CONF" ] || { echo "Не нашёл конфиг nginx — прекращаю."; exit 1; }

if [ "${1:-}" = "--check" ]; then
  echo "Конфиг: $CONF"
  echo "server-блоков: $(grep -c '^server {' "$CONF")"
  echo "щит установлен: $([ -f "$SHIELD" ] && echo да || echo нет)"
  echo "меток bot-shield в конфиге: $(grep -c 'bot-shield' "$CONF")"
  exit 0
fi

if [ "${1:-}" = "--rollback" ]; then
  LAST=$(ls -d /root/nginx-backup-* 2>/dev/null | tail -1)
  [ -n "$LAST" ] || { echo "Резервных копий нет."; exit 1; }
  cp "$LAST/$(basename "$CONF")" "$CONF"
  rm -f "$SHIELD"
  nginx -t && systemctl reload nginx && echo "Откатил на $LAST"
  exit 0
fi

mkdir -p "$BACKUP"
cp "$CONF" "$BACKUP/"
[ -f "$SHIELD" ] && cp "$SHIELD" "$BACKUP/"
echo "Резервная копия: $BACKUP"

# --- 1. Карта мусорных путей и зоны лимитов ----------------------------------
cat > "$SHIELD" <<'SHIELDEOF'
# Щит от ботов (conf.d подключается внутри http-блока автоматически).

# Мусорные запросы: чужие CMS, утечки конфигов, камеры, роутеры. 1 = обрываем молча.
map $request_uri $lk_junk {
    default                   0;
    ~*^/wp-                   1;
    ~*^/wordpress             1;
    ~*xmlrpc\.php             1;
    ~*^/\.env                 1;
    ~*^/api/\.env             1;
    ~*^/\.git                 1;
    ~*^/\.svn                 1;
    ~*^/\.aws                 1;
    ~*phpinfo\.php            1;
    ~*^/info\.php             1;
    ~*^/phpmyadmin            1;
    ~*^/pma/                  1;
    ~*^/ISAPI/                1;
    ~*^/cgi-bin/              1;
    ~*^/boaform               1;
    ~*^/HNAP1                 1;
    ~*^/license\.txt          1;
    ~*^/vendor/               1;
    ~*rest_route=             1;
    ~*\.(php|asp|aspx|jsp|cgi)$ 1;
}

# Инструменты сканирования и пустой агент.
map $http_user_agent $lk_badagent {
    default                                                       0;
    ""                                                            1;
    ~*(zgrab|masscan|nmap|nikto|sqlmap|dirbuster|gobuster|wpscan)  1;
}

# Попытки входа в админку: 10 в минуту с адреса.
limit_req_zone $binary_remote_addr zone=lk_login:10m rate=10r/m;
limit_req_status 429;
SHIELDEOF
echo "Положил $SHIELD"

# --- 2. Дополняем существующие блоки -----------------------------------------
python3 - "$CONF" <<'PYEOF'
import re, sys
path = sys.argv[1]
lines = open(path, encoding='utf-8').read().split('\n')

if any('bot-shield' in l for l in lines):
    print('Метки bot-shield уже есть — второй раз не добавляю.')
    sys.exit(0)

JUNK = ['    # bot-shield: сканеры получают обрыв соединения, а не страницу',
        '    if ($lk_junk) { return 444; }',
        '    if ($lk_badagent) { return 444; }']
LIMIT = '        limit_req zone=lk_login burst=5 nodelay; # bot-shield'
REFER = ['        # bot-shield: чужим сайтам не давать вставлять наши картинки',
         '        valid_referers none blocked server_names;',
         '        if ($invalid_referer) { return 403; }']

out = []
n_junk = n_limit = n_refer = 0
i = 0
while i < len(lines):
    line = lines[i]
    out.append(line)

    # после server_name — обрыв для сканеров (кроме заглушек с return 301/404)
    if re.match(r'^\s*server_name\s', line):
        # заглядываем вперёд: если блок только редиректит, не трогаем
        tail = '\n'.join(lines[i + 1:i + 6])
        if 'return 301' not in tail and 'return 404' not in tail:
            out.extend(JUNK)
            n_junk += 1

    # внутрь location /admin/login — лимит попыток
    if re.match(r'^\s*location\s+\^~\s+/admin/login\s*\{', line):
        out.append(LIMIT)
        n_limit += 1

    # внутрь location /uploads/ — запрет hotlink
    if re.match(r'^\s*location\s+\^~\s+/uploads/\s*\{', line):
        out.extend(REFER)
        n_refer += 1

    i += 1

if n_junk == 0:
    print('Не нашёл ни одного server_name — ничего не менял.')
    sys.exit(1)

open(path, 'w', encoding='utf-8').write('\n'.join(out))
print(f'Добавлено: обрыв сканерам в {n_junk} блок(ов), лимит входа в {n_limit}, запрет hotlink в {n_refer}.')
PYEOF

# --- 3. Проверка и откат при ошибке ------------------------------------------
if nginx -t 2>&1 | tail -2 && nginx -t >/dev/null 2>&1; then
  systemctl reload nginx && echo "nginx перезагружен, щит работает."
else
  echo "ОШИБКА в конфиге — откатываю."
  cp "$BACKUP/$(basename "$CONF")" "$CONF"
  rm -f "$SHIELD"
  nginx -t >/dev/null 2>&1 && systemctl reload nginx
  echo "Откатил на исходный конфиг."
  exit 1
fi

echo
echo "Проверка (444 = соединение оборвано, так и надо):"
for p in /wp-login.php /.env /.git/config /admin/login /; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: levkeiser.com' "https://127.0.0.1$p" -k --max-time 5 2>/dev/null)
  echo "  $p -> ${code:-обрыв (444)}"
done
