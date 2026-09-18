# -*- coding: utf-8 -*-
"""Extract frames from a draft's timeline at given timeline-seconds, tiled into a contact sheet."""
import json, io, os, sys, subprocess
FF = r"C:\Users\User\Desktop\site\tools\ffmpeg-9.0-essentials_build\bin\ffmpeg.exe"
DRAFT = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\Груша_v6_кино\draft_content.json"
OUT = sys.argv[1]
times = [float(x) for x in sys.argv[2:]]
d = json.load(io.open(DRAFT, encoding="utf-8"))
mats = {m["id"]: m for m in d["materials"]["videos"]}
segs = d["tracks"][0]["segments"]
tmp = os.path.join(os.path.dirname(OUT), "_f")
os.makedirs(tmp, exist_ok=True)
files = []
for i, t in enumerate(times):
    hit = None
    for s in segs:
        a = s["target_timerange"]["start"]/1e6; b = a + s["target_timerange"]["duration"]/1e6
        if a <= t < b:
            hit = (s, t-a); break
    if not hit: continue
    s, off = hit
    m = mats[s["material_id"]]
    if m.get("type") == "photo" or not os.path.exists(m["path"]): continue
    src = s["source_timerange"]["start"]/1e6 + off*(s.get("speed", 1.0) or 1.0)
    p = os.path.join(tmp, "f%03d.jpg" % i)
    subprocess.run([FF, "-v", "error", "-y", "-ss", "%.3f" % src, "-i", m["path"], "-frames:v", "1",
                    "-vf", "scale=480:-2,drawtext=text='%d\:%02d':x=8:y=8:fontsize=28:fontcolor=yellow:box=1:boxcolor=black@0.6"
                    % (int(t//60), int(t % 60)), p], check=False)
    if os.path.exists(p): files.append(p)
n = len(files)
cols = 4
lst = os.path.join(tmp, "list.txt")
io.open(lst, "w", encoding="utf-8").write("".join("file '%s'\n" % f.replace("\\", "/") for f in files))
subprocess.run([FF, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                "-vf", "tile=%dx%d" % (cols, (n+cols-1)//cols), "-frames:v", "1", OUT], check=True)
print("sheet", OUT, n, "frames")
