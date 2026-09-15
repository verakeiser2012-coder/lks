# Забирает файлы клиентов бота с VPS в Desktop\Коллегам\клиенты
$key = "$env:USERPROFILE\.ssh\id_ed25519_djlevka_vps_new"
$dst = "$env:USERPROFILE\Desktop\Коллегам\клиенты"
New-Item -ItemType Directory -Force $dst | Out-Null
scp -i $key -r "root@5.42.118.236:/var/www/kollegam-data/clients/*" $dst
Get-ChildItem $dst -Recurse -File | Measure-Object | ForEach-Object { "файлов всего: $($_.Count)" }
