#!/usr/bin/env bash
# Поддомен aroma.levkeiser.com отменён (решение 17.09.2026: карта живёт под брендом на levkeiser.com/aroma).
# Убирает блок, добавленный deploy/add-aroma-subdomain-nginx.sh.
set -e
CONF=/etc/nginx/sites-enabled/site
grep -q "aroma.levkeiser.com" $CONF || { echo "блока нет"; exit 0; }
cp $CONF /root/nginx-site.bak-aroma-rm-$(date +%Y%m%d%H%M%S)
python3 - <<'PY'
import re
p='/etc/nginx/sites-enabled/site'; s=open(p).read()
s=re.sub(r"\n# ---- aroma\.levkeiser\.com: карта ароматов во весь экран ----\nserver \{.*?\n\}\n", "\n", s, flags=re.S)
open(p,'w').write(s)
PY
nginx -t && systemctl reload nginx && echo "nginx: блок aroma убран"
