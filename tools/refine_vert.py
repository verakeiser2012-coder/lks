# -*- coding: utf-8 -*-
"""Refine the two long verticals whose free cross-correlation failed, using the metadata offset as a prior."""
import numpy as np, wave, os, json
AUD = r"C:\Users\User\Desktop\site\tools\grusha_audio"
BSTART = {"20260731_114814": 11*3600+48*60+14}

def rd(p):
    w = wave.open(p); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768
    w.close(); return x

def env(x, hop=160):
    n = len(x)//hop; e = np.sqrt((x[:n*hop].reshape(n, hop)**2).mean(1)); e = np.log1p(e*100); return e-e.mean()

res = json.load(open(os.path.join(AUD, "sync_vert.json")))
for v, Bk in (("VID_20260731_120004", "20260731_114814"), ("VID_20260731_120907", "20260731_114814")):
    a = rd(os.path.join(AUD, "V_%s.16k.wav" % v)); b = rd(os.path.join(AUD, "B_%s.16k.wav" % Bk))
    dur = len(a)/16000
    hh, mm, ss = int(v[13:15]), int(v[15:17]), int(v[17:19])
    prior = (hh*3600+mm*60+ss-dur) - BSTART[Bk]
    ea, eb = env(a), env(b)
    best = None
    for cand in np.arange(prior-6, prior+6, 0.01):        # ±6 s around the metadata prior, 10 ms grid
        i0 = int(cand*100)
        if i0 < 0 or i0+len(ea) > len(eb): continue
        seg = eb[i0:i0+len(ea)]
        sc = float(np.dot(ea, seg)/(np.linalg.norm(ea)*np.linalg.norm(seg)+1e-9))
        if best is None or sc > best[1]: best = (float(cand), sc)
    off, sc = best
    # sample-accurate refine on a 10 s window in the middle
    ta = dur*0.45; tb = ta+off
    wa = a[int(ta*16000):int((ta+10)*16000)]; wb = b[int((tb-1)*16000):int((tb+11)*16000)]
    wa = wa-wa.mean(); wb = wb-wb.mean()
    N = 1 << (len(wa)+len(wb)-1).bit_length()
    c = np.fft.irfft(np.fft.rfft(wa, N)*np.conj(np.fft.rfft(wb, N)), N)
    c = np.concatenate([c[-len(wb)+1:], c[:len(wa)]]); lags = np.arange(-len(wb)+1, len(wa))
    l2 = lags[int(np.argmax(c))]
    off2 = (tb-1-l2/16000)-ta
    print(v, "prior %.2f  grid %.3f (score %.3f)  refined %.3f  delta_prior %.2f" % (prior, off, sc, off2, off2-prior))
    res[v] = {"B": Bk, "offset": round(off2 if abs(off2-off) < 1.0 else off, 3), "conf": round(sc, 3),
              "method": "metadata-prior grid search", "dur": round(dur, 2)}
json.dump(res, open(os.path.join(AUD, "sync_vert.json"), "w"), indent=1)
print("REFINED")
