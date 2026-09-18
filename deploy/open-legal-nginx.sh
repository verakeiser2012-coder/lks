#!/bin/bash
# Открыть /legal/* (оферта, политика и т.д.) наружу до снятия общего пароля «Preview».
# Нужно для проверок модераторами (Pinterest API, платёжки), которые ходят по ссылке
# на политику конфиденциальности из заявки и не должны упираться в 401.
#
# Делает то же, что уже сделано для /redheads: в каждом server-блоке перед
# `location / {` вставляет `location ^~ /legal { ... }` без auth_basic.
#
# Запуск на сервере от root:  bash /var/www/site/deploy/open-legal-nginx.sh
# Откат: cp /root/nginx-site.bak-legal-<дата> /etc/nginx/sites-enabled/site && nginx -t && systemctl reload nginx
set -euo pipefail

CONF=/etc/nginx/sites-enabled/site

if grep -q 'location \^~ /legal {' "$CONF"; then
  echo "Блок /legal уже есть — ничего не меняю."
else
  BAK="/root/nginx-site.bak-legal-$(date +%F-%H%M)"
  cp "$CONF" "$BAK"
  echo "Бэкап: $BAK"

  # Вставляем блок перед каждым `location / {` (их ровно столько же, сколько блоков с паролем).
  python3 - "$CONF" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
block = """    location ^~ /legal {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

"""
new, n = re.subn(r'(?m)^(    location / \{\n        auth_basic "Preview";)', block + r'\1', s)
open(p, "w", encoding="utf-8").write(new)
print(f"Вставлено блоков /legal: {n}")
PY

  if ! nginx -t; then
    echo "nginx -t не прошёл — возвращаю бэкап"
    cp "$BAK" "$CONF"
    nginx -t
    exit 1
  fi
  systemctl reload nginx
  echo "nginx перезагружен"
fi

echo "== Проверка снаружи =="
for u in https://levkeiser.com/legal/privacy https://levkeiser.com/legal https://levkeiser.com/legal/oferta https://levkeiser.com/ https://levkeiser.com/redheads; do
  printf "  %-45s %s\n" "$u" "$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$u")"
done
