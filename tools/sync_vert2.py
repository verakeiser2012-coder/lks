# -*- coding: utf-8 -*-
"""Robust vertical<->camera-B offsets: vote over several windows around the metadata prior.

VID_*.mp4 filenames carry the END time of the recording, so start = filename_time - duration
(verified: the confident free correlations land within 0.5 s of that prediction)."""
import numpy as np, wave, os, json
AUD = r"C:\Users\User\Desktop\site\tools\grusha_audio"
BSTART = {"20260731_110808": 11*3600+8*60+8, "20260731_111922": 11*3600+19*60+22,
          "20260731_112043": 11*3600+20*60+43, "20260731_112704": 11*3600+27*60+4,
          "20260731_114814": 11*3600+48*60+14, "20260731_122810": 12*3600+28*60+10,
          "20260731_124949": 12*3600+49*60+49}
BDUR = {"20260731_110808": 544.07, "20260731_111922": 46.51, "20260731_112043": 273.04,
        "20260731_112704": 677.46, "20260731_114814": 1741.48, "20260731_122810": 281.85,
        "20260731_124949": 741.98}

def rd(p):
    w = wave.open(p); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768
    w.close(); return x

def env(x, hop=160):
    n = len(x)//hop; e = np.sqrt((x[:n*hop].reshape(n, hop)**2).mean(1)); e = np.log1p(e*100); return e-e.mean()

old = json.load(open(os.path.join(AUD, "sync_vert.json")))
out = {}
for v, info in sorted(old.items()):
    if not info.get("B"):
        out[v] = info; print(v, "-> no camera-B coverage"); continue
    Bk = info["B"]
    a = rd(os.path.join(AUD, "V_%s.16k.wav" % v)); b = rd(os.path.join(AUD, "B_%s.16k.wav" % Bk))
    dur = len(a)/16000
    hh, mm, ss = int(v[13:15]), int(v[15:17]), int(v[17:19])
    prior = (hh*3600+mm*60+ss-dur) - BSTART[Bk]
    ea, eb = env(a), env(b)
    W = min(20.0, max(6.0, dur*0.5))
    votes = []
    for frac in np.linspace(0.02, 0.9, 8):
        ta = frac*dur
        if ta+W > dur: continue
        wa = ea[int(ta*100):int((ta+W)*100)]
        if len(wa) < 200: continue
        best = None
        for cand in np.arange(prior-10, prior+10, 0.01):
            i0 = int((cand+ta)*100)
            if i0 < 0 or i0+len(wa) > len(eb): continue
            seg = eb[i0:i0+len(wa)]
            sc = float(np.dot(wa, seg)/(np.linalg.norm(wa)*np.linalg.norm(seg)+1e-9))
            if best is None or sc > best[1]: best = (float(cand), sc, float(ta))
        if best: votes.append(best)
    votes.sort(key=lambda x: -x[1])
    off, sc, ta = votes[0]
    # sample-accurate refine on that winning window
    tb = ta+off
    ref = off
    if 1 < tb < len(b)/16000-W-1 and ta+W < dur:
        wa = a[int(ta*16000):int((ta+W)*16000)]; wb = b[int((tb-1)*16000):int((tb+W+1)*16000)]
        wa = wa-wa.mean(); wb = wb-wb.mean()
        N = 1 << (len(wa)+len(wb)-1).bit_length()
        c = np.fft.irfft(np.fft.rfft(wa, N)*np.conj(np.fft.rfft(wb, N)), N)
        c = np.concatenate([c[-len(wb)+1:], c[:len(wa)]]); lags = np.arange(-len(wb)+1, len(wa))
        cand = (tb-1-lags[int(np.argmax(c))]/16000)-ta
        if abs(cand-off) < 1.0: ref = cand
    out[v] = {"B": Bk, "offset": round(float(ref), 3), "conf": round(sc, 3),
              "prior": round(prior, 2), "delta_prior": round(float(ref)-prior, 2), "dur": round(dur, 2)}
    print(v, out[v], "| top votes", [(round(o, 2), round(s, 2)) for o, s, _ in votes[:3]], flush=True)
json.dump(out, open(os.path.join(AUD, "sync_vert.json"), "w"), indent=1)
print("DONE")
