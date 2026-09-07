#!/bin/bash
# Открывает /health без пароля во всех server-блоках nginx — как /redheads.
# Нужен внешнему монитору (UptimeRobot): пока сайт под паролем «Preview»,
# монитор иначе видит 401 и не отличит «закрыто» от «лежит».
# Повторный запуск безопасен: если блок уже есть, ничего не меняет.
set -e
CONF=/etc/nginx/sites-enabled/site
cp "$CONF" "/root/nginx-site.bak-$(date +%F-%H%M)"
python3 - <<'PY'
p = '/etc/nginx/sites-enabled/site'
s = open(p).read()
block = '''    location = /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }

'''
if 'location = /health' in s:
    print('already present')
else:
    s = s.replace('    location / {', block + '    location / {')
    open(p, 'w').write(s)
    print('inserted blocks:', s.count('location = /health'))
PY
nginx -t && systemctl reload nginx && echo RELOADED
