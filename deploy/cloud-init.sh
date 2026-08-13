#!/bin/sh
set -e
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl unzip nginx ufw certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

npm install -g pm2

mkdir -p /var/www/site
cat > /var/www/site/READY.txt <<'EOF'
Сервер настроен автоматически (cloud-init): Node.js, nginx, pm2, certbot готовы.
Осталось: загрузить архив сайта в эту папку (/var/www/site), распаковать и запустить.
EOF

cat > /etc/nginx/sites-available/site <<'EOF'
server {
    listen 80 default_server;
    server_name _;

    location / {
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
}
EOF

ln -sf /etc/nginx/sites-available/site /etc/nginx/sites-enabled/site
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
