# Deploys the bot to the VPS. Token is read from Desktop\kollegam-bot-token.txt (one line) and never printed.
param([string]$AdminChatId = "861966205")
$key = "$env:USERPROFILE\.ssh\id_ed25519_djlevka_vps_new"
$srv = "root@5.42.118.236"
$tokenFile = "$env:USERPROFILE\Desktop\kollegam-bot-token.txt"
if (-not (Test-Path $tokenFile)) { throw "Token file not found: $tokenFile" }
$token = (Get-Content $tokenFile -Raw).Trim()
if ($token -notmatch '^\d+:[A-Za-z0-9_-]+$') { throw "File content does not look like a BotFather token" }
$envText = "BOT_TOKEN=$token`nADMIN_CHAT_ID=$AdminChatId`nDATA_DIR=/var/www/kollegam-data`n"
$tmp = [IO.Path]::GetTempFileName()
[IO.File]::WriteAllText($tmp, $envText)
ssh -i $key $srv "mkdir -p /var/www/site/bot /var/www/kollegam-data/clients"
scp -i $key "$PSScriptRoot\kollegam-bot.js" "${srv}:/var/www/site/bot/kollegam-bot.js"
scp -i $key $tmp "${srv}:/var/www/site/bot/.env"
Remove-Item $tmp
$remote = 'chmod 600 /var/www/site/bot/.env; cd /var/www/site; if pm2 describe kollegam-bot >/dev/null 2>&1; then pm2 restart kollegam-bot --update-env; else pm2 start bot/kollegam-bot.js --name kollegam-bot; fi; pm2 save >/dev/null; sleep 3; pm2 logs kollegam-bot --lines 5 --nostream'
ssh -i $key $srv $remote
