# -*- coding: utf-8 -*-
"""Cross-correlate each vertical phone clip against the camera-B recording that covers it."""
import numpy as np, wave, os, json, subprocess, sys
FF = r"C:\Users\User\Desktop\site\tools\ffmpeg-9.0-essentials_build\bin\ffmpeg.exe"
AUD = r"C:\Users\User\Desktop\site\tools\grusha_audio"
PODCAST = r"E:\КАРЬЕРА!!!!!\2026\подкаст Груша 31 июля 2026"
# camera-B file -> (local start time seconds, duration)
BFILES = {"20260731_110808": (11*3600+8*60+8, 544.07), "20260731_111922": (11*3600+19*60+22, 46.51),
          "20260731_112043": (11*3600+20*60+43, 273.04), "20260731_112704": (11*3600+27*60+4, 677.46),
          "20260731_114814": (11*3600+48*60+14, 1741.48), "20260731_122810": (12*3600+28*60+10, 281.85),
          "20260731_124949": (12*3600+49*60+49, 741.98)}

def find(name):
    for root, _, files in os.walk(PODCAST):
        if name in files:
            return os.path.join(root, name)
    return None

def rd(p):
    w = wave.open(p); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768
    w.close(); return x

def env(x, hop=160):
    n = len(x)//hop
    e = np.sqrt((x[:n*hop].reshape(n, hop)**2).mean(1)); e = np.log1p(e*100); return e-e.mean()

def xcorr(a, b):
    N = 1 << (len(a)+len(b)-1).bit_length()
    c = np.fft.irfft(np.fft.rfft(a, N)*np.conj(np.fft.rfft(b, N)), N)
    c = np.concatenate([c[-len(b)+1:], c[:len(a)]]); lags = np.arange(-len(b)+1, len(a))
    i = int(np.argmax(c)); return lags[i], float(c[i]/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))

VERTS = ["VID_20260731_111149", "VID_20260731_111222", "VID_20260731_111958", "VID_20260731_112842",
         "VID_20260731_113951", "VID_20260731_114125", "VID_20260731_114807", "VID_20260731_115108",
         "VID_20260731_115202", "VID_20260731_115246", "VID_20260731_120004", "VID_20260731_120907"]
res = {}
for v in VERTS:
    src = find(v + ".mp4")
    wav = os.path.join(AUD, "V_%s.16k.wav" % v)
    if not os.path.exists(wav):
        subprocess.run([FF, "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav], check=True)
    a = rd(wav)
    hh, mm, ss = int(v[13:15]), int(v[15:17]), int(v[17:19])
    dur = len(a)/16000
    tstart = hh*3600+mm*60+ss - dur      # VID_* filenames carry the END time of the recording
    cand = [(k, s) for k, (s, du) in BFILES.items() if s < tstart+dur and s+du > tstart]
    best = None
    for k, s in cand:
        b = rd(os.path.join(AUD, "B_%s.16k.wav" % k))
        guess = tstart - s
        lag, sc = xcorr(env(a), env(b))
        off = -lag*0.01
        # sample-accurate refine in the middle of the clip
        ta = min(max(len(a)/16000*0.4, 1.0), max(len(a)/16000-11, 1.0)); tb = ta+off
        ref = None
        if 1 < tb < len(b)/16000-12 and ta+10 < len(a)/16000:
            wa = a[int(ta*16000):int((ta+10)*16000)]; wb = b[int((tb-1)*16000):int((tb+11)*16000)]
            l2, s2 = xcorr(wa-wa.mean(), wb-wb.mean())
            ref = ((tb-1-l2/16000)-ta, s2)
        cand_off = ref[0] if ref and ref[1] > 0.05 else off
        conf = ref[1] if ref else sc
        if best is None or conf > best[2]:
            best = (k, cand_off, conf, sc, abs(cand_off-guess))
    if best is None:
        res[v] = {"B": None, "note": "no camera-B coverage (recorded in a gap between B files)", "dur": round(dur, 2)}
        print(v, res[v], flush=True); continue
    res[v] = {"B": best[0], "offset": round(best[1], 3), "conf": round(best[2], 3),
              "coarse_score": round(best[3], 3), "vs_meta_guess": round(best[4], 2), "dur": round(dur, 2)}
    print(v, res[v], flush=True)
json.dump(res, open(os.path.join(AUD, "sync_vert.json"), "w"), indent=1)
print("VERT_SYNC_DONE")
