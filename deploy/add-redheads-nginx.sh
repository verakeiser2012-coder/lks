#!/bin/bash
# Открывает /redheads без basic auth во всех server-блоках nginx (сайт остаётся под паролем).
set -e
CONF=/etc/nginx/sites-enabled/site
cp $CONF /root/nginx-site.bak-$(date +%F-%H%M)
python3 - <<'PY'
p = '/etc/nginx/sites-enabled/site'
s = open(p).read()
block = '''    location ^~ /redheads {
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

'''
if 'location ^~ /redheads' in s:
    print('already present')
else:
    s = s.replace('    location / {', block + '    location / {')
    open(p, 'w').write(s)
    print('inserted blocks:', s.count('location ^~ /redheads'))
PY
nginx -t && systemctl reload nginx && echo RELOADED
