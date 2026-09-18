#!/usr/bin/env bash
# Выкладка сайта на VPS одной командой (запускать из Git Bash в корне репозитория).
#
#   deploy/push.sh                 файлы, изменённые с прошлой выкладки (метка на сервере)
#   deploy/push.sh --all           все отслеживаемые файлы кода (полная сверка)
#   deploy/push.sh src/a.js ...    только названные файлы
#   --no-restart                   не перезапускать pm2 (только статика/шаблоны)
#
# Сервер не под git, файлы едут tar'ом по ssh (алиас djlevka-vps). После заливки
# каждый файл сверяется по md5 (переводы строк нормализуются: локально CRLF,
# на сервере LF), затем pm2 restart, проверка страниц и запись метки коммита
# в /var/www/site/.deployed-commit — от неё считается следующая выкладка.
set -euo pipefail

HOST=djlevka-vps
REMOTE=/var/www/site
MARKER=.deployed-commit
# что вообще выкладываем: код, шаблоны, статика, скрипты выкладки; без uploads/data/tools
PATHS=(src public/css public/js public/img public/data public/fonts public/favicon* public/*.png public/*.ico public/*.svg public/*.txt public/*.xml deploy/*.js deploy/*.sh package.json package-lock.json)
CHECK_PAGES=(/ /style /music /podcast /redheads /catalog /drops /aroma /admin/login)

cd "$(git rev-parse --show-toplevel)"

all=0; restart=1; explicit=()
for a in "$@"; do
  case "$a" in
    --all) all=1 ;;
    --no-restart) restart=0 ;;
    -*) echo "неизвестный ключ: $a" >&2; exit 2 ;;
    *) explicit+=("$a") ;;
  esac
done

head=$(git rev-parse HEAD)
files=()
if ((${#explicit[@]})); then
  files=("${explicit[@]}")
elif ((all)); then
  mapfile -t files < <(git ls-files -- "${PATHS[@]}")
else
  deployed=$(ssh "$HOST" "cat $REMOTE/$MARKER 2>/dev/null" || true)
  if [[ -z "$deployed" ]] || ! git cat-file -e "$deployed^{commit}" 2>/dev/null; then
    echo "На сервере нет метки выкладки (или коммит неизвестен) — сначала: deploy/push.sh --all" >&2
    exit 1
  fi
  mapfile -t files < <(git diff --name-only --diff-filter=ACMR "$deployed" HEAD -- "${PATHS[@]}")
  # плюс незакоммиченные правки в тех же путях — их обычно и хотят увидеть на сайте
  mapfile -t dirty < <(git status --porcelain -- "${PATHS[@]}" | awk '$1 != "D" {print $2}')
  files+=("${dirty[@]}")
  mapfile -t gone < <(git diff --name-only --diff-filter=D "$deployed" HEAD -- "${PATHS[@]}")
  if ((${#gone[@]})); then
    echo "Удалены в git, но на сервере останутся (удалить руками при необходимости):"; printf '   %s\n' "${gone[@]}"
  fi
fi

# уникальные и существующие
mapfile -t files < <(printf '%s\n' "${files[@]}" | sort -u | while read -r f; do [[ -f "$f" ]] && echo "$f"; done)
if ((${#files[@]} == 0)); then echo "Нечего выкладывать: сервер на $head."; exit 0; fi

echo "Файлов к выкладке: ${#files[@]}"
printf '   %s\n' "${files[@]}"

tar cf - "${files[@]}" | ssh "$HOST" "cd $REMOTE && tar xf -"

# сверка md5 (текст — с нормализацией CRLF, бинарники — как есть)
sum_local() { case "$1" in *.png|*.jpg|*.jpeg|*.ico|*.woff|*.woff2|*.ttf|*.mp3|*.webp|*.gif) md5sum "$1";; *) sed 's/\r$//' "$1" | md5sum;; esac | cut -c1-32; }
remote_script='for f in "$@"; do case "$f" in *.png|*.jpg|*.jpeg|*.ico|*.woff|*.woff2|*.ttf|*.mp3|*.webp|*.gif) s=$(md5sum "$f");; *) s=$(sed "s/\r$//" "$f" | md5sum);; esac; echo "${s:0:32} $f"; done'
declare -A remote
while read -r sum f; do remote["$f"]=$sum; done < <(ssh "$HOST" "cd $REMOTE && bash -c '$remote_script' _ ${files[*]}")
bad=0
for f in "${files[@]}"; do
  l=$(sum_local "$f")
  if [[ "${remote[$f]:-}" != "$l" ]]; then echo "НЕ СОВПАЛ: $f" >&2; bad=1; fi
done
if ((bad)); then echo "Сверка не прошла — pm2 не трогаю, метку не пишу." >&2; exit 1; fi
echo "md5: все ${#files[@]} совпали"

needs_restart=0
for f in "${files[@]}"; do case "$f" in src/*|package.json|package-lock.json) needs_restart=1;; esac; done
if ((restart && needs_restart)); then
  ssh "$HOST" "cd $REMOTE && pm2 restart site >/dev/null && sleep 3 && pm2 describe site | grep status | grep -q online && echo 'pm2: site online'"
elif ((needs_restart)); then
  echo "pm2: перезапуск отключён ключом --no-restart, хотя менялся src/"
else
  echo "pm2: без перезапуска — только статика и шаблоны"
fi

fail=0
for p in "${CHECK_PAGES[@]}"; do
  code=$(ssh "$HOST" "curl -s -o /dev/null -w '%{http_code}' -H 'Host: levkeiser.com' http://127.0.0.1:3000$p")
  printf '   %-14s %s\n' "$p" "$code"
  [[ "$code" == "200" ]] || fail=1
done
if ((fail)); then echo "Какая-то страница не 200 — метку не пишу, смотри pm2 logs site." >&2; exit 1; fi

ssh "$HOST" "echo $head > $REMOTE/$MARKER"
echo "Выложено. Метка на сервере: $head"
