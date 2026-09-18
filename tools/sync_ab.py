import numpy as np, wave, sys, json, os
AUD=r"C:\Users\User\Desktop\site\tools\grusha_audio"
pairs=[("GX011105","20260731_110808"),("GX011106","20260731_112043"),("GX011107","20260731_112704"),
       ("GX011110","20260731_114814"),("GX011112","20260731_122810"),("GX011113","20260731_124949")]
def rd(p):
    w=wave.open(p); n=w.getnframes(); sr=w.getframerate()
    x=np.frombuffer(w.readframes(n),dtype=np.int16).astype(np.float32)/32768; w.close(); return x,sr
def env(x,sr,hop):
    n=len(x)//hop; e=np.sqrt((x[:n*hop].reshape(n,hop)**2).mean(1)); e=np.log1p(e*100); return e-e.mean()
def xcorr_offset(a,b):
    n=len(a)+len(b); N=1<<(n-1).bit_length()
    A=np.fft.rfft(a,N); B=np.fft.rfft(b,N); c=np.fft.irfft(A*np.conj(B),N)
    c=np.concatenate([c[-len(b)+1:],c[:len(a)]]); lags=np.arange(-len(b)+1,len(a))
    i=np.argmax(c); return lags[i], c[i]/ (np.linalg.norm(a)*np.linalg.norm(b)+1e-9)
res={}
for A,B in pairs:
    a,sr=rd(os.path.join(AUD,f"A_{A}.16k.wav")); b,_=rd(os.path.join(AUD,f"B_{B}.16k.wav"))
    hop=160  # 10ms
    ea,eb=env(a,sr,hop),env(b,sr,hop)
    lag,score=xcorr_offset(ea,eb)   # lag>0: A event at idx i corresponds to B idx i-lag  => B_time = A_time - lag*0.01
    off_coarse=-lag*hop/sr
    # refine at sample level in several windows, also detect drift
    refined=[]
    for frac in (0.15,0.35,0.5,0.65,0.85):
        ta=frac*len(a)/sr; tb=ta+off_coarse
        if tb<2 or tb+12>len(b)/sr or ta+12>len(a)/sr: continue
        wa=a[int(ta*sr):int((ta+10)*sr)]; wb=b[int((tb-1)*sr):int((tb+11)*sr)]
        wa=wa-wa.mean(); wb=wb-wb.mean()
        l2,s2=xcorr_offset(wa,wb)  # wa[i] ~ wb[i-l2]; wb starts at tb-1 => A ta+i/sr ~ B tb-1+(i-l2)/sr
        off=(tb-1-l2/sr)-ta
        refined.append((round(ta,1),round(off,4),round(float(s2),3)))
    print(A,B,'coarse off %.3f score %.3f'%(off_coarse,score),'refined',refined,flush=True)
    res[A]={"B":B,"offset":float(np.median([r[1] for r in refined])) if refined else off_coarse,"windows":refined}
json.dump(res,open(os.path.join(AUD,"sync_offsets.json"),"w"),indent=1)
print("SYNC_DONE")
