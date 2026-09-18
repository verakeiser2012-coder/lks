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
set -uo pipefail

HOST=djlevka-vps
REMOTE=/var/www/site
DEST="${SITE_BACKUP_DIR:-$HOME/Desktop/site-backups}"
KEEP_DB=30
FILE_DIRS="public/uploads storage/digital"

mkdir -p "$DEST/db" "$DEST/files"
LOG="$DEST/pull.log"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

# --- база и .env: всё, чего у нас ещё нет ---------------------------------------
remote_db=$(ssh -o ConnectTimeout=30 -o BatchMode=yes "$HOST" "ls /root/db-backups | grep -E '^(shop-[0-9]{8}-[0-9]{4}\.db|env-[0-9]{8}-[0-9]{4})$'" 2>>"$LOG") || { log "ssh недоступен — пропуск"; exit 1; }
got=0
for f in $remote_db; do
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

# --- uploads и storage/digital: только новее прошлой синхронизации -----------------
SINCE_FILE="$DEST/files/.since"
since=$(cat "$SINCE_FILE" 2>/dev/null || echo "1970-01-01T00:00:00")
# время берём на сервере ДО поиска, чтобы файлы, дописанные во время копирования, не потерялись
now=$(ssh -o BatchMode=yes "$HOST" "date -Is") || { log "ssh недоступен — файлы пропущены"; exit 1; }
count=$(ssh -o BatchMode=yes "$HOST" "cd $REMOTE && find $FILE_DIRS -type f -newermt '$since' | wc -l")
if [[ "$count" == "0" ]]; then
  log "файлы: новых нет (с $since)"
else
  log "файлы: копирую $count новых (с $since)"
  if ssh -o BatchMode=yes "$HOST" "cd $REMOTE && find $FILE_DIRS -type f -newermt '$since' -print0 | tar --null -T - -cf -" 2>>"$LOG" | tar xf - -C "$DEST/files" 2>>"$LOG"; then
    echo "$now" > "$SINCE_FILE"
    log "файлы: готово, метка $now; всего в зеркале $(du -sh "$DEST/files" | cut -f1)"
  else
    log "файлы: tar оборвался — метка не сдвинута, в следующий раз повторим"
    exit 1
  fi
fi
