# -*- coding: utf-8 -*-
"""Цифровая версия альбома для владельца пластинки: WAV 16/44 + MP3 320 с тегами.
Источник — мастера из «Музыка/IPEX загрузка». Bill Cipher не кладём: производная работа
(Gravity Falls), её не распространяем. Результат — storage/digital/album-*.zip."""
import os, subprocess, zipfile, tempfile, shutil
FF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffmpeg-9.0-essentials_build", "bin", "ffmpeg.exe")
SRC = os.path.join(os.path.expanduser("~"), "Desktop", "Музыка", "IPEX загрузка")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "digital")
ALBUMS = {
    "ikigai": ("Ikigai", "2024", ["The Sleepiest Beatmaker", "Ikigai", "Cozy Place", "Fog"]),
    "flowers": ("Flowers", "2025", ["Flowers", "Memory", "U", "Riff Raff", "Lullaby"]),
    "soundstates": ("Soundstates", "2026", ["Soundstates", "d r e a m", "2AM", "Cloudflute", "Back to the Future"]),
}
def build(slug, parts):
    tmp = tempfile.mkdtemp()
    zpath = os.path.join(OUT, f"album-{slug}.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for album, year, tracks in parts:
            for i, t in enumerate(tracks, 1):
                wav = os.path.join(SRC, f"DJ Levka - {t}.wav")
                base = f"{i:02d} {t}"
                mp3 = os.path.join(tmp, base + ".mp3")
                subprocess.run([FF, "-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "320k",
                                "-metadata", f"title={t}", "-metadata", "artist=DJ Levka", "-metadata", f"album={album}",
                                "-metadata", f"date={year}", "-metadata", f"track={i}", "-id3v2_version", "3", mp3], check=True)
                z.write(mp3, f"{album}/MP3 320/{base}.mp3")
                z.write(wav, f"{album}/WAV 16-44/{base}.wav")
        z.writestr("ЧИТАЙ.txt", "Цифровая версия для владельца пластинки. WAV — как на мастере, MP3 320 — для телефона.\n"
                   "Для личного прослушивания; выкладывать и продавать нельзя.\n\nlevkeiser.com/music\n")
    shutil.rmtree(tmp)
    print(slug, round(os.path.getsize(zpath) / 1e6), "MB")
for slug, (album, year, tracks) in ALBUMS.items():
    build(slug, [(album, year, tracks)])
build("tri-alboma", [(a, y, t) for a, y, t in ALBUMS.values()])
# схема пластинок 17.09.2026: «2024» = Ikigai + синглы 2024, «Flowers / Soundstates» = два альбома
SINGLES_2024 = ['Hotline', 'Game Over', 'Ruins', 'Spooky Month', 'At The Jazz Club', 'Deep Sleep']
build("2024", [("Ikigai", "2024", ['The Sleepiest Beatmaker', 'Ikigai', 'Cozy Place', 'Bill Cipher', 'Fog']), ("Singles 2024", "2024", SINGLES_2024)])
build("flowers-soundstates", [ALBUMS["flowers"], ALBUMS["soundstates"]])
