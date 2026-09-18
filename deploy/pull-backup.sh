#!/usr/bin/env bash
# Копия сайта с сервера на этот компьютер (запускается планировщиком Windows раз в день
# через Git Bash; можно и руками: bash deploy/pull-backup.sh).
#
# Зачем: на VPS ночной cron кладёт дамп базы в /root/db-backups (30 дней), но копия
# остаётся на том же сервере — при потере сервера пропадёт вместе с ним. Письмом дамп
# не уходит (27 МБ — слишком велик). Здесь забираем:
#   db/     свежие дампы shop-*.db и env-* (держим 30 штук)
#   files/  зеркало public/uploads и storage/digital — только новое с прошлого раза
#           (по mtime на сервере; удалённое на сервере тут остаётся — это и есть бэкап)
# Лог — pull.log рядом; ошибки ssh не валят весь скрипт, следующий запуск доберёт.
#
# Канал до VPS с этой машины узкий (~120 КБ/с через VPN-туннель), поэтому всё порциями:
# дампов — не больше MAX_DB за запуск (свежие первыми), файлы — пачками по BATCH_MB с
# продвижением метки после каждой, и общий лимит времени BUDGET_MIN: первое зеркало
# 3 ГБ набирается за несколько ежедневных запусков, дальше — только новое.
set -uo pipefail

HOST=djlevka-vps
REMOTE=/var/www/site
DEST="${SITE_BACKUP_DIR:-$HOME/Desktop/site-backups}"
KEEP_DB=30
MAX_DB=3
BATCH_MB=120
BUDGET_MIN=150
FILE_DIRS="public/uploads storage/digital"
started=$(date +%s)
budget_left() { (( $(date +%s) - started < BUDGET_MIN*60 )); }

mkdir -p "$DEST/db" "$DEST/files"
LOG="$DEST/pull.log"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

# --- база и .env: всё, чего у нас ещё нет ---------------------------------------
remote_db=$(ssh -o ConnectTimeout=30 -o BatchMode=yes "$HOST" "ls /root/db-backups | grep -E '^(shop-[0-9]{8}-[0-9]{4}\.db|env-[0-9]{8}-[0-9]{4})$'" 2>>"$LOG") || { log "ssh недоступен — пропуск"; exit 1; }
got=0
for f in $(printf '%s\n' $remote_db | sort -r); do
  (( got >= MAX_DB )) && break
  budget_left || break
  if [[ ! -s "$DEST/db/$f" ]]; then
    if scp -q -o BatchMode=yes "$HOST:/root/db-backups/$f" "$DEST/db/$f.part" 2>>"$LOG"; then
      mv "$DEST/db/$f.part" "$DEST/db/$f"; got=$((got+1))
    else
      rm -f "$DEST/db/$f.part"; log "не скачался $f"
    fi
  fi
done
# ротация: оставляем KEEP_DB последних дампов и столько же env
ls -1t "$DEST"/db/shop-*.db 2>/dev/null | tail -n +$((KEEP_DB+1)) | xargs -r rm -f
ls -1t "$DEST"/db/env-* 2>/dev/null | tail -n +$((KEEP_DB+1)) | xargs -r rm -f
log "база: новых файлов $got, всего дампов $(ls -1 "$DEST"/db/shop-*.db 2>/dev/null | wc -l)"

# --- uploads и storage/digital: только новее прошлой синхронизации, пачками -------------
SINCE_FILE="$DEST/files/.since"
since=$(cat "$SINCE_FILE" 2>/dev/null || echo 0)          # unix-время последнего забранного файла
batches=0; copied=0
while budget_left; do
  # список новых файлов на сервере, старые первыми; берём пачку до BATCH_MB, но целиком
  # все файлы с тем же mtime, что у последнего в пачке (иначе они выпадут: -newermt строгое)
  plan=$(ssh -o BatchMode=yes "$HOST" "cd $REMOTE && find $FILE_DIRS -type f -newermt '@$since' -printf '%T@ %s\n' | sort -n | awk -v lim=$((BATCH_MB*1024*1024)) '{ t=int(\$1); if (n>0 && sum>=lim && t!=last) exit; sum+=\$2; n++; last=t } END { print n, sum, last+0 }'") || { log "ssh недоступен — файлы пропущены"; exit 1; }
  read -r n bytes upto <<<"$plan"
  if [[ -z "$n" || "$n" == "0" ]]; then
    (( batches == 0 )) && log "файлы: новых нет (после $(date -d @"$since" '+%F %T' 2>/dev/null || echo $since))"
    break
  fi
  # все файлы с since < mtime <= upto (по секундам, чтобы граница совпала с find на сервере)
  if ssh -o BatchMode=yes "$HOST" "cd $REMOTE && find $FILE_DIRS -type f -newermt '@$since' ! -newermt '@$((upto+1))' -print0 | tar --null -T - -cf -" 2>>"$LOG" | tar xf - -C "$DEST/files" 2>>"$LOG"; then
    since=$upto; echo "$since" > "$SINCE_FILE"
    batches=$((batches+1)); copied=$((copied+n))
    log "файлы: пачка $batches — $n файлов, $((bytes/1024/1024)) МБ, метка $(date -d @"$since" '+%F %T')"
  else
    log "файлы: tar оборвался на пачке $((batches+1)) — метка не сдвинута, в следующий раз повторим"
    exit 1
  fi
done
budget_left || log "файлы: лимит времени $BUDGET_MIN мин — продолжу в следующий запуск"
(( copied > 0 )) && log "файлы: за запуск $copied файлов; в зеркале $(du -sh "$DEST/files" | cut -f1)"
exit 0
