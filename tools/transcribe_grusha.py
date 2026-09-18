import os, json, glob, sys, time
from faster_whisper import WhisperModel

AUD = r"C:\Users\User\Desktop\site\tools\grusha_audio"
OUT = r"C:\Users\User\Desktop\site\tools\grusha_transcript"
os.makedirs(OUT, exist_ok=True)

model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=8)
files = sorted(glob.glob(os.path.join(AUD, "B_*.16k.wav")))
for f in files:
    base = os.path.basename(f).replace(".16k.wav", "")
    dst = os.path.join(OUT, base + ".json")
    if os.path.exists(dst):
        print("skip", base, flush=True); continue
    t0 = time.time()
    segs, info = model.transcribe(f, language="ru", vad_filter=True,
                                  vad_parameters=dict(min_silence_duration_ms=500),
                                  beam_size=5, condition_on_previous_text=False)
    out = []
    for s in segs:
        out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
    json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{base}: {len(out)} segs in {time.time()-t0:.0f}s", flush=True)
print("TRANSCRIBE_DONE", flush=True)
