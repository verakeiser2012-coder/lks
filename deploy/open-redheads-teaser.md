# Открыть /redheads (тизер с подпиской), остальной сайт оставить за паролем

Статус на 29.08.2026: код тизера закоммичен локально (a5f73a6), на сервер НЕ залит.
SSH-ключ ещё НЕ добавлен на сервер — root-пароль в серийной консоли не подошёл (см. шаг 0).

## Шаг 0 — доступ на сервер (нужен пользователь, один раз)

Root-пароль не подошёл в консоли → сначала сбросить его в панели Timeweb:
Сервер «Ambitious Lacerta» (5.42.118.236, id 8796499) → вкладка **Доступ** → «Сбросить пароль root»
(новый пароль придёт на почту / покажется в панели). Потом в серийной консоли (вкладка Консоль):

```
login: root
Password: <новый пароль>
```

и выполнить (вставка в консоль: Ctrl+Shift+V):

```bash
mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBXtWBGLV/nXPEAwIIDTDzyTcdYO5TUTyUHEI/4qhlUf claude-deploy-20260829" >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
```

Приватный ключ этой пары: `deploy/keys/vps_deploy_key` (в .gitignore, не коммитится).

## Шаг 1 — залить код (5 файлов)

```bash
KEY=deploy/keys/vps_deploy_key
scp -i $KEY src/routes/redheads.js root@5.42.118.236:/var/www/site/src/routes/redheads.js
scp -i $KEY src/routes/admin/redheads.js root@5.42.118.236:/var/www/site/src/routes/admin/redheads.js
scp -i $KEY src/views/redheads-teaser.ejs root@5.42.118.236:/var/www/site/src/views/redheads-teaser.ejs
scp -i $KEY src/views/admin/redheads.ejs root@5.42.118.236:/var/www/site/src/views/admin/redheads.ejs
# init.js НЕ копировать целиком (локальный содержит чужой WIP diary) — вместо этого
# выставить настройку напрямую:
ssh -i $KEY root@5.42.118.236 "cd /var/www/site && node -e \"const db=require('./src/db');db.prepare(\\\"INSERT INTO settings (key,value) VALUES ('redheads_teaser_mode','1') ON CONFLICT(key) DO UPDATE SET value=excluded.value\\\").run();console.log('ok')\" && pm2 restart site"
```

## Шаг 2 — nginx: открыть /redheads без basic auth

В `/etc/nginx/sites-enabled/site` в КАЖДОМ server-блоке (их 4), рядом с уже существующим
открытым блоком `location ^~ /admin`, добавить такой же блок для /redheads
(скопировать содержимое admin-блока, заменив путь):

```nginx
location ^~ /redheads {
    auth_basic off;
    # ...те же proxy_pass/proxy_set_header, что в блоке /admin...
}
```

Затем: `nginx -t && systemctl reload nginx`. Бэкап перед правкой: `cp /etc/nginx/sites-enabled/site /root/nginx-site.bak-$(date +%F)`.

## Шаг 3 — проверить

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://levkeiser.com/redheads   # ждём 200 (тизер)
curl -s -o /dev/null -w "%{http_code}\n" https://levkeiser.com/           # ждём 401 (пароль на месте)
curl -s https://levkeiser.com/redheads | grep -o "Рыжие, которые вдохновляют"
```

## Потом (понедельник вечером, при полном открытии сайта)

- Снять basic auth целиком (см. память project_site_domains: убрать auth_basic из location / всех блоков, или восстановить из /etc/nginx/sites-enabled/site.bak + повторить правки certbot).
- В /admin/redheads нажать «Показать полную подборку» (выключить тизер).
- Подписчикам, собранным тизером, уйдёт обычная рассылка при следующей новости.
