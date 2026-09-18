# -*- coding: utf-8 -*-
"""Dump a timeline with camera-B mapping + transcript, for any draft."""
import json, io, os, sys
AUD = r"C:\Users\User\Desktop\site\tools\grusha_audio"
TR = r"C:\Users\User\Desktop\site\tools\grusha_transcript"
gsync = json.load(open(os.path.join(AUD, "sync_offsets.json")))
vsync = json.load(open(os.path.join(AUD, "sync_vert.json")))
tr = {f[2:-5]: json.load(io.open(os.path.join(TR, f), encoding="utf-8")) for f in os.listdir(TR)}


def load(path):
    d = json.load(io.open(path, encoding="utf-8"))
    return d, {m["id"]: m for m in d["materials"]["videos"]}


def brange(mats, s):
    b = os.path.basename(mats[s["material_id"]]["path"]).rsplit(".", 1)[0]
    ss = s["source_timerange"]["start"]/1e6 if s.get("source_timerange") else 0
    du = s["target_timerange"]["duration"]/1e6
    sp = s.get("speed", 1.0) or 1.0
    if b in gsync:
        o = gsync[b]["offset"]; return gsync[b]["B"], ss+o, ss+o+du*sp, b
    if b in vsync and vsync[b].get("B"):
        o = vsync[b]["offset"]; return vsync[b]["B"], ss+o, ss+o+du*sp, b
    return None, None, None, b


if __name__ == "__main__":
    d, mats = load(sys.argv[1])
    out = []
    for i, s in enumerate(d["tracks"][0]["segments"]):
        st = s["target_timerange"]["start"]/1e6; du = s["target_timerange"]["duration"]/1e6
        B, b0, b1, name = brange(mats, s)
        m = mats[s["material_id"]]
        kind = "ВЕРТ" if m["height"] > m["width"] else ("ФОТО" if m.get("type") == "photo" else "ГОР")
        out.append("### [%d] %02d:%05.2f +%.2f  %s %s  src %.2f  B=%s %s" %
                   (i, int(st//60), st % 60, du, kind, name, s["source_timerange"]["start"]/1e6 if s.get("source_timerange") else 0,
                    B or "-", ("%.2f–%.2f" % (b0, b1)) if b0 is not None else ""))
        if B in tr:
            for x in tr[B]:
                if x["end"] > b0 and x["start"] < b1:
                    out.append("      %6.1f  %s" % (st + (max(x["start"], b0)-b0), x["text"].strip()))
    io.open(sys.argv[2], "w", encoding="utf-8").write("\n".join(out))
    print("segments", len(d["tracks"][0]["segments"]), "-> lines", len(out))
