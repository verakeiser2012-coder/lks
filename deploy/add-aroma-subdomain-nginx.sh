#!/usr/bin/env bash
# Поддомен aroma.levkeiser.com → та же нода, корень = карта во весь экран (маршрутизация в src/server.js).
# Запуск на VPS: bash /var/www/site/deploy/add-aroma-subdomain-nginx.sh
# Порядок: 1) A-запись aroma.levkeiser.com → 5.42.118.236 у регистратора; 2) этот скрипт (http-блок);
#          3) certbot --nginx -d aroma.levkeiser.com  (после того как DNS разъедется).
# Пароль Preview стоит, как и на всём сайте, — снимается общим deploy/open-site-nginx.sh (там grep по auth_basic).
set -e
CONF=/etc/nginx/sites-enabled/site
grep -q "server_name aroma.levkeiser.com" $CONF && { echo "блок уже есть"; exit 0; }
cp $CONF /root/nginx-site.bak-aroma-$(date +%Y%m%d%H%M%S)
cat >> $CONF <<'NGX'

# ---- aroma.levkeiser.com: карта ароматов во весь экран ----
server {
    listen 80;
    server_name aroma.levkeiser.com;
    if ($lk_junk) { return 444; }
    if ($lk_badagent) { return 444; }
    location / {
        auth_basic "Preview";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGX
nginx -t && systemctl reload nginx && echo "nginx: блок aroma добавлен"
